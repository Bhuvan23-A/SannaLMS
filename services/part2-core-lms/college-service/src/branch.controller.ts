import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
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
}
