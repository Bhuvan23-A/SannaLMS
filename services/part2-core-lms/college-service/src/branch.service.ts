import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BranchService {
  constructor(private prisma: PrismaService) {}

  async createBranch(data: Prisma.BranchCreateInput) {
    return this.prisma.extendedClient.branch.create({ data });
  }

  async getBranches() {
    return this.prisma.extendedClient.branch.findMany({ include: { semesters: true } });
  }
}
