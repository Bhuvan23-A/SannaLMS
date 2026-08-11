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
    @Query('from_section_id') fromSectionId: string,
    @Query('to_section_id') toSectionId: string,
    @Req() req: any,
  ) {
    return this.promotionsService.preview(this.tenantOf(req), {
      branch_id: branchId,
      from_semester_id: fromSemesterId,
      to_semester_id: toSemesterId,
      from_section_id: fromSectionId,
      to_section_id: toSectionId,
    });
  }

  @Post('promote')
  @Roles('COLLEGE_ADMIN', 'SUPER_ADMIN')
  promote(@Body() body: any, @Req() req: any) {
    return this.promotionsService.promote(
      this.tenantOf(req, body),
      {
        branch_id: body.branch_id,
        from_semester_id: body.from_semester_id,
        to_semester_id: body.to_semester_id,
        from_section_id: body.from_section_id,
        to_section_id: body.to_section_id,
      },
      String(req.user?.id || ''),
    );
  }

  @Get()
  @Roles('COLLEGE_ADMIN', 'SUPER_ADMIN')
  history(
    @Query('branch_id') branchId: string,
    @Query('from_semester_id') fromSemesterId: string,
    @Query('from_section_id') fromSectionId: string,
    @Req() req: any,
  ) {
    return this.promotionsService.history(this.tenantOf(req), branchId, fromSectionId);
  }
}
