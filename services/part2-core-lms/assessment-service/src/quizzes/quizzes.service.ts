import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async createQuiz(data: Record<string, any>, tenantId: string) {
    const quizData: any = {
      tenant_id: tenantId,
      course_id: data.course_id,
      title: data.title,
      description: data.description,
      duration_mins: data.duration_mins,
      is_published: data.is_published || false
    };
    // assigned_to: { type: 'ALL' } or { type: 'INDIVIDUALS', user_ids: [...] } — stored as a JSON string
    // (Prisma Json fields reject null, so only set when provided — same pattern as question options)
    if (data.assigned_to) {
      quizData.assigned_to = JSON.stringify(data.assigned_to);
    }
    const quiz = await this.prisma.quiz.create({
      data: quizData
    });

    // Guard against empty selection — Prisma throws on createMany with an empty array
    if (data.question_ids && Array.isArray(data.question_ids) && data.question_ids.length > 0) {
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

  async getQuizzes(tenantId: string, courseId: string, viewer?: { role?: string; roles?: string[]; userId?: string }) {
    const quizzes = await this.prisma.quiz.findMany({
      where: { tenant_id: tenantId, course_id: courseId },
      include: { questions: { include: { question: true } } }
    });
    const isStudent = (viewer?.roles || []).some((r: string) => r.toUpperCase() === 'STUDENT');
    // Students only see quizzes assigned to them (whole-course or individually)
    const visible = isStudent
      ? quizzes.filter((q: any) => {
          const a = parseAssignedTo(q.assigned_to);
          if (!a || a.type === 'ALL') return true;
          return Array.isArray(a.user_ids) && a.user_ids.includes(viewer?.userId || '');
        })
      : quizzes;
    // Normalize the nested question.options (stored as a JSON string) to arrays
    // so the quiz-taking UI can render them without crashing.
    return visible.map((quiz: any) => ({
      ...quiz,
      questions: (quiz.questions || []).map((qq: any) => ({
        ...qq,
        question: qq.question ? {
          ...qq.question,
          // The quiz-taking UI renders question.text — the model stores it as
          // content/title, so expose it here (and always as a string).
          text: String(qq.question.content || qq.question.title || ''),
          options: typeof qq.question.options === 'string'
            ? (() => { try { const p = JSON.parse(qq.question.options); return Array.isArray(p) ? p : []; } catch { return []; } })()
            : (qq.question.options || [])
        } : qq.question
      }))
    }));
  }

  // Submissions for a quiz — used by trainers/college admins to review student scores (#10)
  async getQuizSubmissions(quizId: string) {
    return this.prisma.quizSubmission.findMany({
      where: { quiz_id: quizId },
      orderBy: { submitted_at: 'desc' }
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
        // options is stored as a JSON string in the DB — normalize before grading
        const options: any = typeof qq.question.options === 'string'
          ? (() => { try { const p = JSON.parse(qq.question.options); return Array.isArray(p) ? p : []; } catch { return []; } })()
          : (qq.question.options || []);
        const norm = (v: any) => String(v ?? '').trim().toLowerCase();
        let correct = false;
        const correctOption = options?.find((o: any) => o && o.isCorrect);
        if (correctOption) {
          // Object form [{ id, text, isCorrect }] — match by option id or by text
          correct = norm(correctOption.id) === norm(userAnswer)
            || (norm(correctOption.text) !== '' && norm(correctOption.text) === norm(userAnswer));
        } else if (qq.question.answer_key) {
          // Fallback: answer_key is either a 1-based option index ("3") or literal option text
          const key = String(qq.question.answer_key).trim();
          const idx = parseInt(key, 10);
          if (!Number.isNaN(idx) && idx >= 1 && idx <= options.length) {
            const target = options[idx - 1];
            const targetId = target && typeof target === 'object' ? String(target.id) : String(idx);
            const targetText = typeof target === 'string' ? target : (target?.text ?? '');
            correct = norm(userAnswer) === norm(targetId)
              || (norm(targetText) !== '' && norm(userAnswer) === norm(targetText));
          } else {
            correct = norm(userAnswer) === norm(key);
          }
        }
        if (correct) {
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

function parseAssignedTo(value: any): { type?: string; user_ids?: string[] } | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}
