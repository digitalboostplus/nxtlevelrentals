import type { NextApiRequest, NextApiResponse } from 'next';
import { contractorRoute } from '@/lib/contractorRoutes';
import { ticketVars } from '@/lib/contractors';

// GET ?ticketId= returns the {ticket} {property} {date} values for a
// maintenance request so a message can be prefilled.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  return contractorRoute(req, res, { methods: ['GET'] }, async ({ deps }) => ticketVars(deps, String(req.query.ticketId || '')));
}
