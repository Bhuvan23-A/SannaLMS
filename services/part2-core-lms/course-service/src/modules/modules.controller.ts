import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  create(@Body() body: any, @Req() req: any) {
    const tenantId = req.headers['x-mock-tenant-id'] || body.tenant_id || 't-1';
    return this.modulesService.create(body, String(tenantId));
  }

  @Get('course/:courseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  findAll(@Param('courseId') courseId: string) {
    return this.modulesService.findAll(courseId);
  }
}
