import type { NextApiRequest, NextApiResponse } from 'next';

// No ledger writes until a provider integration verifies settlement.
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  return res.status(503).json({ message: 'Online payments are unavailable. Contact management for payment instructions.' });
}
