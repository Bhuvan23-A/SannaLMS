import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Roles } from '../roles.guard';

/**
 * Internal endpoint called by college-service during a college hard-delete.
 * Permanently removes every row belonging to a tenant from this service's DB.
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
        results[key] = -1;
      }
    };

    // Children before parents so FK constraints hold.
    await del(this.prisma.quizSubmission, 'quizSubmissions');
    await del(this.prisma.assignmentSubmission, 'assignmentSubmissions');
    // QuizQuestion has no tenant_id column — scope via its quiz/question parents.
    try {
      const qq = await this.prisma.quizQuestion.deleteMany({
        where: { OR: [{ quiz: { tenant_id: tenantId } }, { question: { tenant_id: tenantId } }] },
      });
      results.quizQuestions = qq.count;
    } catch {
      results.quizQuestions = -1;
    }
    await del(this.prisma.gradebook, 'gradebook');
    await del(this.prisma.assignment, 'assignments');
    await del(this.prisma.quiz, 'quizzes');
    await del(this.prisma.question, 'questions');

    return { tenant_id: tenantId, results };
  }
}
