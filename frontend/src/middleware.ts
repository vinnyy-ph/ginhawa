import { withAuth } from "next-auth/middleware";

export default withAuth;

export const config = {
  matcher: [
    "/dashboard",
    "/doctor/dashboard",
    "/onboarding/:path*"
  ],
};
