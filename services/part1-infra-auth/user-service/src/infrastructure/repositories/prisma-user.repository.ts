import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../domain/repositories/user.repository.interface';
import { User, UserProps } from '../../domain/entities/user.entity';
import { PrismaService } from '../database/prisma/prisma.service';

// Prisma returns null for absent optional fields; UserProps uses undefined.
// This mapper converts null → undefined to satisfy the TypeScript interface.
function toUserProps(data: {
  id: string;
  email: string;
  passwordHash: string | null;
  firstName: string | null;
  lastName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): UserProps {
  return {
    email: data.email,
    passwordHash: data.passwordHash ?? undefined,
    firstName: data.firstName ?? undefined,
    lastName: data.lastName ?? undefined,
    isActive: data.isActive,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({ where: { email } });
    if (!data) return null;
    return User.create(toUserProps(data), data.id);
  }

  async findById(id: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({ where: { id } });
    if (!data) return null;
    return User.create(toUserProps(data), data.id);
  }

  async findAll(): Promise<User[]> {
    const data = await this.prisma.user.findMany();
    return data.map((d) => User.create(toUserProps(d), d.id));
  }

  async create(entity: User): Promise<User> {
    const data = await this.prisma.user.create({
      data: {
        id: entity.id,
        ...entity.props,
      },
    });
    return User.create(toUserProps(data), data.id);
  }

  async update(id: string, entity: Partial<User>): Promise<User> {
    const data = await this.prisma.user.update({
      where: { id },
      data: {
        ...entity.props,
      },
    });
    return User.create(toUserProps(data), data.id);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } });
  }
}
