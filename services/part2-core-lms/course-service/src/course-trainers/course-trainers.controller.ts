import { Controller, Post, Body, Get, Param, Req } from '@nestjs/common';
import { CourseTrainersService } from './course-trainers.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/course-trainers')
export class CourseTrainersController {
  constructor(private readonly courseTrainersService: CourseTrainersService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN')
  assignTrainer(@Body() body: any, @Req() req: any) {
    return this.courseTrainersService.assignTrainer(body, body.tenant_id);
  }

  @Get('course/:courseId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'STUDENT')
  getTrainersForCourse(@Param('courseId') courseId: string) {
    return this.courseTrainersService.getTrainersForCourse(courseId);
  }
}
