/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@woo-ai/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig
