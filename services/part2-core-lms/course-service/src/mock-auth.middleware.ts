import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class MockAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // In a real app, this would verify a JWT.
    // For this e2e test, we will read a simulated header.
    const simulateRoles = req.headers['x-mock-roles'] as string;
    if (simulateRoles) {
      req['user'] = { roles: simulateRoles.split(',') };
    }
    next();
  }
}
