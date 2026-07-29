import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { auditStorage } from './audit-context';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // In a real application, extract the User ID from the validated JWT (req.user)
    const simulatedUserId = req.headers['x-mock-user-id'] as string || 'system-user';
    
    auditStorage.run({ userId: simulatedUserId }, () => {
      next();
    });
  }
}
