import { Controller, Get, Post, Patch, Delete, Param, Body, Req, Query } from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  private tenant(req: any): string {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    return isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
  }

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  create(@Body() body: any, @Req() req: any) {
    // Super admins pick the target college in the UI — create the subject under
    // that college's tenant instead of dumping it into 'master' (where it shows
    // with no college and is invisible to every college admin).
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.subjectsService.create(body, tenantId);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT', 'GUEST_FACULTY')
  findAll(@Req() req: any, @Query('branch_id') branchId?: string, @Query('include_archived') includeArchived?: string) {
    return this.subjectsService.findAll(this.tenant(req), branchId, includeArchived === 'true');
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT', 'GUEST_FACULTY')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.subjectsService.findOne(id, this.tenant(req));
  }

  @Get(':id/syllabus')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT', 'GUEST_FACULTY')
  getSyllabus(@Param('id') id: string, @Req() req: any) {
    return this.subjectsService.getSyllabus(id, this.tenant(req));
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.subjectsService.update(id, this.tenant(req), body);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.subjectsService.remove(id, this.tenant(req));
  }

  @Post(':id/restore')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  restore(@Param('id') id: string, @Req() req: any) {
    return this.subjectsService.restore(id, this.tenant(req));
  }

  @Delete(':id/permanent')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  removePermanent(@Param('id') id: string, @Req() req: any) {
    return this.subjectsService.removePermanent(id, this.tenant(req));
  }
}
