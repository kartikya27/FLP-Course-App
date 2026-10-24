import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import { AppError } from './errors.js';

export type TokenClaims = { sub: string; phone: string | null; email: string | null };
export type TokenVerifier = (token: string) => Promise<TokenClaims>;

// Supabase puts the phone in the token without the leading "+", and "" when there is none.
function phoneClaim(value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null;
  return value.startsWith('+') ? value : `+${value}`;
}

function emailClaim(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

export function createTokenVerifier(opts: { issuer: string; jwks: JWTVerifyGetKey }): TokenVerifier {
  return async (token) => {
    try {
      const { payload } = await jwtVerify(token, opts.jwks, {
        issuer: opts.issuer,
        audience: 'authenticated',
      });
      if (!payload.sub) throw new Error('Token has no subject');
      return { sub: payload.sub, phone: phoneClaim(payload.phone), email: emailClaim(payload.email) };
    } catch {
      throw new AppError(401, 'UNAUTHENTICATED', 'Please log in again');
    }
  };
}
