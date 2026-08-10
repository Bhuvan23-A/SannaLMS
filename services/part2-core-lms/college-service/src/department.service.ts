import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async createDepartment(data: Prisma.DepartmentCreateInput) {
    return this.prisma.extendedClient.department.create({ data });
  }

  async getDepartments(tenantId?: string) {
    return this.prisma.extendedClient.department.findMany({
      where: tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' ? { tenant_id: tenantId } : undefined,
      include: { branches: true },
    });
  }

  async updateDepartment(id: string, data: { name?: string; college_id?: string }) {
    return this.prisma.extendedClient.department.update({
      where: { id },
      data: {
        name: data.name,
        college_id: data.college_id,
      },
    });
  }

  async deleteDepartment(id: string) {
    return this.prisma.extendedClient.department.delete({ where: { id } });
  }
}
