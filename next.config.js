/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Static export for serving via Express on Render
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true, // For better compatibility with Express static serving
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
}

module.exports = nextConfig
