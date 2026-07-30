import { Module } from '@nestjs/common';
import { UserController } from './presentation/controllers/user.controller';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { CreateUserUseCase } from './application/use-cases/create-user.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [
    {
      provide: 'UserRepository',
      useClass: PrismaUserRepository,
    },
    CreateUserUseCase,
  ],
})
export class UserModule {}
