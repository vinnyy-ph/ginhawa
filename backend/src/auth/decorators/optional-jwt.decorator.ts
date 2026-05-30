import { SetMetadata } from '@nestjs/common';

/** Metadata key read by JwtAuthGuard to detect optional-auth routes. */
export const OPTIONAL_JWT_KEY = 'optional_jwt';

/**
 * Marks a route as optionally authenticated: a valid token populates
 * `req.user`, but the request is allowed through even without one. Used by
 * endpoints that serve both guests and signed-in users.
 */
export const OptionalJwt = () => SetMetadata(OPTIONAL_JWT_KEY, true);
