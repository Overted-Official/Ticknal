/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["onnxruntime-node"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "framerusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.framerusercontent.com",
        pathname: "/**",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/**": [
      "./src/strategies/Thoth/models/**/*",
      "./src/strategies/PSI/data/**/*",
      "./Data/psi_*best*.csv",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/**/*.so*",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/**/*.node",
    ],
    "/api/**/*": [
      "./src/strategies/Thoth/models/**/*",
      "./src/strategies/PSI/data/**/*",
      "./Data/psi_*best*.csv",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/**/*.so*",
      "./node_modules/onnxruntime-node/bin/napi-v6/linux/**/*.node",
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/charts',
        destination: '/invest',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      { source: '/api/signals', destination: '/api/strategy/signals' },
      { source: '/api/metrics', destination: '/api/strategy/metrics' },
      { source: '/api/strategy-levels', destination: '/api/strategy/levels' },
      { source: '/api/predict', destination: '/api/strategy/predict' },
      { source: '/api/quote', destination: '/api/market/quote' },
      { source: '/api/tickers', destination: '/api/market/tickers' },
      { source: '/api/macro/inflation', destination: '/api/market/inflation' },
      { source: '/api/positions', destination: '/api/user/positions' },
      { source: '/api/system-logs', destination: '/api/user/system-logs' },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
