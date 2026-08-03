import { Injectable, Inject } from '@nestjs/common';
import { UseCase } from '../../core/base/use-case.interface';
import type { UserRepository } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user.entity';

export interface CreateUserRequest {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface CreateUserResponse {
  id: string;
  email: string;
}

@Injectable()
export class CreateUserUseCase implements UseCase<CreateUserRequest, CreateUserResponse> {
  constructor(
    @Inject('UserRepository')
    private readonly userRepository: UserRepository,
  ) {}

  async execute(request: CreateUserRequest): Promise<CreateUserResponse> {
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = User.create({
      email: request.email,
      firstName: request.firstName,
      lastName: request.lastName,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedUser = await this.userRepository.create(user);

    return {
      id: savedUser.id,
      email: savedUser.props.email,
    };
  }
}
