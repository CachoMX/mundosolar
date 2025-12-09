/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  // Exclude mobile app folder from Next.js build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    dirs: ['src', 'app', 'components', 'lib'],
  },
  // Exclude mundosolar-app from webpack compilation
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /mundosolar-app/,
      loader: 'ignore-loader',
    });
    return config;
  },
}

module.exports = nextConfig
