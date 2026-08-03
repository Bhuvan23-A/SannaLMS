import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { Roles } from '../roles.guard';

@Controller('api/v1/enrollments')
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  enroll(@Body() body: any, @Req() req: any) {
    return this.enrollmentsService.enroll(body, body.tenant_id);
  }

  @Get('user/:userId')
  @Roles('SUPER_ADMIN', 'COLLEGE_ADMIN', 'STUDENT')
  findAll(@Param('userId') userId: string) {
    return this.enrollmentsService.findAll(userId);
  }
}
