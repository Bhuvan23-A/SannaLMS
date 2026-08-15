import { Controller, Post, Get, Patch, Body, Req, Query, Param } from '@nestjs/common';
import { ForumsService } from './forums.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/forums')
export class ForumsController {
  constructor(private readonly forumsService: ForumsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.forumsService.createForum({ ...body, role: isSuperAdmin ? 'superadmin' : req.user?.roles?.[0] }, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  findAll(@Query('course_id') courseId: string, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? 'master' : (req.user?.tenantId || 'test-tenant');
    return this.forumsService.getForums(String(tenantId), courseId, !!isSuperAdmin);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  getOne(@Param('id') id: string) {
    return this.forumsService.getForum(id);
  }

  // Close / reopen a forum (#fix): is_locked blocks new threads + replies.
  // Anyone who can create forums may close them, but only within their own
  // college (super admins can manage any).
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  update(@Param('id') id: string, @Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = String(req.user?.tenantId || 'test-tenant');
    return this.forumsService.updateForum(id, body, tenantId, !!isSuperAdmin);
  }
}
