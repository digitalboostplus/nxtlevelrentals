import type { NextApiRequest, NextApiResponse } from 'next';
import { contractorRoute } from '@/lib/contractorRoutes';
import { getContractor, listContactLog, saveContractor } from '@/lib/contractors';
import { recordId } from '@/lib/serverRequest';

// GET returns the contractor with its latest 25 log rows; PUT updates it.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return contractorRoute(req, res, { methods: ['GET', 'PUT'] }, async ({ deps, actor }) => {
    const id = recordId(req.query.id);
    if (req.method === 'GET') {
      const [contractor, log] = await Promise.all([getContractor(deps, id), listContactLog(deps, id, 25)]);
      return { contractor, log };
    }
    return { contractor: await saveContractor(deps, { id, input: req.body, actor }) };
  });
}
