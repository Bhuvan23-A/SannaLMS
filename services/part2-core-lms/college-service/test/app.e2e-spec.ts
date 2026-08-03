import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
const request = require('supertest');
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma.service';

describe('Org Hierarchy and RBAC (e2e)', () => {
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
    await prisma.semester.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.department.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany();
    await prisma.college.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/v1/colleges (POST) - Fails without SUPER_ADMIN role', () => {
    return request(app.getHttpServer())
      .post('/api/v1/colleges')
      .set('x-mock-roles', 'STUDENT')
      .send({
        name: 'Test University',
        subdomain: 'testu.lms.com'
      })
      .expect(403);
  });

  it('/api/v1/colleges (POST) - Succeeds with SUPER_ADMIN role', () => {
    return request(app.getHttpServer())
      .post('/api/v1/colleges')
      .set('x-mock-roles', 'SUPER_ADMIN')
      .set('x-mock-user-id', 'test-admin-123')
      .send({
        name: 'Test University',
        subdomain: 'testu.lms.com'
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toEqual('Test University');
        expect(res.body.subdomain).toEqual('testu.lms.com');
        // Audit Logging Validation
        expect(res.body.created_by).toEqual('test-admin-123');
        expect(res.body.updated_by).toEqual('test-admin-123');
      });
  });

  it('/api/v1/departments (POST) - Succeeds with COLLEGE_ADMIN role', async () => {
    // 1. First we need the college ID
    const colRes = await request(app.getHttpServer()).get('/api/v1/colleges').set('x-mock-roles', 'SUPER_ADMIN');
    const collegeId = colRes.body[0].id;

    // 2. Create the department
    return request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('x-mock-roles', 'COLLEGE_ADMIN')
      .set('x-mock-user-id', 'college-admin-99')
      .send({
        name: 'Computer Science',
        college_id: collegeId,
        tenant_id: collegeId
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toEqual('Computer Science');
        // Audit Logging Validation
        expect(res.body.created_by).toEqual('college-admin-99');
      });
  });

  it('/api/v1/branches (POST) - Succeeds with COLLEGE_ADMIN role', async () => {
    // 1. Get the department ID
    const depRes = await request(app.getHttpServer()).get('/api/v1/departments').set('x-mock-roles', 'SUPER_ADMIN');
    const departmentId = depRes.body[0].id;
    const tenantId = depRes.body[0].tenant_id;

    // 2. Create the branch
    return request(app.getHttpServer())
      .post('/api/v1/branches')
      .set('x-mock-roles', 'COLLEGE_ADMIN')
      .set('x-mock-user-id', 'college-admin-99')
      .send({
        name: 'Artificial Intelligence',
        department_id: departmentId,
        tenant_id: tenantId
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toEqual('Artificial Intelligence');
        expect(res.body.created_by).toEqual('college-admin-99');
      });
  });

  it('/api/v1/semesters (POST) - Succeeds with COLLEGE_ADMIN role', async () => {
    // 1. Get the branch ID
    const branchRes = await request(app.getHttpServer()).get('/api/v1/branches').set('x-mock-roles', 'SUPER_ADMIN');
    const branchId = branchRes.body[0].id;
    const tenantId = branchRes.body[0].tenant_id;

    // 2. Create the semester
    return request(app.getHttpServer())
      .post('/api/v1/semesters')
      .set('x-mock-roles', 'COLLEGE_ADMIN')
      .set('x-mock-user-id', 'college-admin-99')
      .send({
        name: 'Fall 2026',
        branch_id: branchId,
        tenant_id: tenantId
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.name).toEqual('Fall 2026');
        expect(res.body.created_by).toEqual('college-admin-99');
      });
  });

  // Explicit failure test cases to demonstrate RBAC rejection
  it('FAILED CASE: /api/v1/departments (POST) - Fails when STUDENT tries to create a department', async () => {
    const colRes = await request(app.getHttpServer()).get('/api/v1/colleges').set('x-mock-roles', 'SUPER_ADMIN');
    const collegeId = colRes.body[0].id;

    return request(app.getHttpServer())
      .post('/api/v1/departments')
      .set('x-mock-roles', 'STUDENT') // A student should NOT be allowed
      .send({
        name: 'Hacking Department',
        college_id: collegeId,
        tenant_id: collegeId
      })
      .expect(403); // Expecting Forbidden
  });

  it('FAILED CASE: /api/v1/colleges (POST) - Fails when TEACHING_ASSISTANT tries to create a college', () => {
    return request(app.getHttpServer())
      .post('/api/v1/colleges')
      .set('x-mock-roles', 'TEACHING_ASSISTANT') // Not allowed
      .send({
        name: 'Fake College',
        subdomain: 'fake.lms.com'
      })
      .expect(403); // Expecting Forbidden
  });

  it('/api/v1/colleges (GET) - Succeeds with STUDENT role', () => {
    return request(app.getHttpServer())
      .get('/api/v1/colleges')
      .set('x-mock-roles', 'STUDENT')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });
});
