import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: any, @Req() req: any) {
    const tenantId = req.headers['x-mock-tenant-id'] || body.tenant_id || 't-1';
    return this.lessonsService.create(body, String(tenantId));
  }

  @Get('module/:moduleId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  findAll(@Param('moduleId') moduleId: string) {
    return this.lessonsService.findAll(moduleId);
  }
}
