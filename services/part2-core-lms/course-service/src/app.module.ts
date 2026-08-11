import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoursesModule } from './courses/courses.module';
import { CourseTrainersModule } from './course-trainers/course-trainers.module';
import { ModulesModule } from './modules/modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { TopicsModule } from './topics/topics.module';
import { AuditMiddleware } from './audit.middleware';
import { MockAuthMiddleware } from './mock-auth.middleware';
import { PrismaService } from './prisma.service';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { ProgressModule } from './progress/progress.module';
import { PrerequisitesModule } from './prerequisites/prerequisites.module';
import { ContentEngineModule } from './content-engine/content-engine.module';
import { ResourcesModule } from './resources/resources.module';
import { PromotionsModule } from './promotions/promotions.module';
import { AdminModule } from './admin/admin.module';
import { SubjectsModule } from './subjects/subjects.module';
import { RostersModule } from './rosters/rosters.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    CoursesModule, CourseTrainersModule, ModulesModule, LessonsModule,
    TopicsModule, EnrollmentsModule, ProgressModule, PrerequisitesModule, ContentEngineModule, ResourcesModule, PromotionsModule, AdminModule, SubjectsModule, RostersModule
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(MockAuthMiddleware, AuditMiddleware).forRoutes('*');
  }
}
