import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "geolocation=(), microphone=(), camera=()",
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Inline the (small) Tailwind CSS bundle into the <head> instead of
    // loading it via a render-blocking <link>. Site is atomic-CSS and most
    // visitors are first-timers, so the caching trade-off is worth the LCP
    // win. See: next/docs/.../inlineCss.md
    inlineCss: true,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/oauth/metadata/authorization-server",
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/oauth/metadata/protected-resource",
      },
    ];
  },
};

export default nextConfig;
