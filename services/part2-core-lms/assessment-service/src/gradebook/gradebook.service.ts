import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class GradebookService {
  constructor(private prisma: PrismaService) {}

  async calculateGrade(tenantId: string, courseId: string, userId: string) {
    // 1. Fetch all quiz submissions
    const quizzes = await this.prisma.quizSubmission.findMany({
      where: { tenant_id: tenantId, user_id: userId, quiz: { course_id: courseId }, is_graded: true }
    });

    // 2. Fetch all assignment submissions
    const assignments = await this.prisma.assignmentSubmission.findMany({
      where: { tenant_id: tenantId, user_id: userId, assignment: { course_id: courseId }, is_graded: true }
    });

    let totalScore = 0;
    let maxScore = 0; // In a real app we'd fetch the max for each from the parent Quiz/Assignment

    quizzes.forEach(q => {
      totalScore += (q.score || 0);
      maxScore += 100; // Mock max
    });

    assignments.forEach(a => {
      totalScore += (a.score || 0);
      maxScore += 100; // Mock max
    });

    let grade = 'F';
    let cgpa = 0;
    if (maxScore > 0) {
      const percentage = (totalScore / maxScore) * 100;
      if (percentage >= 90) { grade = 'A'; cgpa = 4.0; }
      else if (percentage >= 80) { grade = 'B'; cgpa = 3.0; }
      else if (percentage >= 70) { grade = 'C'; cgpa = 2.0; }
      else if (percentage >= 60) { grade = 'D'; cgpa = 1.0; }
    }

    return this.prisma.gradebook.upsert({
      where: {
        course_id_user_id: { course_id: courseId, user_id: userId }
      },
      update: { total_score: totalScore, max_score: maxScore, grade, cgpa },
      create: {
        tenant_id: tenantId,
        course_id: courseId,
        user_id: userId,
        total_score: totalScore,
        max_score: maxScore,
        grade,
        cgpa
      }
    });
  }

  async getGradebook(tenantId: string, courseId: string, userId: string) {
    return this.prisma.gradebook.findUnique({
      where: { course_id_user_id: { course_id: courseId, user_id: userId } }
    });
  }

  async getCourseGrades(tenantId: string, courseId: string) {
    const grades = await this.prisma.gradebook.findMany({
      where: { tenant_id: tenantId, course_id: courseId }
    });
    const byUser = new Map<string, any>(grades.map(g => [g.user_id, g]));

    // Also surface any student who has quiz/assignment submissions for this
    // course but no gradebook row yet (so the trainer can calculate their grade).
    const [quizSubs, assignmentSubs] = await Promise.all([
      this.prisma.quizSubmission.findMany({
        where: { tenant_id: tenantId, quiz: { course_id: courseId } },
        select: { user_id: true }
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { tenant_id: tenantId, assignment: { course_id: courseId } },
        select: { user_id: true }
      })
    ]);
    const submissionUserIds = new Set([...quizSubs.map(s => s.user_id), ...assignmentSubs.map(s => s.user_id)]);
    for (const uid of submissionUserIds) {
      if (!byUser.has(uid)) {
        byUser.set(uid, {
          id: `pending-${uid}`,
          tenant_id: tenantId,
          course_id: courseId,
          user_id: uid,
          total_score: 0,
          max_score: 0,
          grade: null,
          cgpa: null,
          pending: true
        });
      }
    }

    return Array.from(byUser.values());
  }
}
