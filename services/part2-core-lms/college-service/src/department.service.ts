import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async createDepartment(data: Prisma.DepartmentCreateInput) {
    return this.prisma.extendedClient.department.create({ data });
  }

  async getDepartments() {
    return this.prisma.extendedClient.department.findMany({ include: { branches: true } });
  }

  async deleteDepartment(id: string) {
    return this.prisma.extendedClient.department.delete({ where: { id } });
  }
}
