import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async createAssignment(data: Record<string, any>, tenantId: string) {
    return this.prisma.assignment.create({
      data: {
        tenant_id: tenantId,
        course_id: data.course_id,
        title: data.title,
        description: data.description,
        due_date: data.due_date ? new Date(data.due_date) : null,
        max_marks: data.max_marks || 100
      }
    });
  }

  async getAssignments(tenantId: string, courseId: string) {
    return this.prisma.assignment.findMany({
      where: { tenant_id: tenantId, course_id: courseId }
    });
  }

  async submitAssignment(assignmentId: string, data: Record<string, any>, userId: string, tenantId: string) {
    return this.prisma.assignmentSubmission.create({
      data: {
        assignment_id: assignmentId,
        user_id: userId,
        tenant_id: tenantId,
        file_url: data.file_url,
        text_content: data.text_content
      }
    });
  }

  async gradeAssignment(submissionId: string, score: number, feedback: string) {
    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { score, feedback, is_graded: true }
    });
  }
}
