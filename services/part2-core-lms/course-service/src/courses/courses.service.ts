import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a course — in stage-2 terms, a COURSE OFFERING: an instance of a
   * Subject taught to a Section (cohort). When subject_id is given the title,
   * subject code and credits inherit from the catalog subject; when section_id
   * is given the org targeting (branch/department/year-of-study/semester) is
   * mirrored from the section, and every roster member is auto-enrolled.
   * Legacy payloads (title + optional org fields, no subject/section) still work.
   */
  async create(createCourseDto: any, tenantId: string) {
    let subject: any = null;
    if (createCourseDto.subject_id) {
      subject = await this.prisma.extendedClient.subject.findFirst({
        where: { id: createCourseDto.subject_id, deleted_at: null },
      });
      if (!subject) throw new NotFoundException('Subject not found');
    }

    const sectionId = createCourseDto.section_id || null;
    if (subject && sectionId) {
      // One offering per subject per section.
      const clash = await this.prisma.extendedClient.course.findFirst({
        where: { subject_id: subject.id, section_id: sectionId, deleted_at: null },
      });
      if (clash) {
        throw new BadRequestException(`This subject is already offered to this section (${clash.title})`);
      }
    }

    const title = createCourseDto.title?.trim() || subject?.name;
    if (!title) throw new BadRequestException('title is required (or provide a subject_id)');

    const course = await this.prisma.extendedClient.course.create({
      data: {
        title,
        description: createCourseDto.description || subject?.description || null,
        status: createCourseDto.status || CourseStatus.DRAFT,
        tenant_id: tenantId,
        department_id: createCourseDto.department_id ?? subject?.department_id ?? null,
        branch_id: createCourseDto.branch_id ?? subject?.branch_id ?? null,
        semester_id: createCourseDto.semester_id || null,
        // year is a String column — coerce numbers so API clients sending 2
        // (instead of "2") don't hit an opaque Prisma 500. DEPRECATED.
        year: createCourseDto.year != null && createCourseDto.year !== '' ? String(createCourseDto.year) : null,
        // Stage-1 college-accurate fields (mirrored from subject/section).
        subject_code: createCourseDto.subject_code ?? subject?.code ?? null,
        credits: this.toInt(createCourseDto.credits ?? subject?.credits),
        section: createCourseDto.section?.trim() || null,
        academic_session: createCourseDto.academic_session?.trim() || null,
        year_of_study: this.toInt(createCourseDto.year_of_study),
        // Stage-2 structured pointers.
        subject_id: subject?.id || null,
        section_id: sectionId,
        semester_number: this.toInt(createCourseDto.semester_number),
      },
    });

    // Auto-enroll every roster member of the section into this new offering.
    if (sectionId) {
      const members = await this.prisma.extendedClient.sectionMembership.findMany({
        where: { section_id: sectionId, status: 'ACTIVE', deleted_at: null },
        select: { user_id: true },
      });
      for (const m of members) {
        const existing = await this.prisma.extendedClient.enrollment.findUnique({
          where: { user_id_course_id: { user_id: m.user_id, course_id: course.id } },
        });
        if (!existing) {
          await this.prisma.extendedClient.enrollment.create({
            data: {
              user_id: m.user_id,
              course_id: course.id,
              tenant_id: tenantId,
              auto_enrolled: true,
              section_id: sectionId,
            },
          });
        }
      }
    }

    return course;
  }

  async update(id: string, data: any) {
    // Validate status up front so a bad value returns a clear 400 instead of a
    // raw Prisma enum error (500) (#fix).
    if (data.status !== undefined && data.status !== null && !['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'].includes(String(data.status))) {
      throw new BadRequestException('Invalid status — must be DRAFT, IN_REVIEW, PUBLISHED or ARCHIVED');
    }
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
        subject_id: data.subject_id !== undefined ? (data.subject_id || null) : undefined,
        section_id: data.section_id !== undefined ? (data.section_id || null) : undefined,
        semester_number: data.semester_number !== undefined ? this.toInt(data.semester_number) : undefined,
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
        // version_number is unique per course — use the NEXT number, otherwise
        // re-publishing (unpublish -> publish) hits the unique key with the
        // same version and 500s (#fix).
        const latest = await this.prisma.extendedClient.courseVersionHistory.findFirst({
          where: { course_id: id },
          orderBy: { version_number: 'desc' },
          select: { version_number: true },
        });
        await this.prisma.extendedClient.courseVersionHistory.create({
          data: {
            course_id: id,
            version_number: (latest?.version_number ?? 0) + 1,
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
        include: { subject: true },
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
        include: { subject: true },
      });
    }

    if (tenantId && tenantId !== 'test-tenant' && tenantId !== 'master') {
      return this.prisma.extendedClient.course.findMany({
        where: { tenant_id: tenantId, deleted_at: null },
        include: { subject: true },
      });
    }
    return this.prisma.extendedClient.course.findMany({
      where: { deleted_at: null },
      include: { subject: true },
    });
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
      where: { id },
      include: { subject: true },
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
