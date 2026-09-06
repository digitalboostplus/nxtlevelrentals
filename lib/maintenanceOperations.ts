import { queueMaintenance } from './notificationQueue';
import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { attachmentRefs } from './attachments';
import { moneyToCents } from './ledger';
export async function updateWorkOrder(db: Firestore, uid: string, input: any) {
  if (!/^[\w-]{1,128}$/.test(input.requestId) || !/^[\w-]{16,128}$/.test(input.operationId)) throw new Error('Request and operation IDs required');
  if (!['submitted', 'in_progress', 'completed', 'cancelled'].includes(input.status)) throw new Error('Invalid status');
  if (input.actualCost !== undefined && (typeof input.actualCost !== 'number' || moneyToCents(input.actualCost) < 0)) throw new Error('Cost must be a nonnegative amount');
  if (input.scheduledDate && (!/^\d{4}-\d{2}-\d{2}$/.test(input.scheduledDate) || new Date(`${input.scheduledDate}T00:00:00Z`).toISOString().slice(0,10) !== input.scheduledDate)) throw new Error('Invalid appointment date');
  if (input.scheduledTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.scheduledTime)) throw new Error('Invalid appointment time');
  if (input.scheduledDate && (!input.technicianName?.trim() || !input.scheduledTime || !input.timeZone?.trim())) throw new Error('A visit needs date, time, time zone and vendor');
  if (input.timeZone) new Intl.DateTimeFormat('en-US', { timeZone: input.timeZone });
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return db.runTransaction(async tx => {
    const actor = (await tx.get(db.doc(`users/${uid}`))).data();
    if (!['admin', 'super-admin'].includes(actor?.role)) throw new Error('Admin access required');
    const ref = db.doc(`maintenanceRequests/${input.requestId}`); const previous = (await tx.get(ref)).data();
    if (!previous) throw new Error('Ticket not found');
    const operation = ref.collection('operations').doc(input.operationId); const completed = (await tx.get(operation)).data();
    if (completed) { if (completed.fingerprint !== fingerprint) throw new Error('Operation already used'); return { changed: false, request: previous }; }
    const property = (await tx.get(db.doc(`properties/${previous.propertyId}`))).data();
    if (!property || property.archived) throw new Error('Property not found');
    const expenseRef = db.doc(`landlordExpenses/maintenance-${input.requestId}`);
    const expense = (await tx.get(expenseRef)).data();
    const files = await attachmentRefs(tx, db, input.fileIds || [], uid, 'expense', previous.propertyId, expenseRef.path);
    const cost = input.actualCost ?? previous.actualCost;
    if (expense && (input.status !== 'completed' || cost !== expense.amount)) throw new Error('Reconcile the existing expense before reopening or changing its cost');
    const updated = { ...previous, status: input.status, updatedAt: Date.now(),
      ...(input.adminNotes?.trim() ? { adminNotes: `${previous.adminNotes || ''}\n${input.adminNotes.trim()}`.trim() } : {}),
      ...(input.technicianName !== undefined ? { assignedVendorName: String(input.technicianName).slice(0, 200) } : {}),
      ...(input.vendorPhone !== undefined ? { assignedVendorPhone: String(input.vendorPhone).slice(0, 50) } : {}),
      ...(input.scheduledDate ? { scheduledDate: input.scheduledDate, scheduledTime: input.scheduledTime, timeZone: input.timeZone } : {}),
      ...(cost !== undefined ? { actualCost: cost } : {}) };
    const events: Array<'statusChanges' | 'notesAdded' | 'technicianScheduled'> = [];
    if (previous.status !== input.status) events.push('statusChanges');
    if (input.adminNotes?.trim()) events.push('notesAdded');
    if (input.scheduledDate && ['scheduledDate', 'scheduledTime', 'timeZone'].some(key => input[key] !== previous[key]) || input.scheduledDate && input.technicianName !== previous.assignedVendorName) events.push('technicianScheduled');
    await queueMaintenance(tx, db, `${input.requestId}:${input.operationId}`, { ...updated, id: input.requestId, newNotes: input.adminNotes }, events);
    tx.set(ref, updated);
    if (expense && input.fileIds?.length) throw new Error('Invoice already recorded; reconcile attachments with accounting');
    if (!expense && input.status === 'completed' && cost > 0) {
      tx.set(expenseRef, { ...(expense || {}), landlordId: property.landlordId || 'direct-management', propertyId: previous.propertyId,
        maintenanceRequestId: input.requestId, amount: cost, expenseType: 'maintenance', category: previous.category || 'repair',
        vendor: updated.assignedVendorName || '', description: previous.title, date: new Date().toISOString(),
        status: 'approved', fileIds: input.fileIds || [], createdBy: uid,
        createdAt: Date.now(), updatedAt: Date.now() });
      for (const file of files) tx.update(file, { boundTo: expenseRef.path });
    } else if (files.length) throw new Error('Attach an invoice when completing a ticket with a cost');
    tx.create(operation, { fingerprint, createdAt: Date.now() });
    return { changed: true, request: updated, previous };
  });
}
