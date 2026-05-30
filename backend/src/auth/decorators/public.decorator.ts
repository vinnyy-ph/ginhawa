import { SetMetadata } from '@nestjs/common';

/** Metadata key read by JwtAuthGuard to detect public routes. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public, bypassing the global JwtAuthGuard entirely. Use for
 * unauthenticated entry points such as login, signup, and health checks.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
