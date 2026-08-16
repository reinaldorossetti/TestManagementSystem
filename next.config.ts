import type { NextConfig } from 'next';
import path from 'node:path';

const isStaticExport = process.env.BUILD_TARGET === 'static' || process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isStaticExport ? 'export' : undefined,
  images: {
    unoptimized: isStaticExport ? true : undefined,
  },
  basePath: isStaticExport ? '/TestManagementSystem' : '',
  assetPrefix: isStaticExport ? '/TestManagementSystem/' : undefined,
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
