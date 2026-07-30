import { Controller, Post, Body, Get, Headers, UnauthorizedException, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IsEmail, IsString, MinLength } from 'class-validator';

class LoginDto {
  @IsEmail()
  email: string;

  @IsString() @MinLength(3)
  password: string;
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('No token provided');
    return this.authService.refresh(token);
  }

  @Get('me')
  async me(@Headers('authorization') auth: string) {
    const token = auth?.replace('Bearer ', '');
    if (!token) throw new UnauthorizedException('No token provided');
    const payload = await this.authService.verify(token);
    return {
      id: payload.sub,
      email: payload.email,
      tenant_id: payload.tenant_id,
      roles: payload.roles,
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout() {
    // Stateless JWT: token is discarded client-side
    // In production: add token to a Redis blocklist
    return { message: 'Logged out successfully' };
  }
}
