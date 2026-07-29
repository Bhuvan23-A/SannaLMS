import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async createQuiz(data: Record<string, any>, tenantId: string) {
    const quiz = await this.prisma.quiz.create({
      data: {
        tenant_id: tenantId,
        course_id: data.course_id,
        title: data.title,
        description: data.description,
        duration_mins: data.duration_mins,
        is_published: data.is_published || false
      }
    });

    if (data.question_ids && Array.isArray(data.question_ids)) {
      await this.prisma.quizQuestion.createMany({
        data: data.question_ids.map((id, index) => ({
          quiz_id: quiz.id,
          question_id: id,
          order: index
        }))
      });
    }

    return quiz;
  }

  async getQuizzes(tenantId: string, courseId: string) {
    return this.prisma.quiz.findMany({
      where: { tenant_id: tenantId, course_id: courseId },
      include: { questions: true }
    });
  }

  async submitQuiz(quizId: string, answers: any, userId: string, tenantId: string) {
    // 1. Get Quiz and Questions
    const quizQuestions = await this.prisma.quizQuestion.findMany({
      where: { quiz_id: quizId },
      include: { question: true }
    });

    let score = 0;
    let maxScore = 0;
    let needsManualGrading = false;

    // 2. Auto-grading for MCQs
    for (const qq of quizQuestions) {
      maxScore += qq.question.marks;
      const userAnswer = answers[qq.question_id];
      if (qq.question.type === 'MCQ') {
        const options: any = qq.question.options;
        const correctOption = options?.find((o: any) => o.isCorrect);
        if (correctOption && String(correctOption.id) === String(userAnswer)) {
          score += qq.question.marks;
        }
      } else {
        needsManualGrading = true; // Essays and Coding need manual/complex grading later
      }
    }

    // 3. Save Submission
    return this.prisma.quizSubmission.create({
      data: {
        quiz_id: quizId,
        user_id: userId,
        tenant_id: tenantId,
        answers: answers,
        score: needsManualGrading ? null : score,
        is_graded: !needsManualGrading
      }
    });
  }
}
