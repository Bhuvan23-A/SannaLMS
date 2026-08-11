import { Controller, Post, Get, Body, Req, Query } from '@nestjs/common';
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
}
