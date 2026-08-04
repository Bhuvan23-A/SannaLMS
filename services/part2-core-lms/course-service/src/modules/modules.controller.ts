import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: any, @Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    const tenantId = isSuperAdmin ? (body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.modulesService.create(body, String(tenantId));
  }

  @Get('course/:courseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  findAll(@Param('courseId') courseId: string) {
    return this.modulesService.findAll(courseId);
  }
}
