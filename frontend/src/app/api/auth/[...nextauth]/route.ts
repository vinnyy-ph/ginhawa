/**
 * Route: /api/auth/[...nextauth] — NextAuth.js catch-all API route.
 *
 * Auth strategy: JWT sessions (no database adapter). The single provider is
 * CredentialsProvider, which forwards credentials to the NestJS backend
 * (POST /auth/login) and returns the JWT access token + user role on success.
 *
 * Callbacks:
 *   - jwt:     Persists `id`, `role`, and `accessToken` into the JWT on first
 *              login; handles `trigger === 'update'` so the onboarding step can
 *              refresh the cached display name without a full re-login.
 *   - session: Projects token claims onto `session.user` for client-side access.
 *
 * Custom pages: sign-in redirects to /login instead of the default NextAuth UI.
 */
import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { apiRequest, ApiError } from '@/lib/api-client';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const data = await apiRequest<{ access_token: string, user: { id: string, email: string, name: string | null, role: string } }>('/auth/login', {
            method: 'POST',
            body: {
              email: credentials.email,
              password: credentials.password,
            },
          });

          if (data?.access_token) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              role: data.user.role,
              accessToken: data.access_token,
            };
          }
          return null;
        } catch (error) {
          if (error instanceof ApiError) {
            console.error('Login failed:', error.message);
          }
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.role = user.role;
        token.accessToken = user.accessToken;
      }
      // Onboarding sets the profile name after signup; refresh the cached
      // token via update() so the greeting shows the real name immediately.
      if (trigger === 'update' && typeof session?.name === 'string') {
        token.name = session.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.role = token.role;
        session.user.accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
