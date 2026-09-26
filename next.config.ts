/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@ticknal/quant-engine", "@ticknal/types"],
  serverExternalPackages: ["onnxruntime-node", "onnxruntime-web", "@electric-sql/pglite"],
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
    "/api/[[...slug]]": [
      "./src/strategies/THOTH_EGX_V3_7P/artifacts/**/*",
      "./src/strategies/PSI/data/**/*",
      "./Data/psi_*best*.csv",
      "./src/tools/kronos/models/**/*.onnx",
      "./node_modules/onnxruntime-web/dist/**/*",
      "./node_modules/onnxruntime-web/dist/*.wasm",
      "./node_modules/onnxruntime-web/dist/*.mjs",
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
        source: '/invest',
        has: [
          {
            type: 'query',
            key: 'view',
            value: 'sectors',
          },
        ],
        destination: '/markets',
        permanent: true,
      },
      {
        source: '/invest',
        destination: '/charts',
        permanent: true,
      },
      {
        source: '/sectors',
        destination: '/markets',
        permanent: true,
      },
      {
        source: '/analysis',
        destination: '/charts',
        permanent: true,
      },
      {
        source: '/positions',
        destination: '/transactions',
        permanent: true,
      },
      {
        source: '/money',
        destination: '/transactions',
        permanent: true,
      },
      {
        source: '/wallet',
        destination: '/transactions',
        permanent: true,
      },
      {
        source: '/dashboard',
        destination: '/home',
        permanent: true,
      },
      {
        source: '/dashboard/:path*',
        destination: '/home',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/auth/callback',
        destination: '/api/auth/callback',
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
