import type { NextApiRequest, NextApiResponse } from 'next';
import { createHash } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { requestActor, recordId } from '@/lib/serverRequest';
import { attachmentRefs } from '@/lib/attachments';
import { moneyToCents } from '@/lib/ledger';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const actor = await requestActor(req, ['landlord']); const data = req.body;
    const propertyId = recordId(data.propertyId); const id = recordId(data.operationId);
    if (typeof data.amount !== 'number' || moneyToCents(data.amount) <= 0 || data.amount > 1000000) throw new Error('Invalid expense amount');
    const fingerprint = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || new Date(`${data.date}T00:00:00Z`).toISOString().slice(0,10) !== data.date) throw new Error('Invalid expense date');
    await adminDb.runTransaction(async tx => {
      const property = (await tx.get(adminDb.doc(`properties/${propertyId}`))).data();
      if (!property || property.landlordId !== actor.uid || property.archived) throw new Error('Property unavailable');
      const ref = adminDb.doc(`landlordExpenses/${actor.uid}-${id}`); const existing = await tx.get(ref);
      if (existing.exists) { if (existing.data()?.fingerprint !== fingerprint) throw new Error('Operation already used with different details'); return; }
      const files = await attachmentRefs(tx, adminDb, data.fileIds || [], actor.uid, 'expense', propertyId, ref.path);
      tx.create(ref, { landlordId: actor.uid, propertyId, amount: data.amount, category: String(data.category || 'other'),
        expenseType: String(data.expenseType || 'other'), description: String(data.description || ''), vendor: String(data.vendor || ''),
        date: String(data.date || new Date().toISOString()), status: 'pending', fingerprint, invoiceNumber: String(data.invoiceNumber || '').slice(0,100), taxDeductible: data.taxDeductible === true, fileIds: data.fileIds || [], createdBy: actor.uid,
        createdAt: new Date(), updatedAt: new Date() });
      for (const file of files) tx.update(file, { boundTo: ref.path });
    });
    return res.status(200).json({ success: true });
  } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : 'Expense could not be saved' }); }
}
