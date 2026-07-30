import { Controller, Post, Body } from '@nestjs/common';
import { LoginUseCase, LoginRequest } from '../../application/use-cases/login.use-case';

@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  async login(@Body() request: LoginRequest) {
    try {
      const result = await this.loginUseCase.execute(request);
      return { success: true, data: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
