import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { statut: 'ACTIF' },
    select: {
      id: true,
      nom: true,
      email: true,
      companyId: true,
      role: { select: { nom: true } },
      company: { select: { id: true, nom: true, statut: true } },
    },
  });
  console.log('ACTIVE USERS IN DATABASE:');
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
