import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class QuizzesService {
  constructor(private prisma: PrismaService) {}

  async createQuiz(data: Record<string, any>, tenantId: string) {
    const hasQuestionIds = Array.isArray(data.question_ids) && data.question_ids.length > 0;
    const hasInlineQuestions = Array.isArray(data.questions) && data.questions.length > 0;
    if (!hasQuestionIds && !hasInlineQuestions) {
      throw new BadRequestException('A quiz must contain at least one question.');
    }

    const quizData: any = {
      tenant_id: tenantId,
      course_id: data.course_id,
      title: data.title,
      description: data.description,
      duration_mins: data.duration_mins,
      is_published: data.is_published || false
    };
    if (data.start_time) quizData.start_time = new Date(data.start_time);
    if (data.end_time) quizData.end_time = new Date(data.end_time);
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

  // courseIds = the viewer's enrolled course ids (students only). The student
  // frontend passes them explicitly because enrollment lives in course-service;
  // without them a student would see every quiz in the college, including ones
  // for courses they are not enrolled in (#scoping).
  async getQuizzes(tenantId: string, courseId: string, viewer?: { role?: string; roles?: string[]; userId?: string }, courseIds?: string[]) {
    const where: any = { tenant_id: tenantId };
    if (courseId) where.course_id = courseId;
    const quizzes = await this.prisma.quiz.findMany({
      where,
      include: { questions: { include: { question: true } } }
    });
    // Every Keycloak user carries the realm-default 'student' role, so staff
    // (admins/trainers) must be excluded from the student branch or they'd get
    // the student-scoped (assigned-to) view instead of the full list.
    const upRoles = (viewer?.roles || []).map((r: string) => r.toUpperCase());
    const isStaff = upRoles.some((r) => ['SUPERADMIN', 'TENANTADMIN', 'COLLEGE_ADMIN', 'PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'INSTRUCTOR', 'TRAINER', 'ASSISTANT', 'GUEST_FACULTY'].includes(r));
    const isStudent = upRoles.includes('STUDENT') && !isStaff;
    // Students only see quizzes for courses they are enrolled in (courseIds) and
    // that are assigned to them (whole-course or individually). No courseIds =
    // no quizzes — never leak the whole college's list.
    // Schedule filtering: students only see quizzes that have started (or have
    // no start_time) and have not yet ended (or have no end_time). Staff always
    // see all quizzes so they can manage scheduling.
    const now = new Date();
    const visible = isStudent
      ? quizzes
          .filter((q: any) => {
            if (!courseIds || courseIds.length === 0) return false;
            if (!courseIds.includes(q.course_id)) return false;
            // Schedule gating for students
            if (q.start_time && new Date(q.start_time) > now) return false;
            if (q.end_time && new Date(q.end_time) < now) return false;
            const a = parseAssignedTo(q.assigned_to);
            if (!a || a.type === 'ALL') return true;
            return Array.isArray(a.user_ids) && a.user_ids.includes(viewer?.userId || '');
          })
      : quizzes;
    // Attach the student's own submission state so the quiz list can show
    // "Completed" and block retakes without trusting localStorage (#retake).
    let mySubmissions = new Map<string, any>();
    if (isStudent && visible.length > 0) {
      const subs = await this.prisma.quizSubmission.findMany({
        where: { quiz_id: { in: visible.map((q: any) => q.id) }, user_id: viewer?.userId || '' }
      });
      mySubmissions = new Map(subs.map((s: any) => [s.quiz_id, s]));
    }
    // Normalize the nested question.options (stored as a JSON string) to arrays
    // so the quiz-taking UI can render them without crashing.
    return visible.map((quiz: any) => {
      const sub = mySubmissions.get(quiz.id);
      return {
        ...quiz,
        my_submission: sub ? {
          submitted: true,
          score: sub.score,
          is_graded: sub.is_graded,
          submitted_at: sub.submitted_at,
        } : null,
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
        })),
      };
    });
  }

  // Submissions for a quiz — used by trainers/college admins to review student
  // scores (#10). Includes the quiz's questions so the trainer can see exactly
  // what each essay/coding answer was answering before grading it.
  async getQuizSubmissions(quizId: string) {
    const quizQuestions = await this.prisma.quizQuestion.findMany({
      where: { quiz_id: quizId },
      include: { question: true },
      orderBy: { order: 'asc' }
    });
    const submissions = await this.prisma.quizSubmission.findMany({
      where: { quiz_id: quizId },
      orderBy: { submitted_at: 'desc' }
    });
    return {
      questions: quizQuestions.map((qq: any) => ({
        question_id: qq.question_id,
        type: qq.question?.type || 'MCQ',
        title: qq.question?.title || '',
        content: qq.question?.content || '',
        marks: qq.question?.marks || 0,
        image_url: qq.question?.image_url || null,
      })),
      submissions: submissions.map((s: any) => ({
        ...s,
        answers: normalizeAnswers(s.answers),
      })),
    };
  }

  // Manual grading for essay/coding answers — trainers release a score + feedback
  // so the gradebook can pick the submission up (is_graded flips to true).
  async gradeQuizSubmission(submissionId: string, score: number, feedback: string) {
    if (score === undefined || score === null || isNaN(Number(score))) {
      throw new BadRequestException('A valid score is required');
    }
    try {
      return await this.prisma.quizSubmission.update({
        where: { id: submissionId },
        data: { score: Number(score), feedback: feedback || null, is_graded: true }
      });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException('Quiz submission not found');
      }
      throw err;
    }
  }

  // Delete a quiz — quizQuestion links and quiz submissions cascade with it
  // (onDelete: Cascade), so a wrongly-created quiz is removed cleanly (#fix).
  async deleteQuiz(quizId: string) {
    try {
      await this.prisma.quiz.delete({ where: { id: quizId } });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        throw new NotFoundException('Quiz not found');
      }
      throw err;
    }
    return { removed: true, id: quizId };
  }

  async submitQuiz(quizId: string, answers: any, userId: string, tenantId: string, proctoring?: any) {
    // 1. One attempt per student per quiz — retakes are not allowed (#retake).
    const existing = await this.prisma.quizSubmission.findFirst({
      where: { quiz_id: quizId, user_id: userId }
    });
    if (existing) {
      throw new ConflictException('You have already submitted this quiz — retakes are not allowed.');
    }

    // 2. Check schedule: block submissions after end_time
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.end_time && new Date(quiz.end_time) < new Date()) {
      throw new BadRequestException('This quiz has ended and no longer accepts submissions.');
    }
    if (quiz.start_time && new Date(quiz.start_time) > new Date()) {
      throw new BadRequestException('This quiz has not started yet.');
    }

    // 3. Get Quiz and Questions
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

    // 4. Save Submission
    const proctoringSummary = proctoring && typeof proctoring === 'object' ? proctoring : null;
    return this.prisma.quizSubmission.create({
      data: {
        quiz_id: quizId,
        user_id: userId,
        tenant_id: tenantId,
        answers: answers,
        score: needsManualGrading ? null : score,
        is_graded: !needsManualGrading,
        violation_count: Number(proctoringSummary?.violation_count) || 0,
        auto_submitted: Boolean(proctoringSummary?.auto_submitted),
        proctoring: proctoringSummary || undefined,
      }
    });
  }

  /**
   * The student's quiz-score standing vs every other graded student in the
   * college. Each graded submission is normalised to a percentage (score /
   * quiz max marks), then averaged per student — the returned percentile is
   * the share of students the current user outperforms (0-100). Powers the
   * "Adaptive Score Rank" card in the student command center.
   */
  async myScorePercentile(tenantId: string, userId: string) {
    const subs = await this.prisma.quizSubmission.findMany({
      where: { tenant_id: tenantId, is_graded: true, score: { not: null } },
      include: { quiz: { include: { questions: { include: { question: true } } } } },
    });

    const studentAverages: Record<string, number[]> = {};
    for (const s of subs) {
      const maxMarks = s.quiz?.questions?.reduce((sum: number, qq: any) => sum + (qq.question?.marks || 0), 0) || 0;
      if (maxMarks <= 0) continue;
      const pct = Math.min(100, Math.max(0, ((s.score || 0) / maxMarks) * 100));
      if (!studentAverages[s.user_id]) studentAverages[s.user_id] = [];
      studentAverages[s.user_id].push(pct);
    }

    const myPcts = studentAverages[userId] || [];
    if (myPcts.length === 0) {
      return { percentile: null, attempts: 0, total_students: Object.keys(studentAverages).length };
    }
    const myAvg = myPcts.reduce((a, b) => a + b, 0) / myPcts.length;

    let betterOrEqual = 0;
    const others: number[] = [];
    for (const [uid, pcts] of Object.entries(studentAverages)) {
      if (uid === userId) continue;
      const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
      others.push(avg);
      if (avg <= myAvg) betterOrEqual += 1;
    }
    const total = others.length + 1;
    const percentile = Math.round((betterOrEqual / total) * 100);
    return { percentile, attempts: myPcts.length, total_students: total };
  }
}

function parseAssignedTo(value: any): { type?: string; user_ids?: string[] } | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

function normalizeAnswers(answers: any): Record<string, any> {
  if (!answers) return {};
  if (typeof answers === 'string') {
    try { return JSON.parse(answers); } catch { return {}; }
  }
  return answers;
}
