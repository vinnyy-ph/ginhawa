import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

/** Metadata key read by RolesGuard to find a route's required roles. */
export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given role(s). The request is authorized if the
 * authenticated user holds any one of them. Example: `@Roles(Role.DOCTOR)`.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
