import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { auditStorage } from './audit-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super();
  }

  // Define the extended client
  public readonly extendedClient = this.$extends({
    query: {
      $allModels: {
        async create({ args, query }) {
          const context = auditStorage.getStore();
          if (context?.userId) {
            args.data = {
              ...args.data,
              created_by: context.userId,
              updated_by: context.userId,
            };
          }
          return query(args);
        },
        async update({ args, query }) {
          const context = auditStorage.getStore();
          if (context?.userId) {
            args.data = {
              ...args.data,
              updated_by: context.userId,
            };
          }
          return query(args);
        },
      },
    },
  });

  async onModuleInit() {
    await this.$connect();
  }
}
