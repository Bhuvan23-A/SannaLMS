import { Controller, Get, Post, Query, Body, Req } from '@nestjs/common';
import { PromotionsService } from './promotions.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  private tenantOf(req: any, body?: any): string {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    return isSuperAdmin ? (body?.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
  }

  @Get('preview')
  @Roles('COLLEGE_ADMIN', 'SUPER_ADMIN')
  preview(
    @Query('branch_id') branchId: string,
    @Query('from_semester_id') fromSemesterId: string,
    @Query('to_semester_id') toSemesterId: string,
    @Req() req: any,
  ) {
    return this.promotionsService.preview(this.tenantOf(req), branchId, fromSemesterId, toSemesterId);
  }

  @Post('promote')
  @Roles('COLLEGE_ADMIN', 'SUPER_ADMIN')
  promote(@Body() body: { branch_id: string; from_semester_id: string; to_semester_id: string; tenant_id?: string }, @Req() req: any) {
    return this.promotionsService.promote(
      this.tenantOf(req, body),
      body.branch_id,
      body.from_semester_id,
      body.to_semester_id,
      String(req.user?.id || ''),
    );
  }

  @Get()
  @Roles('COLLEGE_ADMIN', 'SUPER_ADMIN')
  history(
    @Query('branch_id') branchId: string,
    @Query('from_semester_id') fromSemesterId: string,
    @Req() req: any,
  ) {
    return this.promotionsService.history(this.tenantOf(req), branchId, fromSemesterId);
  }
}
