import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';

interface RequestStore {
  requestId: string;
  userId?: string;
  companyId?: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

export class RequestContext {
  static getStore(): RequestStore | undefined {
    return storage.getStore();
  }

  static getRequestId(): string | undefined {
    return storage.getStore()?.requestId;
  }

  static getUserId(): string | undefined {
    return storage.getStore()?.userId;
  }

  static getCompanyId(): string | undefined {
    return storage.getStore()?.companyId;
  }

  static setUser(userId: string, companyId: string): void {
    const store = storage.getStore();
    if (store) {
      store.userId = userId;
      store.companyId = companyId;
    }
  }

  static run<T>(store: RequestStore, fn: () => T): T {
    return storage.run(store, fn) as T;
  }
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: FastifyRequest['raw'], _res: FastifyReply['raw'], next: () => void) {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? uuidv4();

    // Attach to raw request for downstream access
    (req as unknown as Record<string, unknown>)['requestId'] = requestId;

    RequestContext.run({ requestId }, () => {
      next();
    });
  }
}
