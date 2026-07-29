import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CollegeService {
  constructor(private prisma: PrismaService) {}

  async createCollege(data: Prisma.CollegeCreateInput) {
    return this.prisma.extendedClient.college.create({
      data,
    });
  }

  async getColleges() {
    return this.prisma.extendedClient.college.findMany({
      include: { departments: true },
    });
  }
}
