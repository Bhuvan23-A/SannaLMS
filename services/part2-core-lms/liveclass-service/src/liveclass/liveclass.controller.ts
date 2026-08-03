import { Controller, Post, Get, Body, Req, Param, Put, Query } from '@nestjs/common';
import { LiveclassService } from './liveclass.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/liveclasses')
export class LiveclassController {
  constructor(private readonly liveclassService: LiveclassService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: Record<string, any>, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    const userId = req.headers['x-mock-user-id'] || 'u-1';
    return this.liveclassService.createClass(body, String(tenantId), String(userId));
  }

  @Get()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  findAll(@Query('course_id') courseId: string, @Req() req: Record<string, any>) {
    const tenantId = req.headers['x-mock-tenant-id'] || 't-1';
    return this.liveclassService.getClasses(String(tenantId), courseId);
  }

  @Put(':id/start')
  @Roles('PRIMARY_TRAINER', 'COLLEGE_ADMIN', 'SUPER_ADMIN')
  start(@Param('id') id: string) {
    return this.liveclassService.startClass(id);
  }

  @Put(':id/end')
  @Roles('PRIMARY_TRAINER', 'COLLEGE_ADMIN', 'SUPER_ADMIN')
  end(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.liveclassService.endClass(id, body.recording_url);
  }

  @Get(':id/join')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'STUDENT')
  join(@Param('id') id: string, @Req() req: Record<string, any>) {
    const userId = req.headers['x-mock-user-id'] || 'u-1';
    return this.liveclassService.getJitsiToken(id, String(userId));
  }
}
