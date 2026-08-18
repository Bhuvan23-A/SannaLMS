import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import pdfParse from 'pdf-parse-new';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  async createQuestion(data: Record<string, any>, tenantId: string) {
    const titleStr = data.title || data.text || 'Question';
    const contentStr = data.content || data.text || 'Question Content';
    const createData: any = {
      tenant_id: tenantId,
      course_id: data.course_id || data.courseId || 'c-1',
      subject_id: data.subject_id || data.subjectId || null,
      // Org-hierarchy scoping: department/branch/semester the question belongs to
      department_id: data.department_id || data.departmentId || null,
      branch_id: data.branch_id || data.branchId || null,
      semester_id: data.semester_id || data.semesterId || null,
      type: data.type || 'MCQ',
      title: titleStr,
      content: contentStr,
      marks: data.marks || 1,
      answer_key: data.answer_key || data.answerKey || (data.correctOption !== undefined ? String(data.correctOption) : null),
      image_url: data.image_url || data.imageUrl || null
    };
    if (data.options) {
      // Prisma Json fields reject null — only set options when provided
      createData.options = typeof data.options === 'string' ? data.options : JSON.stringify(data.options);
    }
    return this.prisma.question.create({ data: createData });
  }

  async updateQuestion(id: string, data: Record<string, any>, tenantId?: string) {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Question not found');
    }
    // Tenant isolation (#fix): non-super-admins may only touch questions in
    // their own college — a trainer from college A can't edit college B's bank.
    if (tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' && existing.tenant_id !== tenantId) {
      throw new ForbiddenException('You can only edit questions in your own college');
    }
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.marks !== undefined) updateData.marks = Number(data.marks) || 1;
    if (data.answer_key !== undefined) updateData.answer_key = data.answer_key;
    if (data.course_id !== undefined) updateData.course_id = data.course_id;
    if (data.subject_id !== undefined) updateData.subject_id = data.subject_id;
    if (data.department_id !== undefined) updateData.department_id = data.department_id;
    if (data.branch_id !== undefined) updateData.branch_id = data.branch_id;
    if (data.semester_id !== undefined) updateData.semester_id = data.semester_id;
    if (data.image_url !== undefined) updateData.image_url = data.image_url || null;
    if (data.options !== undefined) {
      updateData.options = typeof data.options === 'string' ? data.options : JSON.stringify(data.options);
    }
    return this.prisma.question.update({ where: { id }, data: updateData });
  }

  async deleteQuestion(id: string, tenantId?: string) {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Question not found');
    }
    // Tenant isolation (#fix): same rule as update.
    if (tenantId && tenantId !== 'master' && tenantId !== 'test-tenant' && existing.tenant_id !== tenantId) {
      throw new ForbiddenException('You can only delete questions in your own college');
    }
    await this.prisma.question.delete({ where: { id } });
    return { deleted: true, id };
  }

  async getQuestions(tenantId: string, filters?: { course_id?: string; subject_id?: string; department_id?: string; branch_id?: string; semester_id?: string }) {
    const whereClause: any = { tenant_id: tenantId };
    // Subject-first bank (#fix): questions are imported under a SUBJECT (one
    // bank per catalog subject, reused by every offering of it), but quiz
    // creation filters by course. When both are given, match either — so a
    // quiz for course X sees every question of X's subject even though the
    // bank rows carry course_id='c-1' (legacy placeholder).
    if (filters?.course_id && filters?.subject_id) {
      whereClause.OR = [
        { course_id: filters.course_id },
        { subject_id: filters.subject_id },
      ];
    } else {
      if (filters?.course_id) {
        whereClause.course_id = filters.course_id;
      }
      if (filters?.subject_id) {
        whereClause.subject_id = filters.subject_id;
      }
    }
    if (filters?.department_id) {
      whereClause.department_id = filters.department_id;
    }
    if (filters?.branch_id) {
      whereClause.branch_id = filters.branch_id;
    }
    if (filters?.semester_id) {
      whereClause.semester_id = filters.semester_id;
    }
    const questions = await this.prisma.question.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' }
    });
    // options is stored as a JSON string in the DB — normalize to an array so
    // the UI can render q.options.map(...) without crashing.
    return questions.map((q: any) => ({
      ...q,
      options: typeof q.options === 'string' ? safeParse(q.options) : q.options
    }));
  }

  /**
   * Parse a PDF buffer and import every detected question into the question bank.
   * Supports common plain-text exam layouts:
   *
   *   1. What is 2 + 2?
   *   a) 3
   *   b) 4
   *   c) 5
   *   Answer: b
   *
   * Lines that don't fit MCQ format are imported as ESSAY questions.
   */
  async importQuestionsFromPdf(
    file: Express.Multer.File,
    courseId?: string,
    tenantId?: string,
    org?: { department_id?: string; branch_id?: string; semester_id?: string; subject_id?: string }
  ) {
    const tenant = tenantId || 'test-tenant';
    const course = courseId || 'c-1';

    const parsed = await pdfParse(file.buffer);
    const questions = this.extractQuestionsFromText(parsed.text || '');

    const created: any[] = [];
    let skipped = 0;
    for (const q of questions) {
      // Dedup (#fix): never import the same question twice. Two questions are
      // considered identical when they share the tenant, the same scoping
      // (subject, or course when no subject is selected), and the same title
      // text — re-importing a PDF must not double the bank.
      const dedupeScope = org?.subject_id
        ? { subject_id: org.subject_id }
        : { course_id: course };
      const existing = await this.prisma.question.findFirst({
        where: {
          tenant_id: tenant,
          title: q.title,
          ...dedupeScope,
        },
        select: { id: true },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const questionData: any = {
        tenant_id: tenant,
        course_id: course,
        subject_id: org?.subject_id || null,
        // The bank is differentiated per college + org hierarchy — carry the
        // department/branch/semester the PDF was imported under (#fix).
        department_id: org?.department_id || null,
        branch_id: org?.branch_id || null,
        semester_id: org?.semester_id || null,
        type: q.type,
        title: q.title,
        content: q.content,
        marks: q.marks || 1,
        answer_key: q.answer_key || null
      };
      if (q.options) {
        questionData.options = JSON.stringify(q.options);
      }
      const question = await this.prisma.question.create({ data: questionData });
      created.push(question);
    }

    const imported = created.length;
    let message: string;
    if (imported === 0 && skipped === 0) {
      message = 'No questions detected in the PDF. Ensure each question starts with a number (e.g. "1.") and options start with a) b) c) d).';
    } else {
      message = `Imported ${imported} question${imported !== 1 ? 's' : ''} from PDF.`;
      if (skipped > 0) {
        message += ` ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped (already in the bank).`;
      }
    }

    return {
      imported,
      skipped,
      total: questions.length,
      message,
      questions: created,
    };
  }

  private extractQuestionsFromText(text: string): any[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const questions: any[] = [];
    let current: any = null;
    const optionRe = /^([a-dA-D])[.)]\s*(.+)$/;
    const questionRe = /^(?:Q\d*[.)]\s*|\d+[.)]\s*)(.+)$/;

    const flush = () => {
      if (!current) return;
      if (current.options && current.options.length > 0) {
        current.type = 'MCQ';
        current.options = current.options.map((o: any, i: number) => ({
          id: i + 1,
          text: o.text,
          isCorrect: o.isCorrect
        }));
        const correctIdx = current.options.findIndex((o: any) => o.isCorrect);
        if (correctIdx >= 0) {
          current.answer_key = String(correctIdx + 1);
        }
      } else {
        current.type = 'ESSAY';
        delete current.options;
      }
      if (current.title) {
        questions.push({ ...current, marks: current.marks || 1 });
      }
      current = null;
    };

    for (const line of lines) {
      // Answer line like "Answer: b" or "Answer: B"
      const answerMatch = line.match(/^answer\s*[:=]?\s*([a-dA-D])[.)]?$/i);
      if (answerMatch && current) {
        const idx = answerMatch[1].toLowerCase().charCodeAt(0) - 97;
        if (current.options) {
          current.options = current.options.map((o: any, i: number) => ({
            ...o,
            isCorrect: i === idx
          }));
        }
        continue;
      }

      // Option line like "a) text" or "b. text"
      const optionMatch = line.match(optionRe);
      if (optionMatch && current) {
        current.options = current.options || [];
        current.options.push({ text: optionMatch[2], isCorrect: false });
        continue;
      }

      // New question line like "1. What is..." or "Q1: What is..."
      const questionMatch = line.match(questionRe);
      if (questionMatch && !/^(page|chapter|section|unit|question paper|subject|class|time|marks)\b/i.test(line)) {
        flush();
        current = {
          title: questionMatch[1],
          content: questionMatch[1],
          options: []
        };
        continue;
      }

      // Continuation / body lines
      if (current) {
        current.content = `${current.content}\n${line}`;
      }
    }

    flush();
    return questions;
  }
}

function safeParse(value: string): any {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

