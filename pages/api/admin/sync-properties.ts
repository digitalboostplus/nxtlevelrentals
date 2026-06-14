import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { syncGHLPropertiesToFirestore } from '@/lib/ghl-sync';
import { isGHLConfigured } from '@/lib/ghl';

// Admin endpoint to pull "Properties" custom-object records from GoHighLevel
// into the Firestore `properties` collection. Body: { dryRun?: boolean } to
// preview counts without writing. Returns a created/updated/skipped summary.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!isGHLConfigured()) {
    return res.status(503).json({ message: 'GoHighLevel is not configured' });
  }

  try {
    // Verify caller is an admin.
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const callerRole = (await adminDb.collection('users').doc(decoded.uid).get()).data()?.role;
    if (callerRole !== 'admin' && callerRole !== 'super-admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const { dryRun } = (req.body || {}) as { dryRun?: boolean };

    const result = await syncGHLPropertiesToFirestore({ dryRun: Boolean(dryRun) });

    const verb = dryRun ? 'Previewed' : 'Synced';
    return res.status(200).json({
      message: `${verb} ${result.total} GHL propert${result.total === 1 ? 'y' : 'ies'}: ` +
        `${result.created} new, ${result.updated} updated, ${result.skipped} skipped` +
        (result.errors.length ? `, ${result.errors.length} error(s)` : ''),
      ...result,
    });
  } catch (error: any) {
    console.error('Admin GHL property sync error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
