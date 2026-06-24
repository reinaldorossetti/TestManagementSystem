import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
