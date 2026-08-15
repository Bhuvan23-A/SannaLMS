import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  /** The tenant that owns this lesson — from its module's course/subject, so a
   *  super admin editing a college course never writes into tenant 'master'. */
  async resolveTenant(moduleId: string): Promise<string | null> {
    const m = await this.prisma.extendedClient.module.findUnique({
      where: { id: moduleId },
      select: { course: { select: { tenant_id: true } }, subject: { select: { tenant_id: true } } },
    });
    return m?.course?.tenant_id || m?.subject?.tenant_id || null;
  }

  create(data: any, tenantId: string) {
    return this.prisma.extendedClient.lesson.create({
      data: {
        title: data.title,
        module_id: data.module_id,
        sequence_no: data.sequence_no || 1,
        tenant_id: tenantId,
      },
    });
  }

  findAll(moduleId: string) {
    return this.prisma.extendedClient.lesson.findMany({
      where: { module_id: moduleId, deleted_at: null }
    });
  }

  // Soft-delete a lesson (topics stay for audit; reads filter deleted_at).
  async remove(id: string) {
    const existing = await this.prisma.extendedClient.lesson.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Lesson ${id} not found`);
    return this.prisma.extendedClient.lesson.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
