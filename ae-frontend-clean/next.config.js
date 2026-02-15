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
    // No direct rewrites to the backend: we use the server-side proxy at
    // `/api/proxy/...` instead. Returning empty rewrites prevents direct
    // forwarding to the Railway URL which can cause CORS issues.
    return []
  },
};

module.exports = nextConfig;
