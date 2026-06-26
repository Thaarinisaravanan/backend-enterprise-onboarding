import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AppException } from '../exceptions/app.exception';
import { RequestContext } from '../middleware/request-context.middleware';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(GlobalExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = RequestContext.getRequestId() ?? (request.headers['x-request-id'] as string);
    const timestamp = new Date().toISOString();
    const path = request.url;

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown;

    if (exception instanceof AppException) {
      statusCode = exception.statusCode;
      errorCode = exception.errorCode;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r['message'] as string) ?? exception.message;
        errorCode = (r['error'] as string) ?? 'HTTP_EXCEPTION';
        details = Array.isArray(r['message']) ? r['message'] : undefined;
      } else {
        message = String(res);
        errorCode = 'HTTP_EXCEPTION';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (statusCode >= 500) {
      this.logger.error({ err: exception, requestId, path }, 'Unhandled exception');
    } else {
      this.logger.warn({ requestId, path, statusCode, errorCode }, message);
    }

    const body: Record<string, unknown> = {
      statusCode,
      errorCode,
      message,
      requestId,
      timestamp,
      path,
    };

    if (details !== undefined) {
      body['details'] = details;
    }

    reply.status(statusCode).send(body);
  }
}
