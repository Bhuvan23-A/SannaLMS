import { Controller, Get, Post, Patch, Delete, Param, Body, Req, Query, UseGuards } from '@nestjs/common';
import { SectionService } from './section.service';
import { RolesGuard, Roles } from './roles.guard';

@Controller('api/v1/sections')
@UseGuards(RolesGuard)
export class SectionController {
  constructor(private readonly service: SectionService) {}

  private tenant(req: any): string {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    return isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  create(@Body() body: any, @Req() req: any) {
    // Super admins pick the target college in the UI — create the section under
    // that college's tenant (not 'master', where it shows with no college).
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.service.create(body, tenantId);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  findAll(@Req() req: any, @Query('branch_id') branchId?: string, @Query('academic_session_id') sessionId?: string) {
    return this.service.findAll(this.tenant(req), branchId, sessionId);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.update(id, this.tenant(req), body);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, this.tenant(req));
  }
}
