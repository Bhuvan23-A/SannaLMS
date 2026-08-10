import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SemesterService {
  constructor(private prisma: PrismaService) {}

  async createSemester(data: Prisma.SemesterCreateInput) {
    return this.prisma.extendedClient.semester.create({ data });
  }

  async getSemesters(tenantId?: string) {
    return this.prisma.extendedClient.semester.findMany({
      where: tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' ? { tenant_id: tenantId } : undefined,
      include: { branch: true },
    });
  }

  async updateSemester(id: string, data: { name?: string; branch_id?: string }) {
    return this.prisma.extendedClient.semester.update({
      where: { id },
      data: {
        name: data.name,
        branch_id: data.branch_id,
      },
    });
  }

  async deleteSemester(id: string) {
    return this.prisma.extendedClient.semester.delete({ where: { id } });
  }
}
