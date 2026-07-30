import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: any, @Req() req: any) {
    const tenantId = req.headers['x-mock-tenant-id'] || body.tenant_id || 't-1';
    return this.topicsService.create(body, String(tenantId));
  }

  @Get('lesson/:lessonId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  findAll(@Param('lessonId') lessonId: string) {
    return this.topicsService.findAll(lessonId);
  }
}
