import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UnauthorizedException } from '../exceptions/app.exception';
import { RequestContext } from '../middleware/request-context.middleware';
import { CompanyContextService } from './company-context.service';

interface JwtPayload {
  sub: string;
  companyId: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest<T>(err: Error | null, user: T, _info: unknown, context: ExecutionContext): T {
    if (err || !user) {
      throw new UnauthorizedException('Invalid or missing authentication token');
    }

    // Propagate user context into AsyncLocalStorage
    const payload = user as unknown as JwtPayload;
    RequestContext.setUser(payload.sub, payload.companyId);

    // Populate request-scoped CompanyContextService
    const req = context.switchToHttp().getRequest();
    const ctx: CompanyContextService | undefined = req.companyContext;
    if (ctx) {
      ctx.setContext(payload.sub, payload.companyId, payload.role);
    }

    return user;
  }
}
