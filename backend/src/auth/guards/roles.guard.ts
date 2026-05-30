/**
 * Role-based authorization guard (registered as APP_GUARD, runs after
 * JwtAuthGuard).
 *
 * Routes declare their requirement with `@Roles(Role.DOCTOR, ...)`. Routes
 * with no `@Roles(...)` are allowed for any authenticated user.
 */
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // No @Roles() on the route → no role restriction.
    if (!requiredRoles) {
      return true;
    }

    // req.user was attached by JwtAuthGuard / JwtStrategy.validate.
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { role?: Role } }>();

    const userRole = request.user?.role;
    if (!userRole) {
      return false;
    }

    // Allow if the user holds any one of the required roles.
    return requiredRoles.some((role) => userRole === role);
  }
}
