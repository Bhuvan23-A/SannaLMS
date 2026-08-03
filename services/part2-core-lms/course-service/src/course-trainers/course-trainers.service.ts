import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CourseTrainersService {
  constructor(private prisma: PrismaService) {}

  async assignTrainer(data: any, tenantId: string) {
    // Check if the trainer is already assigned
    const existing = await this.prisma.extendedClient.courseTrainer.findUnique({
      where: {
        course_id_user_id: {
          course_id: data.course_id,
          user_id: data.user_id,
        }
      }
    });

    if (existing) {
      throw new ConflictException('Trainer is already assigned to this course');
    }

    return this.prisma.extendedClient.courseTrainer.create({
      data: {
        course_id: data.course_id,
        user_id: data.user_id,
        role: data.role || 'PRIMARY_TRAINER',
        tenant_id: tenantId,
      }
    });
  }

  async getTrainersForCourse(courseId: string) {
    return this.prisma.extendedClient.courseTrainer.findMany({
      where: { course_id: courseId }
    });
  }
}
