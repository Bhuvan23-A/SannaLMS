import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: any, @Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.lessonsService.create(body, String(tenantId));
  }

  @Get('module/:moduleId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  findAll(@Param('moduleId') moduleId: string) {
    return this.lessonsService.findAll(moduleId);
  }
}
