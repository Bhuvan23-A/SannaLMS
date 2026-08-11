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
        // (instead of "2") don't hit an opaque Prisma 500.
        year: createCourseDto.year != null && createCourseDto.year !== '' ? String(createCourseDto.year) : null,
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
        where: ids.length > 0 ? { id: { in: ids } } : { id: 'none' },
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
        where: ids.length > 0 ? { id: { in: ids } } : { id: 'none' },
      });
    }

    if (tenantId && tenantId !== 'test-tenant' && tenantId !== 'master') {
      return this.prisma.extendedClient.course.findMany({
        where: { tenant_id: tenantId }
      });
    }
    return this.prisma.extendedClient.course.findMany();
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
      return { count: await client.course.count({ where: { tenant_id: tenantId } }) };
    }
    return { count: await client.course.count() };
  }

  async findOne(id: string) {
    const course = await this.prisma.extendedClient.course.findUnique({
      where: { id }
    });
    if (!course) throw new NotFoundException(`Course ${id} not found`);
    return course;
  }

  async remove(id: string) {
    return this.prisma.extendedClient.course.delete({ where: { id } });
  }

  /**
   * Assign a trainer / teaching assistant to a course (college-admin action).
   * user_id is the Keycloak/LMS user id of the trainer.
   */
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
