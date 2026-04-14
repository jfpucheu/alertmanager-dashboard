import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // With output: 'standalone', the middleware runs in Node.js (not true Edge),
  // so process.env reads runtime env vars from the pod directly.
  // Do NOT inline env vars here — that would bake them in at build time and
  // override whatever the pod sets at runtime.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
