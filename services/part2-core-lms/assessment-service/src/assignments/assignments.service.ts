import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService) {}

  async createAssignment(data: Record<string, any>, tenantId: string) {
    const assignmentData: any = {
      tenant_id: tenantId,
      course_id: data.course_id,
      title: data.title,
      description: data.description,
      due_date: data.due_date ? new Date(data.due_date) : null,
      max_marks: data.max_marks || 100
    };
    // assigned_to: { type: 'ALL' } or { type: 'INDIVIDUALS', user_ids: [...] } — stored as a JSON string
    // (Prisma Json fields reject null, so only set when provided — same pattern as question options)
    if (data.assigned_to) {
      assignmentData.assigned_to = JSON.stringify(data.assigned_to);
    }
    return this.prisma.assignment.create({
      data: assignmentData
    });
  }

  async getAssignments(tenantId: string, courseId?: string, viewer?: { role?: string; roles?: string[]; userId?: string }) {
    const whereClause: any = { tenant_id: tenantId };
    if (courseId) {
      whereClause.course_id = courseId;
    }
    const assignments = await this.prisma.assignment.findMany({
      where: whereClause
    });
    const isStudent = (viewer?.roles || []).some((r: string) => r.toUpperCase() === 'STUDENT');
    // Students only see assignments assigned to them (whole-course or individually)
    if (isStudent) {
      return assignments.filter((a: any) => {
        const target = parseAssignedTo(a.assigned_to);
        if (!target || target.type === 'ALL') return true;
        return Array.isArray(target.user_ids) && target.user_ids.includes(viewer?.userId || '');
      });
    }
    return assignments;
  }

  // Submissions for an assignment — used by trainers/college admins to review student work (#13)
  async getAssignmentSubmissions(assignmentId: string) {
    return this.prisma.assignmentSubmission.findMany({
      where: { assignment_id: assignmentId },
      orderBy: { submitted_at: 'desc' }
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

function parseAssignedTo(value: any): { type?: string; user_ids?: string[] } | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}
