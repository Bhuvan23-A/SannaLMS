import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private prisma: PrismaService) {}

  async enroll(data: { user_id: string, course_id: string }, tenantId: string) {
    // Check prerequisites
    const prerequisites = await this.prisma.extendedClient.coursePrerequisite.findMany({
      where: { course_id: data.course_id }
    });

    for (const prereq of prerequisites) {
      const hasCompleted = await this.prisma.extendedClient.enrollment.findFirst({
        where: {
          user_id: data.user_id,
          course_id: prereq.required_course_id,
          status: 'COMPLETED'
        }
      });

      if (!hasCompleted) {
        throw new BadRequestException(`Missing prerequisite course: ${prereq.required_course_id}`);
      }
    }

    return this.prisma.extendedClient.enrollment.create({
      data: {
        user_id: data.user_id,
        course_id: data.course_id,
        tenant_id: tenantId,
      }
    });
  }

  findAll(userId: string) {
    return this.prisma.extendedClient.enrollment.findMany({
      where: { user_id: userId },
      include: { course: true }
    });
  }
}
