import type { NextApiRequest, NextApiResponse } from 'next';
import { contractorRoute } from '@/lib/contractorRoutes';
import { listContractors, saveContractor } from '@/lib/contractors';

// GET ?status=approved|inactive|all lists the roster; POST creates a contractor
// and mirrors it to GoHighLevel.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return contractorRoute(req, res, { methods: ['GET', 'POST'] }, async ({ deps, actor }) => {
    if (req.method === 'GET') {
      const raw = String(req.query.status || 'all');
      const status = raw === 'approved' || raw === 'inactive' ? raw : 'all';
      return { contractors: await listContractors(deps, { status }) };
    }
    return { contractor: await saveContractor(deps, { input: req.body, actor }) };
  });
}
