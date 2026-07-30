import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProgressService {
  constructor(private prisma: PrismaService) {}

  async checkEnrollment(userId: string, topicId: string) {
    // Content Access Rule: User must have an ACTIVE enrollment for the course this topic belongs to.
    const topic = await this.prisma.extendedClient.topic.findUnique({
      where: { id: topicId },
      include: { lesson: { include: { module: true } } }
    });

    if (!topic) throw new ForbiddenException('Topic not found');

    const courseId = topic.lesson.module.course_id;

    const enrollment = await this.prisma.extendedClient.enrollment.findUnique({
      where: { user_id_course_id: { user_id: userId, course_id: courseId } }
    });

    if (!enrollment || enrollment.status !== 'ACTIVE') {
      throw new ForbiddenException('Content Access Blocked: You do not have an active enrollment for this course.');
    }
    return { topic, courseId };
  }

  async updateTopicProgress(userId: string, topicId: string, status: any, tenantId: string) {
    await this.checkEnrollment(userId, topicId);

    return this.prisma.extendedClient.topicProgress.upsert({
      where: { user_id_topic_id: { user_id: userId, topic_id: topicId } },
      update: { status, updated_by: userId, last_accessed_at: new Date() },
      create: {
        user_id: userId,
        topic_id: topicId,
        status,
        tenant_id: tenantId,
        created_by: userId,
        updated_by: userId
      },
    });
  }

  async updateVideoProgress(userId: string, topicId: string, secondsWatched: number, tenantId: string) {
    const tp = await this.updateTopicProgress(userId, topicId, 'IN_PROGRESS', tenantId);

    const videoMetadata = await this.prisma.extendedClient.videoMetadata.findFirst({
      where: { asset: { topic_id: topicId } }
    });
    
    let percentage = 0;
    if (videoMetadata && videoMetadata.duration_seconds) {
      percentage = Math.min((secondsWatched / videoMetadata.duration_seconds) * 100, 100);
    }

    const vp = await this.prisma.extendedClient.videoProgress.upsert({
      where: { topic_progress_id: tp.id },
      update: { last_second_watched: secondsWatched, percentage_completed: percentage },
      create: {
        topic_progress_id: tp.id,
        last_second_watched: secondsWatched,
        percentage_completed: percentage,
        tenant_id: tenantId
      }
    });

    if (percentage >= 95) {
      await this.updateTopicProgress(userId, topicId, 'COMPLETED', tenantId);
    }

    return vp;
  }

  async calculateOverallCourseProgress(userId: string, courseId: string) {
    const topics = await this.prisma.extendedClient.topic.findMany({
      where: { lesson: { module: { course_id: courseId } } },
      select: { id: true }
    });
    const topicIds = topics.map(t => t.id);

    if (topicIds.length === 0) return 0;

    const completedTopics = await this.prisma.extendedClient.topicProgress.count({
      where: {
        user_id: userId,
        status: 'COMPLETED',
        topic_id: { in: topicIds }
      }
    });

    return (completedTopics / topicIds.length) * 100;
  }

  getTopicProgress(userId: string, topicId: string) {
    return this.prisma.extendedClient.topicProgress.findUnique({
      where: { user_id_topic_id: { user_id: userId, topic_id: topicId } }
    });
  }
}
