import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SemesterService } from './semester.service';
import { Prisma } from '@prisma/client';
import { RolesGuard, Roles } from './roles.guard';

@Controller('api/v1/semesters')
@UseGuards(RolesGuard)
export class SemesterController {
  constructor(private readonly semesterService: SemesterService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async createSemester(@Body() createDto: Prisma.SemesterCreateInput) {
    return this.semesterService.createSemester(createDto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  async getSemesters() {
    return this.semesterService.getSemesters();
  }
}
