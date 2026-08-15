import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CourseTrainersService {
  constructor(private prisma: PrismaService) {}

  async assignTrainer(data: any, tenantId: string) {
    // Resolve the tenant from the course itself when the client didn't send one.
    let effectiveTenant = tenantId;
    if (!effectiveTenant || effectiveTenant === 'test-tenant' || effectiveTenant === 'master') {
      const course = await this.prisma.extendedClient.course.findUnique({ where: { id: data.course_id } });
      effectiveTenant = course?.tenant_id || 'test-tenant';
    }

    // Idempotent upsert (#fix): re-assigning a trainer who is already on the
    // course just corrects the role (e.g. a TA mistakenly added as PRIMARY
    // TRAINER) instead of throwing "already assigned" with no way to fix it.
    const existing = await this.prisma.extendedClient.courseTrainer.findUnique({
      where: { course_id_user_id: { course_id: data.course_id, user_id: data.user_id } },
    });
    if (existing) {
      return this.prisma.extendedClient.courseTrainer.update({
        where: { id: existing.id },
        data: { role: data.role || existing.role },
      });
    }

    return this.prisma.extendedClient.courseTrainer.create({
      data: {
        course_id: data.course_id,
        user_id: data.user_id,
        role: data.role || 'PRIMARY_TRAINER',
        tenant_id: effectiveTenant,
      }
    });
  }

  async getTrainersForCourse(courseId: string) {
    return this.prisma.extendedClient.courseTrainer.findMany({
      where: { course_id: courseId }
    });
  }

  // Change a trainer's role on a course (basic human-error correction).
  async updateRole(id: string, role: string) {
    const existing = await this.prisma.extendedClient.courseTrainer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Course trainer assignment not found');
    }
    return this.prisma.extendedClient.courseTrainer.update({
      where: { id },
      data: { role: role || 'PRIMARY_TRAINER' },
    });
  }

  // Remove a trainer from a course entirely.
  async remove(id: string) {
    const existing = await this.prisma.extendedClient.courseTrainer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Course trainer assignment not found');
    }
    await this.prisma.extendedClient.courseTrainer.delete({ where: { id } });
    return { removed: true, id };
  }
}
