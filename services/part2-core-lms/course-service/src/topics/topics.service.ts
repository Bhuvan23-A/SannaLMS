import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.extendedClient.topic.findMany({
      where: { lesson_id: lessonId, deleted_at: null }
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
