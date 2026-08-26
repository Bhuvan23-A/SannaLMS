import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ResourcesService {
  constructor(private prisma: PrismaService) {}

  async createResource(
    courseId: string,
    tenantId: string,
    file?: Express.Multer.File,
    title?: string,
    visibility?: string,
    assignedTo?: any,
    linkUrl?: string
  ) {
    if (!file && !linkUrl) throw new NotFoundException('No file uploaded or link provided');
    const assignedToString = assignedTo ? (typeof assignedTo === 'object' ? JSON.stringify(assignedTo) : String(assignedTo)) : null;

    if (linkUrl && !file) {
      let fileName = 'Google Drive Link';
      if (linkUrl.includes('drive.google.com') || linkUrl.includes('docs.google.com')) {
        fileName = 'Google Drive Resource';
      } else {
        try {
          const u = new URL(linkUrl);
          fileName = u.hostname;
        } catch {
          fileName = 'Cloud Link';
        }
      }

      return this.prisma.courseResource.create({
        data: {
          tenant_id: tenantId,
          course_id: courseId,
          title: title || fileName,
          file_name: fileName,
          file_path: linkUrl,
          file_size: 0,
          content_type: 'link',
          visibility: visibility || 'ALL',
          assigned_to: assignedToString,
          link_url: linkUrl,
        },
      });
    }

    return this.prisma.courseResource.create({
      data: {
        tenant_id: tenantId,
        course_id: courseId,
        title: title || file!.originalname || 'Resource',
        file_name: file!.originalname,
        file_path: file!.path,
        file_size: file!.size,
        content_type: file!.mimetype,
        visibility: visibility || 'ALL',
        assigned_to: assignedToString,
        link_url: linkUrl || null,
      },
    });
  }

  async listResources(courseId: string, isStudent?: boolean, userId?: string) {
    const where: any = { course_id: courseId };
    // Students only see resources marked STUDENT_ONLY or ALL; staff see everything
    if (isStudent) {
      where.visibility = { in: ['ALL', 'STUDENT_ONLY'] };
      const resources = await this.prisma.courseResource.findMany({
        where,
        orderBy: { created_at: 'desc' },
      });

      return resources.filter((r: any) => {
        if (!r.assigned_to) return true;
        try {
          const target = typeof r.assigned_to === 'string' ? JSON.parse(r.assigned_to) : r.assigned_to;
          if (!target || target.type === 'ALL') return true;
          if (target.type === 'INDIVIDUALS' && Array.isArray(target.user_ids)) {
            return target.user_ids.includes(userId || '');
          }
        } catch {
          return true;
        }
        return false;
      });
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
