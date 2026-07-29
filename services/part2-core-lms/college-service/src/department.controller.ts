import { Controller, Get, Post, Body, UseGuards, Delete, Param, BadRequestException } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { Prisma } from '@prisma/client';
import { RolesGuard, Roles } from './roles.guard';

@Controller('api/v1/departments')
@UseGuards(RolesGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async createDepartment(@Body() createDto: Prisma.DepartmentCreateInput) {
    try {
      return await this.departmentService.createDepartment(createDto);
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new BadRequestException('Invalid College ID. The college does not exist.');
      }
      throw e;
    }
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  async getDepartments() {
    return this.departmentService.getDepartments();
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async deleteDepartment(@Param('id') id: string) {
    return this.departmentService.deleteDepartment(id);
  }
}
