/**
 * Authentication module: configures Passport + JWT and exposes AuthService.
 *
 * Tokens expire after 1 day. Exports `JwtModule` so other modules (e.g. the
 * Passport strategy) can verify tokens with the same secret.
 */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      // NOTE: the 'secretKey' fallback is for local dev only; JWT_SECRET MUST
      // be set in any deployed environment.
      secret: process.env.JWT_SECRET || 'secretKey',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
