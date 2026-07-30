import { Injectable } from '@nestjs/common';
import { UseCase } from '../../core/base/use-case.interface';

export interface LoginRequest {
  email: string;
  password?: string;
  token?: string; // For OAuth2
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  requiresMfa: boolean;
}

@Injectable()
export class LoginUseCase implements UseCase<LoginRequest, LoginResponse> {
  constructor() {}

  async execute(request: LoginRequest): Promise<LoginResponse> {
    // In a real scenario, this would interact with Keycloak via OIDC or Keycloak Admin API
    // For now, returning a mock successful response structure to demonstrate the architecture
    if (!request.email) {
      throw new Error('Email is required');
    }

    return {
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token',
      requiresMfa: false,
    };
  }
}
