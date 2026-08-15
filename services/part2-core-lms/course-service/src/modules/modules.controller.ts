import { Controller, Get, Post, Put, Delete, Body, Param, Req } from '@nestjs/common';
import { ModulesService } from './modules.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/modules')
export class ModulesController {
  constructor(private readonly modulesService: ModulesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  async create(@Body() body: any, @Req() req: any) {
    const isSuperAdmin = req.user?.roles?.includes('superadmin');
    // Super admins building content for a college course must not write it into
    // tenant 'master' — resolve the tenant from the course/subject instead.
    const resolved = isSuperAdmin ? await this.modulesService.resolveTenant(body) : null;
    const tenantId = isSuperAdmin ? (resolved || body.tenant_id || 'master') : (req.user?.tenantId || 'test-tenant');
    return this.modulesService.create(body, String(tenantId));
  }

  @Get('course/:courseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  findAll(@Param('courseId') courseId: string) {
    return this.modulesService.findAll(courseId);
  }

  // Rename / reorder a module (the course builder already calls this for
  // drag-and-drop reordering — it was silently 404ing before) (#fix).
  @Put(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  update(@Param('id') id: string, @Body() body: { title?: string; sequence_no?: number }) {
    return this.modulesService.update(id, body);
  }

  // Soft-delete a module (its lessons/topics stay in the DB for audit).
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER')
  remove(@Param('id') id: string) {
    return this.modulesService.remove(id);
  }
}
