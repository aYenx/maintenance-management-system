/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    fontLoaders: [
      { loader: '@next/font/google', options: { subsets: ['latin'] } },
    ],
  },
  // 临时禁用字体优化
  optimizeFonts: false,
}

module.exports = nextConfig
