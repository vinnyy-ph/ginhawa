import { withAuth } from "next-auth/middleware";

export default withAuth;

export const config = {
  matcher: [
    "/appointments/:path*",
    "/records/:path*",
    "/notifications/:path*",
    "/profile/:path*",
    "/doctor/:path*",
    "/onboarding/:path*",
    "/consultation/:path*",
  ],
};
