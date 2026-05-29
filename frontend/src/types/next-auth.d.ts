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
