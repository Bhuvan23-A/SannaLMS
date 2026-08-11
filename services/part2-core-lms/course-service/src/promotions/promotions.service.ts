import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EnrollmentStatus } from '@prisma/client';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  private semesterCourses(tenantId: string, branchId: string, semesterId: string) {
    return this.prisma.extendedClient.course.findMany({
      where: {
        tenant_id: tenantId,
        branch_id: branchId,
        semester_id: semesterId,
        deleted_at: null,
      },
      select: { id: true, title: true, year: true },
    });
  }

  private async studentsInCourses(courseIds: string[]): Promise<string[]> {
    if (courseIds.length === 0) return [];
    const enrollments = await this.prisma.extendedClient.enrollment.findMany({
      where: {
        course_id: { in: courseIds },
        status: 'ACTIVE',
        deleted_at: null,
      },
      select: { user_id: true },
    });
    return Array.from(new Set(enrollments.map((e: any) => e.user_id)));
  }

  /**
   * Dry-run: show what a promotion would do — source/target courses and the
   * students currently in the source semester.
   */
  async preview(tenantId: string, branchId: string, fromSemesterId: string, toSemesterId: string) {
    if (!branchId || !fromSemesterId || !toSemesterId) {
      throw new BadRequestException('branch_id, from_semester_id and to_semester_id are required');
    }
    const fromCourses = await this.semesterCourses(tenantId, branchId, fromSemesterId);
    const toCourses = await this.semesterCourses(tenantId, branchId, toSemesterId);
    const students = await this.studentsInCourses(fromCourses.map((c: any) => c.id));

    return {
      branch_id: branchId,
      from_semester_id: fromSemesterId,
      to_semester_id: toSemesterId,
      from_courses: fromCourses,
      to_courses: toCourses,
      students: students.map((user_id) => ({ user_id })),
      student_count: students.length,
    };
  }

  /**
   * Promote every active student in the source semester's courses into the
   * target semester's courses. Source enrollments are marked COMPLETED so the
   * batch "moves on" (history preserved, active course list updated). Records
   * an audit row per student.
   */
  async promote(tenantId: string, branchId: string, fromSemesterId: string, toSemesterId: string, promotedBy: string) {
    if (!branchId || !fromSemesterId || !toSemesterId) {
      throw new BadRequestException('branch_id, from_semester_id and to_semester_id are required');
    }
    if (fromSemesterId === toSemesterId) {
      throw new BadRequestException('from_semester_id and to_semester_id must differ');
    }
    const fromCourses = await this.semesterCourses(tenantId, branchId, fromSemesterId);
    const toCourses = await this.semesterCourses(tenantId, branchId, toSemesterId);
    if (fromCourses.length === 0) {
      throw new NotFoundException('No courses found for the source semester in this branch');
    }
    if (toCourses.length === 0) {
      throw new NotFoundException('No courses found for the target semester in this branch — create them first');
    }

    const studentIds = await this.studentsInCourses(fromCourses.map((c: any) => c.id));
    if (studentIds.length === 0) {
      throw new BadRequestException('No active students found in the source semester');
    }

    let enrollmentsCreated = 0;
    const fromCourseIds = fromCourses.map((c: any) => c.id);
    const toCourseIds = toCourses.map((c: any) => c.id);

    for (const userId of studentIds) {
      // Enroll into every target-semester course (skip existing enrollments).
      for (const courseId of toCourseIds) {
        const existing = await this.prisma.extendedClient.enrollment.findUnique({
          where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (!existing) {
          await this.prisma.extendedClient.enrollment.create({
            data: { user_id: userId, course_id: courseId, tenant_id: tenantId, status: EnrollmentStatus.ACTIVE },
          });
          enrollmentsCreated += 1;
        }
      }
      // Complete the source-semester enrollments so they leave the active list.
      await this.prisma.extendedClient.enrollment.updateMany({
        where: { user_id: userId, course_id: { in: fromCourseIds } },
        data: { status: EnrollmentStatus.COMPLETED, completed_at: new Date() },
      });
    }

    await this.prisma.extendedClient.promotion.createMany({
      data: studentIds.map((student_id) => ({
        tenant_id: tenantId,
        branch_id: branchId,
        from_semester_id: fromSemesterId,
        to_semester_id: toSemesterId,
        student_id,
        promoted_by: promotedBy || null,
      })),
    });

    return {
      branch_id: branchId,
      from_semester_id: fromSemesterId,
      to_semester_id: toSemesterId,
      student_count: studentIds.length,
      enrollments_created: enrollmentsCreated,
      students_promoted: studentIds,
      to_courses: toCourses,
    };
  }

  /** Promotion audit history for a branch/semester. */
  async history(tenantId: string, branchId?: string, fromSemesterId?: string) {
    return this.prisma.extendedClient.promotion.findMany({
      where: {
        tenant_id: tenantId,
        ...(branchId ? { branch_id: branchId } : {}),
        ...(fromSemesterId ? { from_semester_id: fromSemesterId } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
  }
}
