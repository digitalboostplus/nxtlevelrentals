import type { NextApiRequest, NextApiResponse } from 'next';
import { contractorRoute } from '@/lib/contractorRoutes';
import { getContractorComms } from '@/lib/contractors';

// GET returns the comms settings (templates, workflow ids) and which actions
// are configured. Editing arrives with the setup card in a later change.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return contractorRoute(req, res, { methods: ['GET'] }, async ({ deps }) => getContractorComms(deps));
}
