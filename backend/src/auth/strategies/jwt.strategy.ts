/**
 * Passport JWT strategy.
 *
 * Extracts the bearer token from the Authorization header, verifies its
 * signature and expiry, and maps the decoded payload onto the `req.user`
 * object that guards and controllers consume.
 */
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';

/** Shape of the JWT body signed in AuthService.login. */
type JwtPayload = {
  sub: string; // user id
  email: string;
  role: Role;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // expired tokens are rejected
      secretOrKey: process.env.JWT_SECRET ?? 'secretKey',
    });
  }

  /**
   * Runs after the signature is verified. The returned object becomes
   * `req.user`; `sub` is normalized to `id` for the rest of the app.
   */
  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
