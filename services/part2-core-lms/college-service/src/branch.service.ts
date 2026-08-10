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
      include: { semesters: true, department: true },
    });
  }

  async updateBranch(id: string, data: { name?: string; department_id?: string }) {
    return this.prisma.extendedClient.branch.update({
      where: { id },
      data: {
        name: data.name,
        department_id: data.department_id,
      },
    });
  }

  async deleteBranch(id: string) {
    return this.prisma.extendedClient.branch.delete({ where: { id } });
  }
}
