import type { NextApiRequest, NextApiResponse } from 'next';
import { timingSafeEqual } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import { parseMaintenanceWebhook, webhookFingerprint } from '@/lib/ghlWebhookParse';
import { intakeTitle, matchTenantByContact } from '@/lib/maintenanceIntake';
import { queueMaintenance } from '@/lib/notificationQueue';
import { attemptGhlSync, enqueueGhlSync } from '@/lib/ghlSyncJobs';

// Inbound webhook for the CARIV AI Studio site's maintenance form.
//
// The site writes the tenant's answers onto their GoHighLevel contact and
// enrolls them in the "MR01 - Maintenance Request" workflow; a Webhook action
// in that workflow posts the contact here. We file a ticket in Firestore (the
// source of truth) and mirror it into the Maintenance Requests custom object,
// so the CRM keeps one record per request instead of overwriting the contact.
//
// Auth: GHL cannot sign requests, so the workflow's URL carries ?token=<secret>
// (or an X-Webhook-Secret header). Idempotent per person/issue/day.

const RAW_LIMIT = 20000;

function authorized(req: NextApiRequest): 'ok' | 'unconfigured' | 'forbidden' {
  const secret = process.env.GHL_WEBHOOK_SECRET || '';
  if (secret.length < 32) return 'unconfigured';
  const header = req.headers['x-webhook-secret'];
  const supplied = String((Array.isArray(header) ? header[0] : header) || req.query.token || '');
  return supplied.length === secret.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(secret)) ? 'ok' : 'forbidden';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const auth = authorized(req);
  if (auth === 'unconfigured') return res.status(503).json({ message: 'Webhook is not configured' });
  if (auth === 'forbidden') return res.status(403).json({ message: 'Forbidden' });

  let parsed;
  try { parsed = parseMaintenanceWebhook(req.body); }
  catch (error) { return res.status(400).json({ message: error instanceof Error ? error.message : 'Bad payload' }); }

  try {
    const now = Date.now();
    const id = `ghl-${webhookFingerprint(parsed, now)}`;
    const ref = adminDb.doc(`maintenanceRequests/${id}`);
    const match = await matchTenantByContact(adminDb, { email: parsed.email, phone: parsed.phone, ghlContactId: parsed.contactId });
    const ticket = {
      tenantId: match.tenantId,
      tenantName: parsed.name,
      tenantPhone: parsed.phone || null,
      contactEmail: parsed.email || null,
      addressText: parsed.address,
      propertyId: match.propertyId,
      title: intakeTitle(parsed.category, parsed.description),
      description: parsed.description,
      priority: parsed.priority,
      category: parsed.category,
      status: 'submitted',
      permissionToEnter: false,
      hasPets: false,
      images: [] as string[],
      attachmentUrls: parsed.attachmentUrls,
      source: parsed.source,
      ghlContactId: parsed.contactId || null,
      ghlWorkflow: parsed.workflowName || null,
      createdAt: now,
      updatedAt: now,
    };
    const created = await adminDb.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists) return false;
      await queueMaintenance(tx, adminDb, id, { ...ticket, id }, ['requestConfirmation']);
      // Keep the raw payload for a while so field naming can be pinned after the first real runs.
      tx.set(adminDb.doc(`ghlWebhookEvents/${id}`), { receivedAt: now, workflowName: parsed.workflowName || null, body: JSON.stringify(req.body).slice(0, RAW_LIMIT) });
      enqueueGhlSync(tx, adminDb, id, 'created', now);
      tx.create(ref, ticket);
      return true;
    });
    if (!created) return res.status(200).json({ success: true, duplicate: true, requestId: id });
    const ghl = await attemptGhlSync(adminDb, id);
    return res.status(200).json({ success: true, requestId: id, matched: match.tenantId !== 'public', ghl });
  } catch (error) {
    console.error('GHL maintenance webhook failed:', error);
    return res.status(500).json({ message: 'Could not file the request' });
  }
}
