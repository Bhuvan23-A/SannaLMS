import { Controller, Post, Body, Get, Param, Req, Patch, Delete } from '@nestjs/common';
import { CourseTrainersService } from './course-trainers.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/course-trainers')
export class CourseTrainersController {
  constructor(private readonly courseTrainersService: CourseTrainersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  assignTrainer(@Body() body: any, @Req() req: any) {
    // tenant_id is derived from the caller's college when not sent by the client.
    return this.courseTrainersService.assignTrainer(body, body.tenant_id || req.user?.tenantId || 'test-tenant');
  }

  @Get('course/:courseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  getTrainersForCourse(@Param('courseId') courseId: string) {
    return this.courseTrainersService.getTrainersForCourse(courseId);
  }

  // Change a trainer's role on a course (fixes mistaken assignments, e.g. a TA
  // accidentally added as PRIMARY_TRAINER) (#fix).
  @Patch(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  updateRole(@Param('id') id: string, @Body() body: { role?: string }) {
    return this.courseTrainersService.updateRole(id, body.role || 'PRIMARY_TRAINER');
  }

  // Remove a trainer from a course entirely (#fix).
  @Delete(':id')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  remove(@Param('id') id: string) {
    return this.courseTrainersService.remove(id);
  }
}
