import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { pullContactToFirestore } from '@/lib/ghl-sync';

// Inbound webhook for GoHighLevel contact create/update events.
//
// Configure a GHL workflow (trigger: Contact Created / Contact Changed) with a
// Webhook action pointing at this URL, and include the shared secret either as
// a `?secret=` query param or an `x-webhook-secret` header. When an event
// arrives we locate the matching tenant and pull their latest data into
// Firestore — giving real-time GHL -> app sync.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Verify the shared secret. Required so the endpoint can't be called by anyone.
  const expected = process.env.GHL_WEBHOOK_SECRET;
  if (!expected) {
    console.error('GHL_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ message: 'Webhook secret not configured' });
  }
  const provided = (req.headers['x-webhook-secret'] as string) || (req.query.secret as string);
  if (provided !== expected) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const body = (req.body || {}) as Record<string, any>;

    // GHL payloads vary by workflow config; accept the common shapes.
    const contact = body.contact || body;
    const email: string | undefined = contact.email || body.email;
    const ghlContactId: string | undefined =
      contact.id || body.contact_id || body.contactId || body.id;

    if (!email && !ghlContactId) {
      return res.status(400).json({ message: 'Payload missing contact email/id' });
    }

    // Find the matching tenant: prefer the linked GHL contact id, fall back to email.
    let userDoc;
    if (ghlContactId) {
      const byId = await adminDb
        .collection('users')
        .where('ghlContactId', '==', ghlContactId)
        .limit(1)
        .get();
      if (!byId.empty) userDoc = byId.docs[0];
    }
    if (!userDoc && email) {
      const byEmail = await adminDb
        .collection('users')
        .where('email', '==', email)
        .limit(1)
        .get();
      if (!byEmail.empty) userDoc = byEmail.docs[0];
    }

    if (!userDoc) {
      // Not an error — the contact may not have an app account yet.
      return res.status(200).json({ received: true, matched: false });
    }

    const result = await pullContactToFirestore({
      uid: userDoc.id,
      email: email || (userDoc.data().email as string),
    });

    return res.status(200).json({ received: true, matched: true, result });
  } catch (error: any) {
    console.error('GHL inbound webhook error:', error);
    // Return 200 so GHL doesn't retry indefinitely on our internal errors.
    return res.status(200).json({ received: true, error: error.message });
  }
}
