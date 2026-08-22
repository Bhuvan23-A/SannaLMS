import { Controller, Get, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { Roles } from '../roles.guard';
import { RolesGuard } from '../roles.guard';

@Controller('api/v1/progress')
@UseGuards(RolesGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('topic/:topicId')
  @Roles('STUDENT')
  async updateTopicProgress(
    @Param('topicId') topicId: string,
    @Body() body: { status: string; tenant_id: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-mock-user-id'] || 'student-1';
    return this.progressService.updateTopicProgress(userId, topicId, body.status, body.tenant_id);
  }

  @Post('video/:topicId')
  @Roles('STUDENT')
  async updateVideoProgress(
    @Param('topicId') topicId: string,
    @Body() body: { seconds_watched: number; tenant_id: string },
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-mock-user-id'] || 'student-1';
    return this.progressService.updateVideoProgress(userId, topicId, body.seconds_watched, body.tenant_id);
  }

  @Get('course/:courseId/overall')
  @Roles('STUDENT')
  async getOverallProgress(
    @Param('courseId') courseId: string,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.headers['x-mock-user-id'] || 'student-1';
    const percentage = await this.progressService.calculateOverallCourseProgress(userId, courseId);
    return { overall_progress: percentage };
  }

  @Get('topic/:topicId/user/:userId')
  @Roles('PRIMARY_TRAINER', 'SUPER_ADMIN')
  getTopicProgress(@Param('topicId') topicId: string, @Param('userId') userId: string) {
    return this.progressService.getTopicProgress(userId, topicId);
  }
}
