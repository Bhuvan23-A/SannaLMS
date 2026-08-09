import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async createResource(courseId: string, tenantId: string, file: Express.Multer.File, title?: string) {
    if (!file) throw new NotFoundException('No file uploaded');
    return this.prisma.courseResource.create({
      data: {
        tenant_id: tenantId,
        course_id: courseId,
        title: title || file.originalname || 'Resource',
        file_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        content_type: file.mimetype,
      },
    });
  }

  async listResources(courseId: string) {
    return this.prisma.courseResource.findMany({
      where: { course_id: courseId },
      orderBy: { created_at: 'desc' },
    });
  }

  async removeResource(id: string) {
    const existing = await this.prisma.courseResource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Resource not found');
    await this.prisma.courseResource.delete({ where: { id } });
    return { deleted: true, id };
  }
}
