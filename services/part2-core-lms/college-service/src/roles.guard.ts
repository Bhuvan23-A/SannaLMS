import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

function decodeTokenPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<any>();
    const authHeader = request.headers ? request.headers['authorization'] : undefined;

    let rawRoles: string[] = [];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = decodeTokenPayload(token);
      if (payload) {
        rawRoles = payload.realm_access?.roles || payload.roles || [];
        const tenantAttr = payload.tenant_id || payload.attributes?.tenant_id?.[0] || payload.tenantId || 'test-college';
        request.user = {
          id: payload.sub,
          email: payload.email,
          username: payload.preferred_username,
          roles: rawRoles,
          tenantId: tenantAttr
        };
      }
    } else {
      const mockRoles = request.headers ? request.headers['x-mock-roles'] : undefined;
      if (mockRoles && typeof mockRoles === 'string') {
        rawRoles = mockRoles.split(',').map(r => r.trim());
        request.user = {
          id: request.headers['x-mock-user-id'] || 'u-1',
          roles: rawRoles,
          tenantId: request.headers['x-mock-tenant-id'] || request.headers['x-tenant-id'] || 'test-college'
        };
      }
    }

    // Build unified roles set
    const userRoles = new Set<string>();
    for (const r of rawRoles) {
      userRoles.add(r);
      const lower = r.toLowerCase();
      if (lower === 'superadmin' || lower === 'super_admin') {
        userRoles.add('SUPER_ADMIN');
        userRoles.add('superadmin');
      }
      if (lower === 'tenantadmin' || lower === 'college_admin' || lower === 'admin') {
        userRoles.add('COLLEGE_ADMIN');
        userRoles.add('tenantadmin');
      }
      if (lower === 'instructor' || lower === 'primary_trainer' || lower === 'trainer') {
        userRoles.add('PRIMARY_TRAINER');
        userRoles.add('INSTRUCTOR');
        userRoles.add('instructor');
      }
      if (lower === 'teaching_assistant' || lower === 'assistant') {
        userRoles.add('TEACHING_ASSISTANT');
        userRoles.add('assistant');
      }
      if (lower === 'student') {
        userRoles.add('STUDENT');
        userRoles.add('student');
      }
    }

    // Write the normalized role set back so controllers can rely on canonical
    // names (e.g. `includes('superadmin')`) regardless of whether the caller
    // came in via a JWT (realm roles) or the mock header (raw, e.g.
    // 'SUPER_ADMIN'). Without this, a mock super-admin call is treated as a
    // non-admin scoped to tenant 'test-college' and sees zero users (#fix).
    if (request.user) {
      request.user.roles = [...userRoles];
    }

    const hasRole = requiredRoles.some((role) => userRoles.has(role));
    return hasRole;
  }
}
