import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { pullContactToFirestore } from '@/lib/ghl-sync';
import { isGHLConfigured } from '@/lib/ghl';

// Admin endpoint to pull tenant data from GoHighLevel into Firestore.
// Body: { uid } to sync one tenant, or { all: true } to sync every tenant
// that has an email. Returns a per-tenant summary.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!isGHLConfigured()) {
    return res.status(503).json({ message: 'GoHighLevel is not configured' });
  }

  try {
    // Verify caller is an admin
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const callerRole = (await adminDb.collection('users').doc(decoded.uid).get()).data()?.role;
    if (callerRole !== 'admin' && callerRole !== 'super-admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const { uid, all } = req.body as { uid?: string; all?: boolean };

    // Build the list of tenants to sync
    let targets: { uid: string; email: string }[] = [];

    if (uid) {
      const snap = await adminDb.collection('users').doc(uid).get();
      const email = snap.data()?.email;
      if (!email) return res.status(404).json({ message: 'User not found or has no email' });
      targets = [{ uid, email }];
    } else if (all) {
      const usersSnap = await adminDb.collection('users').where('role', '==', 'tenant').get();
      targets = usersSnap.docs
        .map((d) => ({ uid: d.id, email: d.data().email as string }))
        .filter((t) => Boolean(t.email));
    } else {
      return res.status(400).json({ message: 'Provide { uid } or { all: true }' });
    }

    const results: Array<{ uid: string; synced: boolean; detail?: string }> = [];

    for (const t of targets) {
      try {
        const r = await pullContactToFirestore(t);
        results.push(
          r.synced
            ? { uid: t.uid, synced: true, detail: r.ghlContactId }
            : { uid: t.uid, synced: false, detail: r.reason }
        );
      } catch (err: any) {
        results.push({ uid: t.uid, synced: false, detail: err.message });
      }
    }

    const syncedCount = results.filter((r) => r.synced).length;
    return res.status(200).json({
      message: `Synced ${syncedCount} of ${targets.length} tenant(s)`,
      results,
    });
  } catch (error: any) {
    console.error('Admin GHL sync error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
