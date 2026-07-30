import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CreateUserUseCase } from '../../application/use-cases/create-user.use-case';
import type { CreateUserRequest } from '../../application/use-cases/create-user.use-case';

@Controller('users')
export class UserController {
  constructor(private readonly createUserUseCase: CreateUserUseCase) {}

  @Post()
  async createUser(@Body() request: CreateUserRequest) {
    try {
      const result = await this.createUserUseCase.execute(request);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  @Get(':id')
  async getUser(@Param('id') id: string) {
    // Implement GetUserUseCase
    return { success: true, data: { id, message: 'Not implemented yet' } };
  }
}
