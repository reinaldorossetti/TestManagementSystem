import { prisma } from '@/src/lib/db';
import { seedDatabase } from '@/src/server/db/seed';

async function main(): Promise<void> {
  await seedDatabase(prisma);
  console.log('Database seeded with the canonical TMS demo dataset.');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
