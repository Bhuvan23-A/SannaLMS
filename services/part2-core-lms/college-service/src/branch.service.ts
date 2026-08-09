import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async createBranch(data: Prisma.BranchCreateInput) {
    return this.prisma.extendedClient.branch.create({ data });
  }

  async getBranches(tenantId?: string) {
    return this.prisma.extendedClient.branch.findMany({
      where: tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' ? { tenant_id: tenantId } : undefined,
      include: { semesters: true },
    });
  }
}
