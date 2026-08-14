import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { BranchService } from './branch.service';
import { Prisma } from '@prisma/client';
import { RolesGuard, Roles } from './roles.guard';

@Controller('api/v1/branches')
@UseGuards(RolesGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async createBranch(@Body() createDto: Prisma.BranchCreateInput) {
    return this.branchService.createBranch(createDto);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  async getBranches(@Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? undefined : (req.user?.tenantId || undefined);
    return this.branchService.getBranches(tenantId);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async updateBranch(@Param('id') id: string, @Body() updateDto: { name?: string; department_id?: string; total_semesters?: number }) {
    return this.branchService.updateBranch(id, updateDto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  async deleteBranch(@Param('id') id: string) {
    try {
      return await this.branchService.deleteBranch(id);
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new BadRequestException('This branch has semesters linked to it. Delete or reassign those semesters first.');
      }
      throw e;
    }
  }
}
