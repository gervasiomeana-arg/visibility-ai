import type { NextFunction, Request, Response } from 'express';
import { getSupabaseConfig } from './runtimeConfig';

export type AuthenticatedSupabaseUser = {
  id: string;
  email?: string;
};

export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  return header.slice(7).trim() || null;
}

export async function getSupabaseUserFromToken(
  accessToken: string
): Promise<AuthenticatedSupabaseUser | null> {
  const config = getSupabaseConfig();
  if (!config.configured) return null;

  const response = await fetch(`${config.url}/auth/v1/user`, {
    headers: {
      apikey: config.publishableKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;

  const data: any = await response.json();
  return data?.id ? { id: data.id, email: data.email } : null;
}

export async function requireSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const config = getSupabaseConfig();

  if (!config.configured) {
    next();
    return;
  }

  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const user = await getSupabaseUserFromToken(token);
    if (!user) {
      res.status(401).json({ error: 'Invalid or expired session' });
      return;
    }

    res.locals.authUser = user;
    next();
  } catch {
    res.status(401).json({ error: 'Could not validate session' });
  }
}
