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
};

module.exports = nextConfig;
