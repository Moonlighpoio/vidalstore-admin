import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

export interface TokenPayload extends JWTPayload {
  sub: string;
  token_use?: string;
  client_id?: string;
  'cognito:groups'?: string[];
}

export class TokenValidator {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(
    private readonly issuer: string,
    private readonly appClientId: string,
    jwksUri: string,
  ) {
    this.jwks = createRemoteJWKSet(new URL(jwksUri));
  }

  async validate(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: this.issuer,
    });

    const tokenPayload = payload as TokenPayload;

    if (tokenPayload.token_use !== 'access') {
      throw new Error('Access token required');
    }

    if (tokenPayload.client_id !== this.appClientId) {
      throw new Error('Token issued for another App Client');
    }

    return tokenPayload;
  }
}
