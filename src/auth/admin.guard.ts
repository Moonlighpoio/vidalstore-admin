import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { TokenValidator, TokenPayload } from './token.validator';

interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly validator: TokenValidator;

  constructor(configService: ConfigService) {
    const issuer = configService.get<string>('COGNITO_ISSUER');
    const appClientId = configService.get<string>('COGNITO_APP_CLIENT_ID');
    const jwksUri = configService.get<string>('COGNITO_JWKS_URI');

    if (!issuer || !appClientId || !jwksUri) {
      throw new Error('Missing Cognito configuration');
    }

    this.validator = new TokenValidator(issuer, appClientId, jwksUri);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;

    const token = this.extractBearer(authorization);

    if (!token) {
      throw new UnauthorizedException('Bearer token is required');
    }

    let payload: TokenPayload;

    try {
      payload = await this.validator.validate(token);
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Invalid token',
      );
    }

    const groups = payload['cognito:groups'] ?? [];

    if (!groups.includes('administradores')) {
      throw new ForbiddenException('Administrator role required');
    }

    request.user = payload;
    return true;
  }

  private extractBearer(authorization?: string): string | undefined {
    if (!authorization) {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');

    return scheme === 'Bearer' && token ? token : undefined;
  }
}
