import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Explicitly expose env vars to the Edge Runtime (middleware).
  // process.env from .env.local is read here at startup, then inlined.
  env: {
    LDAP_ENABLED: process.env.LDAP_ENABLED ?? '',
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
