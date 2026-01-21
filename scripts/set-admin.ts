import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find user by email pattern in auth or by listing all profiles
  const profiles = await prisma.profiles.findMany({
    take: 10,
  });

  console.log('Found profiles:', profiles);

  if (profiles.length > 0) {
    // Update first profile to admin
    const updated = await prisma.profiles.updateMany({
      where: {},
      data: { role: 'admin' },
    });
    console.log('Updated profiles to admin:', updated);
  } else {
    console.log('No profiles found');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
