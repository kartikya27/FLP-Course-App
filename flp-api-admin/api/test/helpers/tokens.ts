import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from 'jose';

export const TEST_ISSUER = 'https://test-project.supabase.co/auth/v1';

export interface SignTokenOptions {
  sub: string;
  phone?: string;
  email?: string;
  iss?: string;
  aud?: string;
  // A duration like '1h', or an absolute expiry in epoch seconds.
  expiresIn?: string | number;
}

export interface TestKeys {
  jwks: JWTVerifyGetKey;
  signToken(opts: SignTokenOptions): Promise<string>;
}

// Mimics Supabase's asymmetric JWT signing keys (ES256) with a local JWKS.
export async function createTestKeys(): Promise<TestKeys> {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'ES256', use: 'sig' };

  return {
    jwks: createLocalJWKSet({ keys: [jwk] }),
    signToken: (opts) =>
      new SignJWT({ phone: opts.phone ?? '', email: opts.email ?? '', role: 'authenticated' })
        .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
        .setSubject(opts.sub)
        .setIssuer(opts.iss ?? TEST_ISSUER)
        .setAudience(opts.aud ?? 'authenticated')
        .setIssuedAt()
        .setExpirationTime(opts.expiresIn ?? '1h')
        .sign(privateKey),
  };
}
