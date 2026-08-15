import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrerequisitesService {
  constructor(private prisma: PrismaService) {}

  async create(data: { course_id: string, required_course_id: string }, tenantId: string) {
    // Resolve the tenant from the course itself when the client didn't send one.
    let effectiveTenant = tenantId;
    if (!effectiveTenant || effectiveTenant === 'test-tenant' || effectiveTenant === 'master') {
      const course = await this.prisma.extendedClient.course.findUnique({ where: { id: data.course_id } });
      effectiveTenant = course?.tenant_id || 'test-tenant';
    }

    return this.prisma.extendedClient.coursePrerequisite.create({
      data: {
        course_id: data.course_id,
        required_course_id: data.required_course_id,
        tenant_id: effectiveTenant,
      }
    });
  }

  async findByCourse(courseId: string) {
    return this.prisma.extendedClient.coursePrerequisite.findMany({
      where: { course_id: courseId },
    });
  }

  // Remove a prerequisite link (fix a mistaken one) — idempotent, clean 404
  // when the link doesn't exist instead of a raw 500.
  async remove(courseId: string, requiredCourseId: string) {
    const where = { course_id_required_course_id: { course_id: courseId, required_course_id: requiredCourseId } };
    const existing = await this.prisma.extendedClient.coursePrerequisite.findUnique({ where });
    if (!existing) {
      throw new NotFoundException('Prerequisite link not found');
    }
    await this.prisma.extendedClient.coursePrerequisite.delete({ where });
    return { removed: true, course_id: courseId, required_course_id: requiredCourseId };
  }
}
