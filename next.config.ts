import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    // unoptimized: true serves images as-is and bypasses Next's optimizer, which
    // is why Supabase images already load without needing the allowlist below.
    unoptimized: true,
    // Carried over from the old next.config.js. It's a no-op while unoptimized is
    // true, but kept here so it's ready if you ever enable image optimization
    // (by removing the unoptimized flag).
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yvrbydctibybhwnbjztu.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  typescript: {
    // Strict checking re-enabled. `tsc --noEmit` shows 0 errors today, so this is
    // safe now and guards against future type regressions slipping into builds.
    ignoreBuildErrors: false,
  },
  reactCompiler: true,
  async redirects() {
    return [
      // The retired SetReady domain is redirected to BGReady permanently (308),
      // preserving the path so deep links and their ranking signals carry over.
      // /api and /auth are excluded: Stripe does not follow redirects on webhook
      // delivery, and the auth callback must complete on the domain that issued
      // the code verifier cookie.
      {
        source: '/:path((?!api/|auth/).*)',
        has: [{ type: 'host', value: '(www\\.)?setready\\.site' }],
        destination: 'https://www.bgready.site/:path',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
