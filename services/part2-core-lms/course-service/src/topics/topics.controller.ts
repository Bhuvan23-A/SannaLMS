import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { TopicsService } from './topics.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: any, @Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.topicsService.create(body, String(tenantId));
  }

  @Get('lesson/:lessonId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  findAll(@Param('lessonId') lessonId: string) {
    return this.topicsService.findAll(lessonId);
  }

  // Soft-delete a topic (its asset/progress stay in the DB for audit).
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  remove(@Param('id') id: string) {
    return this.topicsService.remove(id);
  }
}
