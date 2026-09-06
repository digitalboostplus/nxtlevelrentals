import { createHash, randomBytes } from 'crypto';
import type { Auth } from 'firebase-admin/auth';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { moneyToCents } from './ledger';
import { attachmentRefs } from './attachments';

export interface LeaseActivationInput {
  operationId: string;
  propertyId: string;
  unitId?: string;
  tenantId?: string;
  newTenant?: { email: string; displayName: string; phoneNumber?: string };
  startDate: string;
  endDate: string;
  monthlyRent: number;
  securityDeposit: number;
  paymentDueDay: number;
  lateFeeGraceDays: number;
  lateFeeAmount: number;
  documentUrl?: string;
  fileIds?: string[];
}

function calendarDate(value: string): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Use YYYY-MM-DD lease dates');
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Invalid lease date');
  return date;
}

export function validateLeaseInput(input: LeaseActivationInput) {
  if (!input || !/^[a-zA-Z0-9-]{16,100}$/.test(input.operationId)) throw new Error('Invalid operation ID');
  for (const id of [input.propertyId, input.tenantId, input.unitId]) {
    if (id !== undefined && (typeof id !== 'string' || !id || id.includes('/') || id.length > 128)) throw new Error('Invalid record ID');
  }
  if (!input.propertyId || Boolean(input.tenantId) === Boolean(input.newTenant)) throw new Error('Select an existing resident or supply a new resident');
  const start = calendarDate(input.startDate);
  const end = calendarDate(input.endDate);
  if (end <= start) throw new Error('Lease end must follow start');
  for (const amount of [input.monthlyRent, input.securityDeposit, input.lateFeeAmount]) {
    if (typeof amount !== 'number' || moneyToCents(amount) < 0 || amount > 1000000) throw new Error('Invalid lease amount');
  }
  if (input.monthlyRent <= 0) throw new Error('Rent must be positive');
  for (const [value, min, max] of [[input.paymentDueDay, 1, 31], [input.lateFeeGraceDays, 0, 31]]) {
    if (!Number.isInteger(value) || value < min || value > max) throw new Error('Invalid billing day');
  }
  if (input.newTenant && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.newTenant.email) || !input.newTenant.displayName?.trim())) throw new Error('New resident name and valid email are required');
  if (input.documentUrl && !input.documentUrl.startsWith('https://')) throw new Error('Document URL must use HTTPS');
  return start;
}

/** Auth creation is a staged prerequisite; all operational records commit together. */
export async function activateLease(db: Firestore, auth: Auth, actorId: string, input: LeaseActivationInput) {
  const start = validateLeaseInput(input);
  const leaseId = createHash('sha256').update(`${actorId}:${input.operationId}`).digest('hex');
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const tenantId = input.tenantId || `resident-${leaseId}`;
  if (input.newTenant) {
    const email = input.newTenant.email.trim().toLowerCase();
    try {
      await auth.createUser({ uid: tenantId, email, displayName: input.newTenant.displayName.trim(), password: randomBytes(32).toString('base64url') });
    } catch (error) {
      if ((error as { code?: string }).code !== 'auth/uid-already-exists') throw error;
      const existing = await auth.getUser(tenantId);
      if (existing.email?.toLowerCase() !== email) throw new Error('Operation already belongs to a different resident');
    }
  }
  const authUser = await auth.getUser(tenantId);
  if (authUser.disabled) throw new Error('Resident account is disabled');
  const leaseRef = db.collection('leases').doc(leaseId);
  const propertyRef = db.collection('properties').doc(input.propertyId);
  const userRef = db.collection('users').doc(tenantId);
  await db.runTransaction(async tx => {
    const previous = await tx.get(leaseRef);
    if (previous.exists) {
      if (previous.data()?.activationFingerprint !== fingerprint) throw new Error('Operation already used with different terms');
      return;
    }
    const property = await tx.get(propertyRef);
    const user = await tx.get(userRef);
    if (!property.exists) throw new Error('Property does not exist');
    if (!input.newTenant && (!user.exists || user.data()?.role !== 'tenant')) throw new Error('Select a registered tenant');
    if (user.exists && user.data()?.role !== 'tenant') throw new Error('Account is not a tenant');
    const prop = property.data()!;
    const units: Array<Record<string, any>> = prop.units || [];
    const unit = units.find(u => u.id === input.unitId);
    if (prop.archived || unit?.archived) throw new Error('Archived inventory cannot be leased');
    if (units.length && !unit) throw new Error('Select a valid property unit');
    if (!units.length && input.unitId) throw new Error('Property has no unit inventory');
    // A query plus the property write serializes concurrent activation of its units.
    const active = await tx.get(db.collection('leases').where('propertyId', '==', input.propertyId));
    if (active.docs.some(d => {
      const lease = d.data();
      return lease.isActive && (!units.length || !lease.unitId || lease.unitId === input.unitId);
    })) throw new Error('Property or unit already has an active lease');
    if ((unit?.status || prop.status) === 'maintenance') throw new Error('Unit is unavailable for leasing');
    if (unit?.currentLeaseId || (!units.length && prop.status === 'occupied')) throw new Error('Unit is already occupied; reconcile its existing assignment first');
    const landlordId = prop.landlordId || 'direct-management';
    const now = FieldValue.serverTimestamp();
    const unitName = unit?.unitNumber || 'Main';
    const files = await attachmentRefs(tx, db, input.fileIds || [], actorId, 'lease', input.propertyId, leaseRef.path);
    tx.create(leaseRef, {
      propertyId: input.propertyId, propertyName: prop.name || '', unitId: input.unitId || null,
      unit: unitName, tenantId, tenantName: authUser.displayName || authUser.email || '', landlordId,
      startDate: input.startDate, endDate: input.endDate, monthlyRent: input.monthlyRent,
      securityDeposit: input.securityDeposit, paymentDueDay: input.paymentDueDay,
      lateFeeGraceDays: input.lateFeeGraceDays, lateFeeAmount: input.lateFeeAmount,
      documents: input.documentUrl ? [input.documentUrl] : [], isActive: true, status: 'active',
      fileIds: input.fileIds || [],
      activationFingerprint: fingerprint, createdBy: actorId, createdAt: now, updatedAt: now
    });
    for (const file of files) tx.update(file, { boundTo: leaseRef.path });
    const daysInMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    const end = calendarDate(input.endDate);
    const finalDay = end.getUTCFullYear() === start.getUTCFullYear() && end.getUTCMonth() === start.getUTCMonth()
      ? end.getUTCDate() : daysInMonth;
    const rentCents = Math.round(moneyToCents(input.monthlyRent) * (finalDay - start.getUTCDate() + 1) / daysInMonth);
    // Ledger dates are stored as timestamps (noon UTC on the calendar day) so
    // range queries such as admin rent tracking match them. billingPeriod keeps
    // the calendar month as a string.
    const chargeDate = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), 12));
    for (const [category, amount] of [['deposit', input.securityDeposit], ['rent', rentCents / 100]] as const) {
      if (!amount) continue;
      tx.create(db.collection('ledger').doc(`${leaseId}-${category}`), {
        leaseId, tenantId, propertyId: input.propertyId, landlordId, unitId: input.unitId || null,
        type: 'charge', category, amount, status: 'pending', date: chargeDate,
        dueDate: chargeDate, billingPeriod: input.startDate.slice(0, 7),
        description: category === 'rent' ? 'Initial rent (prorated through month end)' : 'Security deposit',
        createdAt: now, recordedBy: actorId
      });
    }
    tx.set(userRef, {
      role: 'tenant', email: authUser.email || '', displayName: authUser.displayName || '',
      ...(input.newTenant ? { phoneNumber: input.newTenant.phoneNumber || '', createdAt: now } : {}),
      propertyIds: FieldValue.arrayUnion(input.propertyId), unit: unitName, landlordId, updatedAt: now
    }, { merge: true });
    if (unit) {
      const nextUnits = units.map(u => u.id === unit.id ? { ...u, status: 'occupied', currentTenantId: tenantId, currentLeaseId: leaseId } : u);
      tx.update(propertyRef, { units: nextUnits, status: nextUnits.filter(u => !u.archived).every(u => u.status === 'occupied') ? 'occupied' : nextUnits.some(u => !u.archived && u.status === 'vacant') ? 'vacant' : 'maintenance', available: nextUnits.some(u => !u.archived && u.status === 'vacant'), updatedAt: now });
    } else {
      tx.update(propertyRef, { status: 'occupied', available: false, updatedAt: now });
    }
  });
  return { leaseId, tenantId };
}
