import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma.service';
import { CoursesService } from '../src/courses/courses.service';

describe('Course Data Modeling and Trainers (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    // Clean DB before testing in correct foreign-key order
    await prisma.videoMetadata.deleteMany();
    await prisma.assetMetadata.deleteMany();
    await prisma.courseVersionHistory.deleteMany();
    await prisma.coursePrerequisite.deleteMany();
    await prisma.videoProgress.deleteMany();
    await prisma.quizProgress.deleteMany();
    await prisma.topicProgress.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.topic.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.module.deleteMany();
    await prisma.courseTrainer.deleteMany();
    await prisma.course.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  let courseId: string;

  it('/api/v1/courses (POST) - Securely blocks requests without proper roles (403)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/courses')
      .send({
        title: 'Introduction to Node.js',
        tenant_id: 'tenant-123'
      })
      .expect(403);
  });

  it('/api/v1/courses (POST) - Succeeds with SUPER_ADMIN role', () => {
    return request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('x-mock-roles', 'SUPER_ADMIN')
      .set('x-mock-user-id', 'admin-1')
      .send({
        title: 'Mastering NestJS',
        description: 'Advanced backend development',
        tenant_id: 'tenant-123'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.title).toEqual('Mastering NestJS');
        expect(res.body.created_by).toEqual('admin-1');
        courseId = res.body.id;
      });
  });

  it('/api/v1/course-trainers (POST) - Assigns PRIMARY_TRAINER to course', () => {
    return request(app.getHttpServer())
      .post('/api/v1/course-trainers')
      .set('x-mock-roles', 'COLLEGE_ADMIN')
      .set('x-mock-user-id', 'college-admin-1')
      .send({
        course_id: courseId,
        user_id: 'trainer-99',
        role: 'PRIMARY_TRAINER',
        tenant_id: 'tenant-123'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.role).toEqual('PRIMARY_TRAINER');
        expect(res.body.user_id).toEqual('trainer-99');
        expect(res.body.created_by).toEqual('college-admin-1');
      });
  });

  it('/api/v1/course-trainers/course/:courseId (GET) - Retrieves trainers', () => {
    return request(app.getHttpServer())
      .get(`/api/v1/course-trainers/course/${courseId}`)
      .set('x-mock-roles', 'STUDENT')
      .expect(200)
      .expect((res) => {
        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].user_id).toBe('trainer-99');
      });
  });

  let testModuleId = '';
  it('/api/v1/modules (POST) - Creates a module in the course', () => {
    return request(app.getHttpServer())
      .post('/api/v1/modules')
      .set('x-mock-roles', 'PRIMARY_TRAINER')
      .send({
        title: 'Module 1: Introduction',
        course_id: courseId,
        sequence_no: 1,
        tenant_id: 'tenant-123'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        testModuleId = res.body.id;
      });
  });

  let testLessonId = '';
  it('/api/v1/lessons (POST) - Creates a lesson in the module', () => {
    return request(app.getHttpServer())
      .post('/api/v1/lessons')
      .set('x-mock-roles', 'PRIMARY_TRAINER')
      .send({
        title: 'Lesson 1: Getting Started',
        module_id: testModuleId,
        sequence_no: 1,
        tenant_id: 'tenant-123'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        testLessonId = res.body.id;
      });
  });

  it('/api/v1/topics (POST) - Creates a topic in the lesson', () => {
    return request(app.getHttpServer())
      .post('/api/v1/topics')
      .set('x-mock-roles', 'PRIMARY_TRAINER')
      .send({
        title: 'Topic 1: Overview',
        content: 'This is the overview content.',
        lesson_id: testLessonId,
        sequence_no: 1,
        tenant_id: 'tenant-123'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.content).toBe('This is the overview content.');
      });
  });

  let course2Id = '';
  it('/api/v1/courses (POST) - Creates a second course', () => {
    return request(app.getHttpServer())
      .post('/api/v1/courses')
      .set('x-mock-roles', 'SUPER_ADMIN')
      .send({ title: 'Advanced NestJS', tenant_id: 'tenant-123' })
      .expect(201)
      .expect((res) => {
        course2Id = res.body.id;
      });
  });

  it('/api/v1/prerequisites (POST) - Adds prerequisite to course 2', () => {
    return request(app.getHttpServer())
      .post('/api/v1/prerequisites')
      .set('x-mock-roles', 'COLLEGE_ADMIN')
      .send({ course_id: course2Id, required_course_id: courseId, tenant_id: 'tenant-123' })
      .expect(201);
  });

  it('/api/v1/enrollments (POST) - Securely blocks enrollment if missing prerequisite', () => {
    return request(app.getHttpServer())
      .post('/api/v1/enrollments')
      .set('x-mock-roles', 'STUDENT')
      .send({ user_id: 'student-1', course_id: course2Id, tenant_id: 'tenant-123' })
      .expect(400); // Bad Request (Missing prerequisite)
  });

  it('/api/v1/enrollments (POST) - Succeeds enrollment for course 1', () => {
    return request(app.getHttpServer())
      .post('/api/v1/enrollments')
      .set('x-mock-roles', 'STUDENT')
      .send({ user_id: 'student-1', course_id: courseId, tenant_id: 'tenant-123' })
      .expect(201);
  });

  let testTopicId = '';
  it('/api/v1/progress/topic/:topicId (POST) - Marks topic as in progress', async () => {
    // Find the topic we created earlier
    const topic = await prisma.topic.findFirst();
    testTopicId = topic.id;

    return request(app.getHttpServer())
      .post(`/api/v1/progress/topic/${testTopicId}`)
      .set('x-mock-roles', 'STUDENT')
      .set('x-mock-user-id', 'student-1') // Authenticate as enrolled student
      .send({ status: 'IN_PROGRESS', tenant_id: 'tenant-123' })
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('IN_PROGRESS');
      });
  });

  it('/api/v1/progress/topic/:topicId (POST) - Securely blocks content access for unenrolled student', () => {
    return request(app.getHttpServer())
      .post(`/api/v1/progress/topic/${testTopicId}`)
      .set('x-mock-roles', 'STUDENT')
      .set('x-mock-user-id', 'student-2') // Unenrolled student
      .send({ status: 'IN_PROGRESS', tenant_id: 'tenant-123' })
      .expect(403); // Forbidden access rule!
  });

  it('CoursesService.update - Course Versioning (PATCH)', () => {
    // We didn't build a PATCH controller yet, but we can call the service or mock it.
    return app.get(CoursesService).update(courseId, { status: 'PUBLISHED' }).then(async () => {
      const history = await prisma.courseVersionHistory.findMany({ where: { course_id: courseId } });
      expect(history.length).toBe(1);
      expect(history[0].version_number).toBe(1);
    });
  });

  let testAssetId = '';

  it('/api/v1/content/video/upload (POST) - Initiates video upload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/content/video/upload')
      .set('x-mock-roles', 'PRIMARY_TRAINER')
      .send({ topic_id: testTopicId, tenant_id: 'tenant-123' });
      
    if (res.status !== 201) {
      console.error('Upload Error:', res.body);
    }
    
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('UPLOADING');
    testAssetId = res.body.id;
  });

  it('/api/v1/content/video/process/:assetId (POST) - Simulates Video Pipeline', async () => {
    // Let's trigger the pipeline
    await request(app.getHttpServer())
      .post(`/api/v1/content/video/process/${testAssetId}`)
      .set('x-mock-roles', 'PRIMARY_TRAINER')
      .expect(201);

    // Validate the Asset is now READY and VideoMetadata is created
    const asset = await prisma.assetMetadata.findUnique({ where: { id: testAssetId }, include: { video_metadata: true } });
    expect(asset.status).toBe('READY');
    expect(asset.video_metadata.duration_seconds).toBe(3600);
    expect(asset.video_metadata.hls_stream_url).toContain('.m3u8');
  });

  it('/api/v1/progress/video/:topicId (POST) - Tracks granular video progress and completes it', async () => {
    // Watch 96% of the video (which is > 95% threshold for completion)
    const watchedSeconds = Math.floor(3600 * 0.96);

    await request(app.getHttpServer())
      .post(`/api/v1/progress/video/${testTopicId}`)
      .set('x-mock-roles', 'STUDENT')
      .set('x-mock-user-id', 'student-1')
      .send({ seconds_watched: watchedSeconds, tenant_id: 'tenant-123' })
      .expect(201)
      .expect((res) => {
        expect(res.body.percentage_completed).toBe(96);
        expect(res.body.last_second_watched).toBe(watchedSeconds);
      });
  });

  it('/api/v1/progress/course/:courseId/overall (GET) - Calculates overall course progress', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/progress/course/${courseId}/overall`)
      .set('x-mock-roles', 'STUDENT')
      .set('x-mock-user-id', 'student-1')
      .expect(200)
      .expect((res) => {
        // We have 1 topic in the course, and we just completed it via video progress threshold.
        // Therefore, overall progress should be 100%.
        expect(res.body.overall_progress).toBe(100);
      });
  });
});
