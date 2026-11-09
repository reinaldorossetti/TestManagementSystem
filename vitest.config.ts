import path from 'node:path';

const config = {
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/server/services/testRunScorecard.test.ts',
      'src/server/validation/testRunSchemas.test.ts',
      'src/components/testRuns/**/*.test.tsx',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
};

export default config;
