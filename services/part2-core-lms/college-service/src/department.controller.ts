import { Controller, Get, Post, Patch, Body, UseGuards, Delete, Param, Req, BadRequestException } from '@nestjs/common';
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
  async getDepartments(@Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? undefined : (req.user?.tenantId || undefined);
    return this.departmentService.getDepartments(tenantId);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async updateDepartment(@Param('id') id: string, @Body() updateDto: { name?: string; college_id?: string }) {
    return this.departmentService.updateDepartment(id, updateDto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async deleteDepartment(@Param('id') id: string) {
    try {
      return await this.departmentService.deleteDepartment(id);
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new BadRequestException('This department has branches linked to it. Delete or reassign those branches first.');
      }
      throw e;
    }
  }
}
