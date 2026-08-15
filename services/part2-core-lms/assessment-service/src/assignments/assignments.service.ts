import { Injectable, NotFoundException } from '@nestjs/common';
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
    // Every Keycloak user carries the realm-default 'student' role, so staff
    // (admins/trainers) must be excluded from the student branch or they'd get
    // the student-scoped (assigned-to) view instead of the full list.
    const upRoles = (viewer?.roles || []).map((r: string) => r.toUpperCase());
    const isStaff = upRoles.some((r) => ['SUPERADMIN', 'TENANTADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'INSTRUCTOR', 'TRAINER', 'ASSISTANT', 'GUEST_FACULTY'].includes(r));
    const isStudent = upRoles.includes('STUDENT') && !isStaff;
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
    // One submission per student per assignment — resubmitting updates the
    // existing row (with a fresh submitted_at) instead of duplicating it.
    return this.prisma.assignmentSubmission.upsert({
      where: { assignment_id_user_id: { assignment_id: assignmentId, user_id: userId } },
      create: {
        assignment_id: assignmentId,
        user_id: userId,
        tenant_id: tenantId,
        file_url: data.file_url,
        text_content: data.text_content
      },
      update: {
        file_url: data.file_url,
        text_content: data.text_content,
        submitted_at: new Date(),
        // A resubmission resets the grade so the trainer re-evaluates it
        score: null,
        feedback: null,
        is_graded: false
      }
    });
  }

  // The student's own submission for an assignment, including the trainer's
  // score + feedback once graded — powers the "My Submission & Marks" view.
  async getMySubmission(assignmentId: string, userId: string) {
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { assignment_id_user_id: { assignment_id: assignmentId, user_id: userId } }
    });
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    return {
      assignment: assignment
        ? { id: assignment.id, title: assignment.title, max_marks: assignment.max_marks, due_date: assignment.due_date }
        : null,
      submission: submission || null
    };
  }

  async gradeAssignment(submissionId: string, score: number, feedback: string) {
    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: { score, feedback, is_graded: true }
    });
  }

  // Delete an assignment — its submissions cascade with it (onDelete: Cascade),
  // so a wrongly-created assignment is removed cleanly (#fix).
  async deleteAssignment(assignmentId: string) {
    try {
      await this.prisma.assignment.delete({ where: { id: assignmentId } });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException('Assignment not found');
      }
      throw err;
    }
    return { removed: true, id: assignmentId };
  }
}

function parseAssignedTo(value: any): { type?: string; user_ids?: string[] } | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}
