import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ResponseEnvelope<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  nextCursor?: string | null;
  hasMore: boolean;
  total?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'meta' in value &&
    Array.isArray((value as PaginatedResult<T>).data)
  );
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ResponseEnvelope<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseEnvelope<T>> {
    return next.handle().pipe(
      map((value) => {
        if (isPaginatedResult<T>(value)) {
          return { data: value.data as unknown as T, meta: value.meta };
        }
        return { data: value };
      }),
    );
  }
}
