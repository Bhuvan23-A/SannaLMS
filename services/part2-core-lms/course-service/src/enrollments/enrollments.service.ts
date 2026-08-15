import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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

  /**
   * Bulk enroll (#bulk): enroll a list of students into a list of courses in
   * one call. When branch_id + semester_id are given, the courses are resolved
   * to every course of that branch/semester (real-LMS "enroll the batch").
   * Stage-2 section mode: when section_id is given, the courses are the section's
   * offerings and each student is also added to the section roster (roster +
   * auto-enrolled, real-college "admit to the class"). Existing rows are kept.
   */
  async bulkEnroll(body: { user_ids?: string[]; course_ids?: string[]; branch_id?: string; semester_id?: string; semester_number?: number; section_id?: string }, tenantId: string) {
    const user_ids = Array.isArray(body.user_ids) ? body.user_ids.filter(Boolean) : [];
    if (user_ids.length === 0) {
      throw new BadRequestException('Provide at least one user_id to enroll');
    }

    const sectionId = body.section_id || null;
    let course_ids = Array.isArray(body.course_ids) ? body.course_ids.filter(Boolean) : [];

    // Resolve courses from section (offerings of the section).
    if (course_ids.length === 0 && sectionId) {
      const courses = await this.prisma.extendedClient.course.findMany({
        where: { section_id: sectionId, deleted_at: null },
        select: { id: true },
      });
      course_ids = courses.map((c: any) => c.id);
    }
    // Resolve courses from branch + semester when no explicit course list given.
    // Courses store the semester NUMBER (denormalized from their section), not
    // the semester record id, so match by semester_number when that's sent
    // (#fix: matching semester_id alone always matched zero courses).
    if (course_ids.length === 0 && body.branch_id && (body.semester_id || body.semester_number)) {
      const courses = await this.prisma.extendedClient.course.findMany({
        where: {
          tenant_id: tenantId,
          branch_id: body.branch_id,
          ...(body.semester_id ? { semester_id: body.semester_id } : { semester_number: Number(body.semester_number) }),
          deleted_at: null,
        },
        select: { id: true },
      });
      course_ids = courses.map((c: any) => c.id);
    }
    if (course_ids.length === 0) {
      throw new BadRequestException('No courses matched — pass course_ids, branch_id + semester_id, or section_id');
    }

    let enrolled = 0;
    let skipped = 0;
    let memberships = 0;
    const failures: { user_id: string; course_id: string; error: string }[] = [];

    for (const userId of user_ids) {
      // Section mode: add to the roster (upsert) so future offerings auto-enroll.
      if (sectionId) {
        const existingMember = await this.prisma.extendedClient.sectionMembership.findUnique({
          where: { section_id_user_id: { section_id: sectionId, user_id: userId } },
        });
        if (!existingMember) {
          await this.prisma.extendedClient.sectionMembership.create({
            data: { tenant_id: tenantId, section_id: sectionId, user_id: userId },
          });
          memberships += 1;
        }
      }
      for (const courseId of course_ids) {
        try {
          const existing = await this.prisma.extendedClient.enrollment.findUnique({
            where: { user_id_course_id: { user_id: userId, course_id: courseId } },
          });
          if (existing) { skipped += 1; continue; }
          await this.prisma.extendedClient.enrollment.create({
            data: {
              user_id: userId,
              course_id: courseId,
              tenant_id: tenantId,
              auto_enrolled: !!sectionId,
              section_id: sectionId || undefined,
            },
          });
          enrolled += 1;
        } catch (err: any) {
          failures.push({ user_id: userId, course_id: courseId, error: err?.message || 'error' });
        }
      }
    }

    return { enrolled, skipped, failed: failures.length, failures, course_ids, user_count: user_ids.length, memberships, section_id: sectionId };
  }

  // All enrollments, scoped by tenant. 'master'/'test-tenant' means "no filter"
  // (mirrors how CoursesService.findAll treats those sentinel tenants).
  findAllByTenant(tenantId?: string) {
    const where = tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' ? { tenant_id: tenantId } : {};
    return this.prisma.extendedClient.enrollment.findMany({ where });
  }

  // Lightweight count for dashboards — avoids shipping thousands of rows (#perf).
  countByTenant(tenantId?: string) {
    const where = tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' ? { tenant_id: tenantId } : {};
    return this.prisma.extendedClient.enrollment.count({ where }).then((count) => ({ count }));
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

  // Remove a single enrollment (real-LMS "unenroll"): lets college admins
  // correct mistaken enrollments, e.g. a student added to the wrong course.
  // The compound unique (user_id, course_id) makes the delete safe and atomic.
  async removeByCourseAndUser(courseId: string, userId: string) {
    const where = { user_id_course_id: { user_id: userId, course_id: courseId } };
    const existing = await this.prisma.extendedClient.enrollment.findUnique({ where });
    if (!existing) {
      throw new NotFoundException('Enrollment not found for this student and course');
    }
    await this.prisma.extendedClient.enrollment.delete({ where });
    return { removed: true, user_id: userId, course_id: courseId };
  }
}
