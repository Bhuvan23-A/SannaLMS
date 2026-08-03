import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CollegeController } from './college.controller';
import { CollegeService } from './college.service';
import { MockAuthMiddleware } from './mock-auth.middleware';
import { DepartmentController } from './department.controller';
import { DepartmentService } from './department.service';
import { BranchController } from './branch.controller';
import { BranchService } from './branch.service';
import { SemesterController } from './semester.controller';
import { SemesterService } from './semester.service';
import { AuditMiddleware } from './audit.middleware';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
  controllers: [CollegeController, DepartmentController, BranchController, SemesterController],
  providers: [PrismaService, CollegeService, DepartmentService, BranchService, SemesterService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MockAuthMiddleware, AuditMiddleware)
      .forRoutes('*'); // Apply middlewares to all routes
  }
}
