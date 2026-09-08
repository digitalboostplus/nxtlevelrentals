import type { NextApiRequest, NextApiResponse } from 'next';
import { contractorRoute } from '@/lib/contractorRoutes';
import { getContractor, resyncContractor } from '@/lib/contractors';
import { recordId } from '@/lib/serverRequest';

// POST re-runs the GoHighLevel mirror for one contractor.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return contractorRoute(req, res, { methods: ['POST'] }, async ({ deps }) => {
    const contractor = await getContractor(deps, recordId(req.query.id));
    return { contractor: await resyncContractor(deps, contractor) };
  });
}
