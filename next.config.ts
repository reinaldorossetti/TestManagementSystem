import type { NextConfig } from 'next';
import path from 'node:path';

const isGithubPages = process.env.IS_GITHUB_PAGES === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  basePath: isGithubPages ? '/TestManagementSystem' : '',
  assetPrefix: isGithubPages ? '/TestManagementSystem/' : undefined,
  serverExternalPackages: ['@libsql/client', '@prisma/adapter-libsql'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
