import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service';
import { KeycloakAdminService } from '../keycloak-admin.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, KeycloakAdminService],
  exports: [UsersService, KeycloakAdminService],
})
export class UsersModule {}
