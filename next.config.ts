import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Dev only: without this, a phone on a tunnel never gets the scripts that unlock the forms.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok-free.dev", "*.trycloudflare.com"],
  cacheComponents: true,
  partialPrefetching: true,
  // The floating indicator sits on top of the bottom nav's first item.
  devIndicators: false,
  redirects: async () => [{ source: "/", destination: "/tasks", permanent: false }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
