/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // ✅ Moved OUT of experimental (Next.js 15+)
  serverExternalPackages: ["@prisma/client", "bcrypt"],
}

module.exports = nextConfig
