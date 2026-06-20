import type { NextApiRequest } from 'next';
import { supabaseAdmin } from './supabase';

export async function getUserFromRequest(req: NextApiRequest) {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies['sb-access-token'] || req.cookies['sb-access-token'];

  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabaseAdmin().auth.getUser(accessToken);
  if (error || !data?.user) {
    console.error('Auth helper error:', error);
    return null;
  }

  return data.user;
}
