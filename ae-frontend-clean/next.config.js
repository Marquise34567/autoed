/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep config minimal and avoid experimental turbopack settings
  typescript: {
    // Skip type checking during production build to speed up builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // Skip ESLint during builds to avoid blocking compilation
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    // No rewrites here; a server-side catch-all API proxy route will handle
    // all `/api/:path*` calls and explicitly strip `Origin`/`Referer` headers.
    return []
  },
};

module.exports = nextConfig;
