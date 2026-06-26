import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyRequest, FastifyReply } from 'fastify';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { RequestContext } from '../middleware/request-context.middleware';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectPinoLogger(LoggingInterceptor.name)
    private readonly logger: PinoLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<FastifyRequest>();
    const res = ctx.getResponse<FastifyReply>();
    const requestId = RequestContext.getRequestId();
    const startTime = Date.now();

    this.logger.info(
      {
        requestId,
        method: req.method,
        path: req.url,
        userId: RequestContext.getUserId(),
        companyId: RequestContext.getCompanyId(),
      },
      'Incoming request',
    );

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info(
            {
              requestId,
              method: req.method,
              path: req.url,
              statusCode: res.statusCode,
              responseTimeMs: Date.now() - startTime,
              userId: RequestContext.getUserId(),
              companyId: RequestContext.getCompanyId(),
            },
            'Request completed',
          );
        },
        error: (error: Error) => {
          this.logger.error(
            {
              requestId,
              method: req.method,
              path: req.url,
              responseTimeMs: Date.now() - startTime,
              error: error.message,
            },
            'Request failed',
          );
        },
      }),
    );
  }
}
