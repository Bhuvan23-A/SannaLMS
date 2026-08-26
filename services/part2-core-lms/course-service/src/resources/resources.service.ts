import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async createResource(courseId: string, tenantId: string, file: Express.Multer.File, title?: string, visibility?: string, assignedTo?: any) {
    if (!file) throw new NotFoundException('No file uploaded');
    const assignedToString = assignedTo ? (typeof assignedTo === 'object' ? JSON.stringify(assignedTo) : String(assignedTo)) : null;
    return this.prisma.courseResource.create({
      data: {
        tenant_id: tenantId,
        course_id: courseId,
        title: title || file.originalname || 'Resource',
        file_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        content_type: file.mimetype,
        visibility: visibility || 'ALL',
        assigned_to: assignedToString,
      },
    });
  }

  async listResources(courseId: string, isStudent?: boolean) {
    const where: any = { course_id: courseId };
    // Students only see resources marked STUDENT_ONLY or ALL; staff see everything
    if (isStudent) {
      where.visibility = { in: ['ALL', 'STUDENT_ONLY'] };
    }
    return this.prisma.courseResource.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
  }

  async getResource(id: string) {
    const resource = await this.prisma.courseResource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }

  async removeResource(id: string) {
    const existing = await this.prisma.courseResource.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Resource not found');
    await this.prisma.courseResource.delete({ where: { id } });
    return { deleted: true, id };
  }
}
