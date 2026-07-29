import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // No roles required, access granted
    }

    const request = context.switchToHttp().getRequest<Record<string, any>>();
    const mockRoles = request['headers'] ? request['headers']['x-mock-roles'] : undefined;
    
    // Simulate simple user object injection since auth isn't fully built yet
    if (!mockRoles || typeof mockRoles !== 'string') {
      return false;
    }
    const userRoles = mockRoles.split(',').map(r => r.trim());

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
