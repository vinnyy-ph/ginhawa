/**
 * Global JWT authentication guard (registered as APP_GUARD).
 *
 * Applies to every route unless the handler opts out via a decorator:
 *  - `@Public()`      → skip auth entirely (always allow).
 *  - `@OptionalJwt()` → attach `req.user` if a valid token is present, but
 *                        allow the request through even when it is missing or
 *                        invalid (used by endpoints that serve both guests and
 *                        signed-in users, e.g. recommendations).
 *  - otherwise        → require a valid token (default Passport behavior).
 */
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { OPTIONAL_JWT_KEY } from '../decorators/optional-jwt.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Read decorator metadata from both the handler and its controller class.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const isOptional = this.reflector.getAllAndOverride<boolean>(
      OPTIONAL_JWT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isOptional) {
      // Run the normal JWT check, but swallow failures: a valid token still
      // populates req.user, while a missing/invalid one just leaves it unset.
      return Promise.resolve(super.canActivate(context))
        .then(() => true)
        .catch(() => true);
    }

    return super.canActivate(context);
  }
}
