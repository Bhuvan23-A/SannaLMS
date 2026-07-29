import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CollegeService } from './college.service';
import { Prisma } from '@prisma/client';
import { RolesGuard, Roles } from './roles.guard';

@Controller('api/v1/colleges')
@UseGuards(RolesGuard)
export class CollegeController {
  constructor(private readonly collegeService: CollegeService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  async createCollege(@Body() createCollegeDto: Prisma.CollegeCreateInput) {
    return this.collegeService.createCollege(createCollegeDto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  async getColleges() {
    return this.collegeService.getColleges();
  }
}
