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
    });
  }
}
