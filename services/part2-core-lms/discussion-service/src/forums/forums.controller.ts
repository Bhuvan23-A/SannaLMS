import { Controller, Post, Get, Body, Req, Query } from '@nestjs/common';
import { ForumsService } from './forums.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/forums')
export class ForumsController {
  constructor(private readonly forumsService: ForumsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.forumsService.createForum(body, String(tenantId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  findAll(@Query('course_id') courseId: string, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.forumsService.getForums(String(tenantId), courseId);
  }
}
