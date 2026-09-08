import type { NextApiRequest, NextApiResponse } from 'next';
import importTenants from './import-tenants';

// Compatibility: old one-click sync requests now produce a reviewable preview.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') req.body = { action: 'preview' };
  return importTenants(req, res);
}
