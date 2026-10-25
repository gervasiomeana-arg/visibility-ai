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
    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error('Session validation service unavailable');

  const data: any = await response.json();
  if(data?.is_anonymous===true)return null;
  if (typeof data?.id !== 'string' || !data.id.trim()) throw new Error('Invalid session validation response');
  return { id:data.id,email:typeof data.email === 'string'?data.email:undefined };
}

export async function requireSupabaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if(res.locals.supabaseIdentityVerified===true&&res.locals.authUser){next();return;}
  const config = getSupabaseConfig();

  if (!config.configured) {
    res.status(503).json({ error: 'La autenticación no está configurada. Revisá Supabase antes de usar esta función.' });
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
    res.locals.supabaseIdentityVerified = true;
    next();
  } catch {
    res.status(503).json({ error: 'No se pudo comprobar la sesión en este momento. Volvé a intentar; este error no confirma que tu sesión haya vencido.' });
  }
}
