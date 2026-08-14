import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
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
  async getSemesters(@Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? undefined : (req.user?.tenantId || undefined);
    return this.semesterService.getSemesters(tenantId);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async updateSemester(@Param('id') id: string, @Body() updateDto: { name?: string; branch_id?: string; semester_number?: number }) {
    return this.semesterService.updateSemester(id, updateDto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async deleteSemester(@Param('id') id: string) {
    try {
      return await this.semesterService.deleteSemester(id);
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new BadRequestException('This semester is linked to courses or questions. Delete or reassign those first.');
      }
      throw e;
    }
  }
}
