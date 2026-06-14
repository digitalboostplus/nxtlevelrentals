import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { importActiveTenantsFromGHL } from '@/lib/ghl-sync';
import { isGHLConfigured } from '@/lib/ghl';

// Admin endpoint to import active tenants from GoHighLevel (contacts carrying a
// tag, default "active") into the Firestore `users` collection as role tenant.
// Body: { tag?: string; dryRun?: boolean }. Records only — no auth accounts.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!isGHLConfigured()) {
    return res.status(503).json({ message: 'GoHighLevel is not configured' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Missing token' });
    }

    const decoded = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const callerRole = (await adminDb.collection('users').doc(decoded.uid).get()).data()?.role;
    if (callerRole !== 'admin' && callerRole !== 'super-admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    const { tag, dryRun } = (req.body || {}) as { tag?: string; dryRun?: boolean };

    const result = await importActiveTenantsFromGHL({ tag, dryRun: Boolean(dryRun) });

    const verb = dryRun ? 'Previewed' : 'Imported';
    return res.status(200).json({
      message:
        `${verb} ${result.total} '${tag || 'active'}' tenant(s): ` +
        `${result.created} new, ${result.updated} updated, ${result.skipped} skipped` +
        ` · ${result.matched} linked to a property, ${result.unmatched} unmatched` +
        (result.errors.length ? ` · ${result.errors.length} error(s)` : ''),
      ...result,
    });
  } catch (error: any) {
    console.error('Admin tenant import error:', error);
    return res.status(500).json({ message: error.message || 'Internal Server Error' });
  }
}
