import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as crypto from 'crypto';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Cache of Keycloak JWKS public keys
let jwksCache: any[] = [];
let lastFetched = 0;

async function getJwksKeys(): Promise<any[]> {
  const now = Date.now();
  // Cache keys for 5 minutes
  if (jwksCache.length > 0 && (now - lastFetched) < 5 * 60 * 1000) {
    return jwksCache;
  }

  const keycloakUrl = process.env.KEYCLOAK_URL || 'http://keycloak:8080';
  const certsUrl = `${keycloakUrl}/auth/realms/sannalms/protocol/openid-connect/certs`;

  try {
    const res = await fetch(certsUrl);
    const data = await res.json();
    if (data && data.keys) {
      jwksCache = data.keys;
      lastFetched = now;
      return jwksCache;
    }
  } catch (err) {
    console.error('Failed to fetch Keycloak JWKS keys from: ' + certsUrl, err);
  }
  return jwksCache;
}

async function verifyToken(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    
    if (header.alg !== 'RS256') return null;

    const keys = await getJwksKeys();
    const key = keys.find(k => k.kid === header.kid);
    if (!key || !key.x5c || !key.x5c[0]) return null;

    // Format cert as PEM
    const cert = `-----BEGIN CERTIFICATE-----\n${key.x5c[0].match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`;

    // Verify signature
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(`${headerB64}.${payloadB64}`);
    const isVerified = verify.verify(cert, signatureB64, 'base64url');

    if (!isVerified) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    
    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return payload;
  } catch (err) {
    console.error('Token verification error', err);
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

    if (!requiredRoles) {
      return true; // No roles required, access granted
    }

    const request = context.switchToHttp().getRequest<any>();
    const authHeader = request.headers ? request.headers['authorization'] : undefined;

    let userRoles: string[] = [];

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await verifyToken(token);
      if (payload) {
        userRoles = payload.realm_access?.roles || [];
        request.user = {
          id: payload.sub,
          email: payload.email,
          username: payload.preferred_username,
          roles: userRoles
        };
      }
    } else {
      // Fallback to mock roles in local development mode only
      const enableMock = process.env.ENABLE_MOCK_AUTH === 'true';
      if (enableMock) {
        const mockRoles = request.headers ? request.headers['x-mock-roles'] : undefined;
        if (mockRoles && typeof mockRoles === 'string') {
          userRoles = mockRoles.split(',').map(r => r.trim());
          request.user = {
            id: request.headers['x-mock-user-id'] || 'u-1',
            roles: userRoles
          };
        }
      }
    }

    // Map Keycloak roles to SannaLMS roles
    const hasRole = requiredRoles.some((role) => {
      if (role === 'SUPER_ADMIN') return userRoles.includes('superadmin') || userRoles.includes('SUPER_ADMIN');
      if (role === 'COLLEGE_ADMIN') return userRoles.includes('tenantadmin') || userRoles.includes('COLLEGE_ADMIN');
      if (role === 'PRIMARY_TRAINER') return userRoles.includes('instructor') || userRoles.includes('PRIMARY_TRAINER');
      if (role === 'STUDENT') return userRoles.includes('student') || userRoles.includes('STUDENT');
      return userRoles.includes(role);
    });

    return hasRole;
  }
}
