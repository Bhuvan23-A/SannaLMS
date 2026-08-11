import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(createCourseDto: any, tenantId: string) {
    return this.prisma.extendedClient.course.create({
      data: {
        title: createCourseDto.title,
        description: createCourseDto.description,
        status: createCourseDto.status || CourseStatus.DRAFT,
        tenant_id: tenantId,
        department_id: createCourseDto.department_id || null,
        branch_id: createCourseDto.branch_id || null,
        semester_id: createCourseDto.semester_id || null,
        // year is a String column — coerce numbers so API clients sending 2
        // (instead of "2") don't hit an opaque Prisma 500. DEPRECATED: kept so
        // old clients keep working; new clients send year_of_study instead.
        year: createCourseDto.year != null && createCourseDto.year !== '' ? String(createCourseDto.year) : null,
        // Stage-1 college-accurate fields: subject identity + cohort targeting.
        // year_of_study is a real 1..4 year of study (NOT a calendar year).
        subject_code: createCourseDto.subject_code?.trim() || null,
        credits: this.toInt(createCourseDto.credits),
        section: createCourseDto.section?.trim() || null,
        academic_session: createCourseDto.academic_session?.trim() || null,
        year_of_study: this.toInt(createCourseDto.year_of_study),
      },
    });
  }

  async update(id: string, data: any) {
    const updated = await this.prisma.extendedClient.course.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        status: data.status,
        department_id: data.department_id ?? undefined,
        branch_id: data.branch_id ?? undefined,
        semester_id: data.semester_id ?? undefined,
        year: data.year != null && data.year !== '' ? String(data.year) : (data.year === '' ? null : undefined),
        subject_code: data.subject_code !== undefined ? (data.subject_code?.trim() || null) : undefined,
        credits: data.credits !== undefined ? this.toInt(data.credits) : undefined,
        section: data.section !== undefined ? (data.section?.trim() || null) : undefined,
        academic_session: data.academic_session !== undefined ? (data.academic_session?.trim() || null) : undefined,
        year_of_study: data.year_of_study !== undefined ? this.toInt(data.year_of_study) : undefined,
      }
    });

    if (data.status === 'PUBLISHED') {
      // Create a snapshot for Course Version History
      const courseFullState = await this.prisma.extendedClient.course.findUnique({
        where: { id },
        include: {
          modules: {
            include: {
              lessons: {
                include: { topics: true }
              }
            }
          }
        }
      });

      if (courseFullState) {
        // @ts-ignore - Prisma strict typing issue for JSON
        const snapshotData: any = courseFullState;
        await this.prisma.extendedClient.courseVersionHistory.create({
          data: {
            course_id: id,
            version_number: courseFullState.version,
            snapshot_data: snapshotData,
            tenant_id: courseFullState.tenant_id,
          }
        });
      }
    }

    return updated;
  }

  async findAll(tenantId?: string, viewer?: { role?: string; roles?: string[]; userId?: string; includeCompleted?: boolean }) {
    const roles = (viewer?.roles || []).map((r: string) => r.toUpperCase());
    // Role precedence matters: every Keycloak user carries the realm-default
    // 'student' role, so admins/trainers must be checked BEFORE the student
    // branch or they'd get the empty enrollment-scoped list.
    const isAdmin = roles.some((r) => ['SUPERADMIN', 'TENANTADMIN', 'COLLEGE_ADMIN'].includes(r));
    const isTrainer = roles.some((r) => ['PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'INSTRUCTOR', 'TRAINER', 'ASSISTANT', 'GUEST_FACULTY'].includes(r));
    const isStudent = roles.includes('STUDENT');

    // Real-LMS scoping (#fix): trainers only see the courses they teach, and
    // students only see the courses they are enrolled in. Admins keep the
    // tenant-wide list (all colleges for super admin).
    if (isAdmin || !viewer?.userId) {
      // fall through to the tenant-wide list below
    } else if (isTrainer) {
      const rows = await this.prisma.extendedClient.courseTrainer.findMany({
        where: { user_id: viewer.userId },
        select: { course_id: true },
      });
      const ids = (rows as any[]).map((r) => r.course_id);
      return this.prisma.extendedClient.course.findMany({
        where: {
          deleted_at: null,
          ...(ids.length > 0 ? { id: { in: ids } } : { id: 'none' }),
        },
      });
    } else if (isStudent) {
      // Real-LMS behavior: "My Courses" shows the ACTIVE semester's courses;
      // promoted/past (COMPLETED) courses only appear when includeCompleted is
      // set (grade card) so they don't clutter the active list.
      const rows = await this.prisma.extendedClient.enrollment.findMany({
        where: viewer.includeCompleted
          ? { user_id: viewer.userId, status: { in: ['ACTIVE', 'COMPLETED'] } }
          : { user_id: viewer.userId, status: 'ACTIVE' },
        select: { course_id: true },
      });
      const ids = (rows as any[]).map((r) => r.course_id);
      return this.prisma.extendedClient.course.findMany({
        where: {
          deleted_at: null,
          ...(ids.length > 0 ? { id: { in: ids } } : { id: 'none' }),
        },
      });
    }

    if (tenantId && tenantId !== 'test-tenant' && tenantId !== 'master') {
      return this.prisma.extendedClient.course.findMany({
        where: { tenant_id: tenantId, deleted_at: null }
      });
    }
    return this.prisma.extendedClient.course.findMany({ where: { deleted_at: null } });
  }

  // Lightweight count mirroring the role scoping above (#perf).
  async countAll(tenantId?: string, viewer?: { role?: string; roles?: string[]; userId?: string; includeCompleted?: boolean }) {
    const roles = (viewer?.roles || []).map((r: string) => r.toUpperCase());
    const isAdmin = roles.some((r) => ['SUPERADMIN', 'TENANTADMIN', 'COLLEGE_ADMIN'].includes(r));
    const isTrainer = roles.some((r) => ['PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'INSTRUCTOR', 'TRAINER', 'ASSISTANT', 'GUEST_FACULTY'].includes(r));
    const isStudent = roles.includes('STUDENT');

    const client = this.prisma.extendedClient;
    if (isAdmin || !viewer?.userId) {
      // fall through to tenant-wide count below
    } else if (isTrainer) {
      const rows = await client.courseTrainer.findMany({
        where: { user_id: viewer.userId },
        select: { course_id: true },
      });
      const ids = (rows as any[]).map((r) => r.course_id);
      return { count: await client.course.count({ where: ids.length > 0 ? { id: { in: ids } } : { id: 'none' } }) };
    } else if (isStudent) {
      const rows = await client.enrollment.findMany({
        where: viewer.includeCompleted
          ? { user_id: viewer.userId, status: { in: ['ACTIVE', 'COMPLETED'] } }
          : { user_id: viewer.userId, status: 'ACTIVE' },
        select: { course_id: true },
      });
      const ids = (rows as any[]).map((r) => r.course_id);
      return { count: await client.course.count({ where: ids.length > 0 ? { id: { in: ids } } : { id: 'none' } }) };
    }

    if (tenantId && tenantId !== 'test-tenant' && tenantId !== 'master') {
      return { count: await client.course.count({ where: { tenant_id: tenantId, deleted_at: null } }) };
    }
    return { count: await client.course.count({ where: { deleted_at: null } }) };
  }

  async findOne(id: string) {
    const course = await this.prisma.extendedClient.course.findUnique({
      where: { id }
    });
    // Soft-deleted courses behave as "not found" for every viewer — they're
    // archived, not gone, so grades/enrollments history stays intact.
    if (!course || course.deleted_at) throw new NotFoundException(`Course ${id} not found`);
    return course;
  }

  /**
   * Soft delete (#fix): a course in a real college can't be hard-deleted —
   * enrollments, grades, version history and resources reference it. Deleting
   * flips status to ARCHIVED + sets deleted_at so it disappears from lists but
   * the historical record (grades, certificates) survives.
   */
  async remove(id: string, deletedBy?: string) {
    const course = await this.prisma.extendedClient.course.findUnique({ where: { id } });
    if (!course || course.deleted_at) throw new NotFoundException(`Course ${id} not found`);
    return this.prisma.extendedClient.course.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: deletedBy || course.deleted_by,
        status: CourseStatus.ARCHIVED,
      },
    });
  }

  /**
   * Assign a trainer / teaching assistant to a course (college-admin action).
   * user_id is the Keycloak/LMS user id of the trainer.
   */
  /** Coerce numeric fields (credits, year_of_study) — API clients often send
   *  strings ("4") or empty values; Prisma would 500 on "4" for an Int. */
  private toInt(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }

  async assignTrainer(courseId: string, userId: string, role: string, createdBy: string) {
    const course = await this.prisma.extendedClient.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');
    if (!userId) throw new NotFoundException('user_id is required');

    return this.prisma.extendedClient.courseTrainer.upsert({
      where: { course_id_user_id: { course_id: courseId, user_id: userId } },
      update: { role, updated_by: createdBy },
      create: {
        course_id: courseId,
        user_id: userId,
        role,
        tenant_id: course.tenant_id,
        created_by: createdBy,
      },
    });
  }

  async getTrainers(courseId: string) {
    return this.prisma.extendedClient.courseTrainer.findMany({
      where: { course_id: courseId },
    });
  }
}
