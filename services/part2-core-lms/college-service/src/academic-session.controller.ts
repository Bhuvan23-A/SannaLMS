import { Controller, Get, Post, Patch, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AcademicSessionService } from './academic-session.service';
import { RolesGuard, Roles } from './roles.guard';

@Controller('api/v1/academic-sessions')
@UseGuards(RolesGuard)
export class AcademicSessionController {
  constructor(private readonly service: AcademicSessionService) {}

  private tenant(req: any): string {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    return isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  create(@Body() body: any, @Req() req: any) {
    // Super admins pick the target college in the UI — create the session under
    // that college's tenant (not 'master', where it shows with no college).
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.service.create(body, tenantId);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  findAll(@Req() req: any) {
    return this.service.findAll(this.tenant(req));
  }

  @Post(':id/activate')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  activate(@Param('id') id: string, @Req() req: any) {
    return this.service.activate(id, this.tenant(req));
  }

  @Post(':id/close')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  close(@Param('id') id: string, @Req() req: any) {
    return this.service.close(id, this.tenant(req));
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
