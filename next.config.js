/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['supabase.co'],
  },
  // Optimize for production
  productionBrowserSourceMaps: false,
  experimental: {
    isrMemoryCacheSize: 52 * 1024 * 1024, // 52 MB
  },
};

module.exports = nextConfig;
