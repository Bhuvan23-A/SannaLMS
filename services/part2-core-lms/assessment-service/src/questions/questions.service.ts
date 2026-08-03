import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async createQuestion(data: Record<string, any>, tenantId: string) {
    return this.prisma.question.create({
      data: {
        tenant_id: tenantId,
        course_id: data.course_id,
        type: data.type,
        title: data.title,
        content: data.content,
        marks: data.marks || 1,
        options: data.options || null,
        answer_key: data.answer_key || null
      }
    });
  }

  async getQuestions(tenantId: string, courseId: string) {
    return this.prisma.question.findMany({
      where: { tenant_id: tenantId, course_id: courseId }
    });
  }
}
