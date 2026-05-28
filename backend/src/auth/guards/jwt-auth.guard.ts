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
      return Promise.resolve(super.canActivate(context))
        .then(() => true)
        .catch(() => true);
    }

    return super.canActivate(context);
  }
}
