import type { NextConfig } from 'next';
import path from 'node:path';

const isStaticExport = process.env.BUILD_TARGET === 'static';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isStaticExport ? 'export' : undefined,
  images: {
    unoptimized: isStaticExport ? true : undefined,
  },
  basePath: isStaticExport ? '/TestManagementSystem' : '',
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
