import type { NextApiRequest, NextApiResponse } from 'next';
import { getPublicProperties } from '@/lib/properties-public';

// Public, unauthenticated listing of available properties for the landing page.
// Backed by the Admin SDK (server-side), returning only public-safe fields.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const properties = await getPublicProperties();
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ properties });
  } catch (error: any) {
    console.error('Public properties error:', error);
    return res.status(500).json({ properties: [], message: 'Failed to load properties' });
  }
}
