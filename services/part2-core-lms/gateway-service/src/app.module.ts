import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const JWT_SECRET = process.env.JWT_SECRET || 'lms-super-secret-key-change-in-production';

@Module({
  imports: [
    // Rate limiting: 100 requests per minute
    ThrottlerModule.forRoot([
      { ttl: 60000, limit: 100 },
    ]),
    // JWT with 24h expiry
    JwtModule.register({
      global: true,
      secret: JWT_SECRET,
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AppController, AuthController],
  providers: [AppService, AuthService],
})
export class AppModule {}
