import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: false },
      { source: "/dashboard/appointments", destination: "/appointments", permanent: false },
      { source: "/dashboard/records", destination: "/records", permanent: false },
      { source: "/dashboard/notifications", destination: "/notifications", permanent: false },
      { source: "/dashboard/profile", destination: "/profile", permanent: false },
      { source: "/dashboard/find-doctors", destination: "/doctors", permanent: false },
      { source: "/dashboard/find-doctors/:id", destination: "/doctors/:id", permanent: false },
      { source: "/dashboard/ai-recommendations", destination: "/recommendations", permanent: false },
    ];
  },
};

export default nextConfig;
