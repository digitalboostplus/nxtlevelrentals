// Shared plumbing for the /api/admin/contractors/* routes: auth, method
// checks and the error-to-status mapping used across the admin API.
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminDb } from './firebase-admin';
import { requestActor } from './serverRequest';
import { ContractorError, type Actor, type Dependencies } from './contractors';

export const ADMIN_ROLES = ['admin', 'super-admin'];

export type RouteContext = { deps: Dependencies; actor: Actor; role: string };

export async function contractorRoute(
  req: NextApiRequest,
  res: NextApiResponse,
  opts: { methods: string[]; roles?: string[] },
  run: (ctx: RouteContext) => Promise<unknown>
) {
  if (!opts.methods.includes(req.method || '')) {
    res.setHeader('Allow', opts.methods.join(', '));
    return res.status(405).json({ message: 'Method not allowed' });
  }
  try {
    const { uid, role, profile } = await requestActor(req, opts.roles ?? ADMIN_ROLES);
    const actor: Actor = {
      uid,
      name: typeof profile.displayName === 'string' ? profile.displayName : null,
      ghlUserId: typeof profile.ghlUserId === 'string' ? profile.ghlUserId : null,
    };
    const body = await run({ deps: { db: adminDb }, actor, role });
    return res.status(200).json(body);
  } catch (error) {
    if (error instanceof ContractorError) return res.status(error.status).json({ message: error.message });
    const message = error instanceof Error ? error.message : 'Request failed';
    const status = message === 'Access denied' ? 403 : message === 'Authentication required' ? 401 : message === 'Invalid record ID' ? 400 : 500;
    if (status === 500) console.error('Contractor route failed', error);
    return res.status(status).json({ message });
  }
}
