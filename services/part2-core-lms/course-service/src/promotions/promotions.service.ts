import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EnrollmentStatus, MembershipStatus } from '@prisma/client';

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  private async coursesFor(tenantId: string, opts: { branchId?: string; semesterId?: string; sectionId?: string }) {
    const where: any = { tenant_id: tenantId, deleted_at: null };
    if (opts.sectionId) where.section_id = opts.sectionId;
    else {
      where.branch_id = opts.branchId;
      where.semester_id = opts.semesterId;
    }
    return this.prisma.extendedClient.course.findMany({ where, select: { id: true, title: true, year: true } });
  }

  private async studentsInCourses(courseIds: string[]): Promise<string[]> {
    if (courseIds.length === 0) return [];
    const enrollments = await this.prisma.extendedClient.enrollment.findMany({
      where: { course_id: { in: courseIds }, status: 'ACTIVE', deleted_at: null },
      select: { user_id: true },
    });
    return Array.from(new Set(enrollments.map((e: any) => e.user_id)));
  }

  /**
   * Dry-run: show what a promotion would do — source/target courses and the
   * students currently in the source semester/section.
   */
  async preview(tenantId: string, params: any) {
    const section = params.from_section_id && params.to_section_id;
    const semester = params.branch_id && params.from_semester_id && params.to_semester_id;
    if (!section && !semester) {
      throw new BadRequestException('Provide either (from_section_id + to_section_id) or (branch_id + from_semester_id + to_semester_id)');
    }
    const fromCourses = await this.coursesFor(tenantId, section
      ? { sectionId: params.from_section_id }
      : { branchId: params.branch_id, semesterId: params.from_semester_id });
    const toCourses = await this.coursesFor(tenantId, section
      ? { sectionId: params.to_section_id }
      : { branchId: params.branch_id, semesterId: params.to_semester_id });
    const students = await this.studentsInCourses(fromCourses.map((c: any) => c.id));

    return {
      from_section_id: params.from_section_id || null,
      to_section_id: params.to_section_id || null,
      branch_id: params.branch_id || null,
      from_semester_id: params.from_semester_id || null,
      to_semester_id: params.to_semester_id || null,
      from_courses: fromCourses,
      to_courses: toCourses,
      students: students.map((user_id) => ({ user_id })),
      student_count: students.length,
    };
  }

  /**
   * Promote every active student from the source semester/section into the
   * target. In section mode this ALSO moves the cohort roster (SectionMembership
   * from -> to) and the new enrollments are auto-enrollments of the target
   * section. Source enrollments are marked COMPLETED (history preserved).
   */
  async promote(tenantId: string, params: any, promotedBy: string) {
    const section = params.from_section_id && params.to_section_id;
    const semester = params.branch_id && params.from_semester_id && params.to_semester_id;
    if (!section && !semester) {
      throw new BadRequestException('Provide either (from_section_id + to_section_id) or (branch_id + from_semester_id + to_semester_id)');
    }
    const fromKey = section ? params.from_section_id : params.from_semester_id;
    const toKey = section ? params.to_section_id : params.to_semester_id;
    if (fromKey === toKey) throw new BadRequestException('Source and target must differ');

    const fromCourses = await this.coursesFor(tenantId, section
      ? { sectionId: params.from_section_id }
      : { branchId: params.branch_id, semesterId: params.from_semester_id });
    const toCourses = await this.coursesFor(tenantId, section
      ? { sectionId: params.to_section_id }
      : { branchId: params.branch_id, semesterId: params.to_semester_id });
    if (fromCourses.length === 0) throw new NotFoundException('No courses found for the source semester/section');
    if (toCourses.length === 0) throw new NotFoundException('No courses found for the target semester/section — create them first');

    const studentIds = await this.studentsInCourses(fromCourses.map((c: any) => c.id));
    if (studentIds.length === 0) throw new BadRequestException('No active students found in the source');

    let enrollmentsCreated = 0;
    const fromCourseIds = fromCourses.map((c: any) => c.id);
    const toCourseIds = toCourses.map((c: any) => c.id);

    for (const userId of studentIds) {
      // Section mode: move the cohort roster (old membership completed, new active).
      if (section) {
        await this.prisma.extendedClient.sectionMembership.updateMany({
          where: { section_id: params.from_section_id, user_id: userId, deleted_at: null },
          data: { status: MembershipStatus.COMPLETED },
        });
        const existingMember = await this.prisma.extendedClient.sectionMembership.findUnique({
          where: { section_id_user_id: { section_id: params.to_section_id, user_id: userId } },
        });
        if (!existingMember) {
          await this.prisma.extendedClient.sectionMembership.create({
            data: { tenant_id: tenantId, section_id: params.to_section_id, user_id: userId },
          });
        }
      }

      for (const courseId of toCourseIds) {
        const existing = await this.prisma.extendedClient.enrollment.findUnique({
          where: { user_id_course_id: { user_id: userId, course_id: courseId } },
        });
        if (!existing) {
          await this.prisma.extendedClient.enrollment.create({
            data: {
              user_id: userId,
              course_id: courseId,
              tenant_id: tenantId,
              status: EnrollmentStatus.ACTIVE,
              auto_enrolled: !!section,
              section_id: section ? params.to_section_id : undefined,
            },
          });
          enrollmentsCreated += 1;
        }
      }
      await this.prisma.extendedClient.enrollment.updateMany({
        where: { user_id: userId, course_id: { in: fromCourseIds } },
        data: { status: EnrollmentStatus.COMPLETED, completed_at: new Date() },
      });
    }

    await this.prisma.extendedClient.promotion.createMany({
      data: studentIds.map((student_id) => ({
        tenant_id: tenantId,
        branch_id: params.branch_id || '',
        from_semester_id: params.from_semester_id || '',
        to_semester_id: params.to_semester_id || '',
        from_section_id: params.from_section_id || null,
        to_section_id: params.to_section_id || null,
        student_id,
        promoted_by: promotedBy || null,
      })),
    });

    return {
      branch_id: params.branch_id || null,
      from_semester_id: params.from_semester_id || null,
      to_semester_id: params.to_semester_id || null,
      from_section_id: params.from_section_id || null,
      to_section_id: params.to_section_id || null,
      student_count: studentIds.length,
      enrollments_created: enrollmentsCreated,
      students_promoted: studentIds,
      to_courses: toCourses,
    };
  }

  /** Promotion audit history for a branch/section. */
  async history(tenantId: string, branchId?: string, fromSectionId?: string) {
    return this.prisma.extendedClient.promotion.findMany({
      where: {
        tenant_id: tenantId,
        ...(branchId ? { branch_id: branchId } : {}),
        ...(fromSectionId ? { from_section_id: fromSectionId } : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 500,
    });
  }
}
