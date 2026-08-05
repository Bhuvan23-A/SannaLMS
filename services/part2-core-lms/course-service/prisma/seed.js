/**
 * Course service demo seed.
 *
 * Populates the isolated course database (sannalms_course) with published demo
 * courses so the admin dashboard Courses page shows data for testing.
 *
 * Tenants seeded: 't-1' (mock), 'test-college' (JWT fallback), 'master' (Super Admin).
 *
 * Usage (from services/part2-core-lms/course-service):
 *   DATABASE_URL="postgresql://..." npm run seed
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COURSES = [
  { id: 'c-1', tenant_id: 't-1', title: 'Introduction to Python & Isolated RAG Architectures' },
  { id: 'c-2', tenant_id: 'test-college', title: 'Next.js Microservices Orchestration' },
  { id: 'c-3', tenant_id: 'master', title: 'Platform Engineering Fundamentals' },
];

async function main() {
  console.log('Seeding course demo data...');
  for (const course of COURSES) {
    const existing = await prisma.course.findUnique({ where: { id: course.id } });
    if (existing) {
      console.log(`  ~ course ${course.id} already exists, skipping`);
      continue;
    }
    await prisma.course.create({
      data: {
        id: course.id,
        title: course.title,
        description:
          'Demo course seeded for testing the admin dashboard. Contains modules, lessons and topics.',
        status: 'PUBLISHED',
        tenant_id: course.tenant_id,
        created_by: 'seed',
      },
    });
    console.log(`  ✔ created "${course.title}" for tenant ${course.tenant_id}`);
  }
  console.log('\n✅ Course demo data seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
