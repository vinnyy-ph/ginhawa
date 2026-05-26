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
          const data = await apiRequest<{ access_token: string, user: { id: string, email: string, role: string } }>('/auth/login', {
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
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
