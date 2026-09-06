import { createHash } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { requestActor, recordId } from '@/lib/serverRequest';
import { attachmentRefs } from '@/lib/attachments';
import { queueMaintenance } from '@/lib/notificationQueue';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const actor = await requestActor(req, ['tenant']); const input = req.body;
    const id = recordId(input.operationId); const propertyId = recordId(input.propertyId);
    if (!input.title?.trim() || !input.description?.trim() || !['low', 'medium', 'high', 'emergency', 'urgent'].includes(input.priority)) throw new Error('Provide a title, description and valid priority');
    const ref = adminDb.doc(`maintenanceRequests/${actor.uid}-${id}`);
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const created = await adminDb.runTransaction(async tx => {
      const previous = await tx.get(ref); if (previous.exists) { if (previous.data()?.fingerprint !== fingerprint) throw new Error('Operation already used with different details'); return false; }
      const profile = (await tx.get(adminDb.doc(`users/${actor.uid}`))).data();
      const property = (await tx.get(adminDb.doc(`properties/${propertyId}`))).data();
      if (!profile?.propertyIds?.includes(propertyId) || !property || property.archived) throw new Error('Property not assigned to this tenant');
      const files = await attachmentRefs(tx, adminDb, input.fileIds || [], actor.uid, 'maintenance', propertyId, ref.path);
      await queueMaintenance(tx, adminDb, ref.id, { ...input, id: ref.id, tenantId: actor.uid }, ['requestConfirmation']);
      tx.create(ref, { tenantId: actor.uid, propertyId, title: input.title.trim().slice(0,200), description: input.description.trim().slice(0,5000),
        category: String(input.category || 'other'), priority: input.priority, status: 'submitted', permissionToEnter: input.permissionToEnter === true,
        hasPets: input.hasPets === true, preferredTime: String(input.preferredTime || '').slice(0, 300), fingerprint,
        fileIds: input.fileIds || [], createdAt: Date.now(), updatedAt: Date.now() });
      for (const file of files) tx.update(file, { boundTo: ref.path });
      return true;
    });

    return res.status(200).json({ success: true, requestId: ref.id, notificationsQueued: created });
  } catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : 'Request failed' }); }
}
