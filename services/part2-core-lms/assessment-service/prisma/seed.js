/**
 * Assessment service demo seed.
 *
 * Populates the isolated assessment database (sannalms_assessment) with
 * questions, quizzes, assignments, submissions and gradebook entries so the
 * admin dashboard shows real data for testing.
 *
 * Tenants seeded:
 *   - 't-1'           (mock/dev auth path, admin UI sends x-mock-tenant-id)
 *   - 'test-college'  (RolesGuard fallback when JWT has no tenant_id attribute)
 *   - 'master'        (Super Admin reads use this tenant)
 *
 * Usage (from services/part2-core-lms/assessment-service):
 *   DATABASE_URL="postgresql://..." npm run seed
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COURSE_ID = 'c-1';
const TENANTS = ['t-1', 'test-college', 'master'];

// Users per tenant (gradebook is unique on [course_id, user_id], so each tenant gets its own demo students)
const STUDENTS = {
  't-1': [
    { id: 'u-1', score: 175, max: 200, grade: 'B', cgpa: 3.0 },
    { id: 'u-2', score: 190, max: 200, grade: 'A', cgpa: 4.0 },
  ],
  'test-college': [
    { id: 'u-4', score: 175, max: 200, grade: 'B', cgpa: 3.0 },
    { id: 'u-5', score: 190, max: 200, grade: 'A', cgpa: 4.0 },
  ],
  master: [
    { id: 'u-10', score: 175, max: 200, grade: 'B', cgpa: 3.0 },
    { id: 'u-11', score: 190, max: 200, grade: 'A', cgpa: 4.0 },
  ],
};

const MCQS = [
  {
    title: 'What is the output of print(2 ** 3)?',
    content: 'Basic exponentiation in Python.',
    marks: 1,
    answer: 2, // index of correct option (0-based)
    options: [
      { text: '6' },
      { text: '8' },
      { text: '9' },
      { text: 'Error' },
    ],
  },
  {
    title: 'Which data structure is FIFO (First In First Out)?',
    content: 'Fundamental data structure question.',
    marks: 1,
    answer: 1,
    options: [
      { text: 'Stack' },
      { text: 'Queue' },
      { text: 'Binary Tree' },
      { text: 'Hash Map' },
    ],
  },
  {
    title: 'What keyword is used to define a function in Python?',
    content: 'Python syntax basics.',
    marks: 1,
    answer: 0,
    options: [
      { text: 'def' },
      { text: 'func' },
      { text: 'function' },
      { text: 'lambda' },
    ],
  },
  {
    title: 'Which of the following is a valid Python list?',
    content: 'Container types in Python.',
    marks: 1,
    answer: 3,
    options: [
      { text: '{1, 2, 3}' },
      { text: '(1, 2, 3)' },
      { text: '{"a": 1}' },
      { text: '[1, 2, 3]' },
    ],
  },
];

const ESSAY = {
  title: 'Explain the difference between a list and a tuple in Python.',
  content: 'Provide at least two differences with a short example for each.',
  marks: 5,
};

async function seedTenant(tenantId) {
  // Idempotency guard — skip tenants that already have seeded data so re-runs don't
  // crash on the gradebook @@unique([course_id, user_id]) constraint (P2002).
  const existing = await prisma.gradebook.count({ where: { tenant_id: tenantId } });
  if (existing > 0) {
    console.log(`  ~ tenant "${tenantId}" already seeded (${existing} gradebook rows), skipping`);
    return;
  }

  console.log(`\n── Seeding assessment demo data for tenant "${tenantId}" ──`);

  // 1. Questions
  const questions = [];
  for (const mcq of MCQS) {
    const created = await prisma.question.create({
      data: {
        tenant_id: tenantId,
        course_id: COURSE_ID,
        type: 'MCQ',
        title: mcq.title,
        content: mcq.content,
        marks: mcq.marks,
        options: JSON.stringify(
          mcq.options.map((o, i) => ({ id: i + 1, text: o.text, isCorrect: i === mcq.answer }))
        ),
        answer_key: String(mcq.answer + 1),
      },
    });
    questions.push(created);
  }
  const essayQ = await prisma.question.create({
    data: {
      tenant_id: tenantId,
      course_id: COURSE_ID,
      type: 'ESSAY',
      title: ESSAY.title,
      content: ESSAY.content,
      marks: ESSAY.marks,
    },
  });
  questions.push(essayQ);
  console.log(`  ✔ ${questions.length} questions`);

  // 2. Quiz with the MCQ questions attached
  const quiz = await prisma.quiz.create({
    data: {
      tenant_id: tenantId,
      course_id: COURSE_ID,
      title: 'Python Basics Quiz',
      description: 'Demo quiz seeded for testing the quiz builder and grading flow.',
      duration_mins: 30,
      is_published: true,
    },
  });
  await prisma.quizQuestion.createMany({
    data: questions.slice(0, 4).map((q, i) => ({ quiz_id: quiz.id, question_id: q.id, order: i })),
  });
  console.log('  ✔ 1 quiz with 4 questions');

  // 3. Assignments
  const assignment1 = await prisma.assignment.create({
    data: {
      tenant_id: tenantId,
      course_id: COURSE_ID,
      title: 'Assignment 1: Sorting Algorithms',
      description: 'Implement bubble sort in Python and explain its time complexity.',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      max_marks: 100,
    },
  });
  const assignment2 = await prisma.assignment.create({
    data: {
      tenant_id: tenantId,
      course_id: COURSE_ID,
      title: 'Assignment 2: OOP Design',
      description: 'Design a class diagram for a library management system.',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      max_marks: 100,
    },
  });
  console.log('  ✔ 2 assignments');

  // 4. Submissions + gradebook for this tenant's demo students
  const students = STUDENTS[tenantId];
  for (const s of students) {
    await prisma.quizSubmission.create({
      data: {
        quiz_id: quiz.id,
        user_id: s.id,
        tenant_id: tenantId,
        answers: { [questions[0].id]: 2, [questions[1].id]: 2, [questions[2].id]: 1 },
        score: 90,
        is_graded: true,
      },
    });
    await prisma.assignmentSubmission.create({
      data: {
        assignment_id: assignment1.id,
        user_id: s.id,
        tenant_id: tenantId,
        text_content:
          'def bubble_sort(arr):\n    n = len(arr)\n    for i in range(n):\n        for j in range(0, n - i - 1):\n            if arr[j] > arr[j + 1]:\n                arr[j], arr[j + 1] = arr[j + 1], arr[j]\n    return arr',
        file_url: null,
        score: 85,
        feedback: 'Good work! Consider adding edge-case handling.',
        is_graded: true,
      },
    });
    await prisma.assignmentSubmission.create({
      data: {
        assignment_id: assignment2.id,
        user_id: s.id,
        tenant_id: tenantId,
        text_content: 'Class diagram submitted for review.',
        file_url: null,
        score: null,
        is_graded: false,
      },
    });
    await prisma.gradebook.create({
      data: {
        tenant_id: tenantId,
        course_id: COURSE_ID,
        user_id: s.id,
        total_score: s.score,
        max_score: s.max,
        grade: s.grade,
        cgpa: s.cgpa,
      },
    });
    console.log(`  ✔ submissions + gradebook for ${s.id} (${s.grade})`);
  }
}

async function main() {
  console.log('Seeding assessment demo data...');
  for (const tenantId of TENANTS) {
    await seedTenant(tenantId);
  }
  console.log('\n✅ Assessment demo data seeded for tenants:', TENANTS.join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
