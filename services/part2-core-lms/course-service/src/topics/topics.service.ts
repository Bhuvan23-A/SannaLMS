import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  /** The tenant that owns this topic — from its lesson's module's course, so a
   *  super admin editing a college course never writes into tenant 'master'. */
  async resolveTenant(lessonId: string): Promise<string | null> {
    const l = await this.prisma.extendedClient.lesson.findUnique({
      where: { id: lessonId },
      select: { module: { select: { course: { select: { tenant_id: true } }, subject: { select: { tenant_id: true } } } } },
    });
    return l?.module?.course?.tenant_id || l?.module?.subject?.tenant_id || null;
  }

  create(data: any, tenantId: string) {
    return this.prisma.extendedClient.topic.create({
      data: {
        title: data.title,
        content: data.content,
        lesson_id: data.lesson_id,
        sequence_no: data.sequence_no || 1,
        tenant_id: tenantId,
      },
    });
  }

  findAll(lessonId: string) {
    // Include the asset so the course builder can show which topic already has
    // an uploaded file (name, type, status) instead of hiding it (#fix).
    return this.prisma.extendedClient.topic.findMany({
      where: { lesson_id: lessonId, deleted_at: null },
      include: {
        asset: {
          select: { type: true, status: true, physical_path: true, original_name: true, file_size: true },
        },
      },
    });
  }

  // Soft-delete a topic (its asset/progress stay for audit; reads filter
  // deleted_at so it disappears from the builder immediately).
  async remove(id: string) {
    const existing = await this.prisma.extendedClient.topic.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Topic ${id} not found`);
    return this.prisma.extendedClient.topic.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }
}
