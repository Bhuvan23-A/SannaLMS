import { Controller, Get, Post, Delete, Body, Param, Req } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  async create(@Body() body: any, @Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const resolved = isSuperAdmin && body.module_id ? await this.lessonsService.resolveTenant(body.module_id) : null;
    const tenantId = isSuperAdmin ? (resolved || body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.lessonsService.create(body, String(tenantId));
  }

  @Get('module/:moduleId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  findAll(@Param('moduleId') moduleId: string) {
    return this.lessonsService.findAll(moduleId);
  }

  // Soft-delete a lesson (its topics stay in the DB for audit).
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  remove(@Param('id') id: string) {
    return this.lessonsService.remove(id);
  }
}
