import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Roles } from '../roles.guard';

/**
 * Internal endpoint called by college-service during a college hard-delete.
 * Permanently removes every row belonging to a tenant from this service's DB.
 * Only reachable by super admins (internal calls pass x-mock-roles).
 */
@Controller('api/v1/admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  @Post('purge-tenant')
  @Roles('SUPER_ADMIN')
  async purgeTenant(@Body() body: { tenant_id?: string }) {
    const tenantId = body?.tenant_id;
    if (!tenantId) throw new BadRequestException('tenant_id is required');

    const results: Record<string, number> = {};
    const del = async (model: any, key: string) => {
      try {
        const r = await model.deleteMany({ where: { tenant_id: tenantId } });
        results[key] = r.count;
      } catch {
        results[key] = -1; // FK order slip or missing column — reported, not fatal
      }
    };

    const db = this.prisma.extendedClient;
    // Children before parents so FK constraints hold.
    await del(db.videoProgress, 'videoProgress');
    await del(db.quizProgress, 'quizProgress');
    await del(db.topicProgress, 'topicProgress');
    await del(db.videoMetadata, 'videoMetadata');
    await del(db.assetMetadata, 'assetMetadata');
    await del(db.topic, 'topics');
    await del(db.lesson, 'lessons');
    await del(db.module, 'modules');
    await del(db.courseResource, 'courseResources');
    await del(db.courseTrainer, 'courseTrainers');
    await del(db.enrollment, 'enrollments');
    await del(db.coursePrerequisite, 'coursePrerequisites');
    await del(db.courseVersionHistory, 'courseVersionHistory');
    await del(db.promotion, 'promotions');
    await del(db.course, 'courses');

    return { tenant_id: tenantId, results };
  }
}
