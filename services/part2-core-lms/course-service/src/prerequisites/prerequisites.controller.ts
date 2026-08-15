import { Controller, Post, Body, Get, Param, Delete, Req } from '@nestjs/common';
import { PrerequisitesService } from './prerequisites.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/prerequisites')
export class PrerequisitesController {
  constructor(private readonly prerequisitesService: PrerequisitesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  create(@Body() body: any, @Req() req: any) {
    // tenant_id is derived from the caller's college when not sent by the client.
    return this.prerequisitesService.create(body, body.tenant_id || req.user?.tenantId || 'test-tenant');
  }

  // List a course's prerequisites — powers the Prerequisites tab (#fix).
  @Get('course/:courseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  findByCourse(@Param('courseId') courseId: string) {
    return this.prerequisitesService.findByCourse(courseId);
  }

  // Remove a prerequisite (correct a mistaken link) (#fix).
  @Delete('course/:courseId/required/:requiredCourseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  remove(@Param('courseId') courseId: string, @Param('requiredCourseId') requiredCourseId: string) {
    return this.prerequisitesService.remove(courseId, requiredCourseId);
  }
}
