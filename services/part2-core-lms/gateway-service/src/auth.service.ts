import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;
  email: string;
  tenant_id: string;
  roles: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  /** Issue a JWT for a user. In production: validate against college-service DB. */
  async login(email: string, password: string): Promise<{ access_token: string; user: any }> {
    // Stub user store — in production, verify against bcrypt hash in DB
    const stubUsers: Record<string, any> = {
      'superadmin@lms.com': { id: 'u-super', email: 'superadmin@lms.com', password: 'admin123', roles: ['SUPER_ADMIN'], tenant_id: 't-1', name: 'Super Admin' },
      'admin@lms.com':      { id: 'u-admin', email: 'admin@lms.com',      password: 'admin123', roles: ['COLLEGE_ADMIN'], tenant_id: 't-1', name: 'College Admin' },
      'trainer@lms.com':    { id: 'u-trainer', email: 'trainer@lms.com', password: 'train123', roles: ['PRIMARY_TRAINER'], tenant_id: 't-1', name: 'Primary Trainer' },
      'ta@lms.com':         { id: 'u-ta',      email: 'ta@lms.com',      password: 'ta123',    roles: ['TEACHING_ASSISTANT'], tenant_id: 't-1', name: 'Teaching Assistant' },
      'guest@lms.com':      { id: 'u-guest',   email: 'guest@lms.com',   password: 'guest123', roles: ['GUEST_FACULTY'], tenant_id: 't-1', name: 'Guest Faculty' },
      'student@lms.com':    { id: 'u-student', email: 'student@lms.com', password: 'stud123',  roles: ['STUDENT'], tenant_id: 't-1', name: 'Student User' },
    };

    const user = stubUsers[email];
    if (!user || user.password !== password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenant_id: user.tenant_id,
      roles: user.roles,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email, name: user.name, roles: user.roles, tenant_id: user.tenant_id },
    };
  }

  async verify(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async refresh(token: string): Promise<{ access_token: string }> {
    const payload = await this.verify(token);
    const newPayload: JwtPayload = {
      sub: payload.sub,
      email: payload.email,
      tenant_id: payload.tenant_id,
      roles: payload.roles,
    };
    return { access_token: await this.jwtService.signAsync(newPayload) };
  }
}
