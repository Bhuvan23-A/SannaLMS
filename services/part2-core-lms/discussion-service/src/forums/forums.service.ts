import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ForumsService {
  constructor(private prisma: PrismaService) {}

  async createForum(data: Record<string, any>, tenantId: string) {
    return this.prisma.forum.create({
      data: {
        tenant_id: tenantId,
        course_id: data.course_id,
        title: data.title,
        description: data.description,
      }
    });
  }

  async getForums(tenantId: string, courseId?: string) {
    return this.prisma.forum.findMany({
      where: {
        tenant_id: tenantId,
        ...(courseId ? { course_id: courseId } : {})
      }
    });
  }
}
