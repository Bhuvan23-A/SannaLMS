import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SemesterService {
  constructor(private prisma: PrismaService) {}

  async createSemester(data: Prisma.SemesterCreateInput) {
    return this.prisma.extendedClient.semester.create({ data });
  }

  async getSemesters() {
    return this.prisma.extendedClient.semester.findMany();
  }
}
