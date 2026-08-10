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

    // Resolve the tenant from the course itself when the client didn't send one,
    // so enrollments always land in the right college.
    let effectiveTenant = tenantId;
    if (!effectiveTenant || effectiveTenant === 'test-tenant' || effectiveTenant === 'master') {
      const course = await this.prisma.extendedClient.course.findUnique({ where: { id: data.course_id } });
      effectiveTenant = course?.tenant_id || 'test-tenant';
    }

    return this.prisma.extendedClient.enrollment.create({
      data: {
        user_id: data.user_id,
        course_id: data.course_id,
        tenant_id: effectiveTenant,
      }
    });
  }

  // All enrollments, scoped by tenant. 'master'/'test-tenant' means "no filter"
  // (mirrors how CoursesService.findAll treats those sentinel tenants).
  findAllByTenant(tenantId?: string) {
    const where = tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' ? { tenant_id: tenantId } : {};
    return this.prisma.extendedClient.enrollment.findMany({ where });
  }

  findAll(userId: string) {
    return this.prisma.extendedClient.enrollment.findMany({
      where: { user_id: userId },
      include: { course: true }
    });
  }

  findByCourse(courseId: string) {
    return this.prisma.extendedClient.enrollment.findMany({
      where: { course_id: courseId },
      include: { course: { select: { id: true, title: true } } },
      orderBy: { created_at: 'asc' }
    });
  }
}
