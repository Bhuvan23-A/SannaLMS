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

  async findAll(tenantId?: string) {
    if (tenantId && tenantId !== 'test-tenant' && tenantId !== 'master') {
      return this.prisma.extendedClient.course.findMany({
        where: { tenant_id: tenantId }
      });
    }
    return this.prisma.extendedClient.course.findMany();
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
