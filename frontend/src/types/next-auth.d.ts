/**
 * Module augmentations for next-auth.
 *
 * Extends the default `Session`, `User`, and `JWT` interfaces to include the
 * application-specific fields returned by the NestJS backend upon login:
 * `role` (e.g. "patient" | "doctor") and `accessToken` (JWT for API calls).
 * These additions make the extra fields available on `useSession()` / `getToken()`
 * without casts throughout the codebase.
 */

import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      accessToken: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
    accessToken: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    name: string | null;
    role: string;
    accessToken: string;
  }
}
