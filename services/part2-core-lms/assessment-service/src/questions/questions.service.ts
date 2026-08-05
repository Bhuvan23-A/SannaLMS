import { Injectable } from '@nestjs/common';
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
      type: data.type || 'MCQ',
      title: titleStr,
      content: contentStr,
      marks: data.marks || 1,
      answer_key: data.answer_key || data.answerKey || (data.correctOption !== undefined ? String(data.correctOption) : null)
    };
    if (data.options) {
      // Prisma Json fields reject null — only set options when provided
      createData.options = typeof data.options === 'string' ? data.options : JSON.stringify(data.options);
    }
    return this.prisma.question.create({ data: createData });
  }

  async getQuestions(tenantId: string, courseId?: string) {
    const whereClause: any = { tenant_id: tenantId };
    if (courseId) {
      whereClause.course_id = courseId;
    }
    return this.prisma.question.findMany({
      where: whereClause
    });
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
  async importQuestionsFromPdf(file: Express.Multer.File, courseId?: string, tenantId?: string) {
    const tenant = tenantId || 'test-tenant';
    const course = courseId || 'c-1';

    const parsed = await pdfParse(file.buffer);
    const questions = this.extractQuestionsFromText(parsed.text || '');

    const created: any[] = [];
    for (const q of questions) {
      const questionData: any = {
        tenant_id: tenant,
        course_id: course,
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

    return {
      imported: created.length,
      message: created.length
        ? `Imported ${created.length} question${created.length > 1 ? 's' : ''} from PDF.`
        : 'No questions detected in the PDF. Ensure each question starts with a number (e.g. "1.") and options start with a) b) c) d).',
      questions: created
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
