import { Injectable } from '@nestjs/common';
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
      where: { lesson_id: lessonId }
    });
  }
}
