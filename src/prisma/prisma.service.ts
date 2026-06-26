import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extends the client with soft-delete filtering.
   * Returns a new client instance where findMany/findFirst
   * automatically exclude records where deletedAt is not null.
   */
  withSoftDelete() {
    return this.$extends({
      query: {
        user: {
          async findMany({ args, query }) {
            args.where = { ...args.where, deletedAt: null };
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = { ...args.where, deletedAt: null };
            return query(args);
          },
        },
        item: {
          async findMany({ args, query }) {
            args.where = { ...args.where, deletedAt: null };
            return query(args);
          },
          async findFirst({ args, query }) {
            args.where = { ...args.where, deletedAt: null };
            return query(args);
          },
        },
      },
    });
  }
}
