const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAdmin() {
  try {
    const users = await prisma.user.findMany({ select: { id: true, email: true, idRole: true } });
    console.log('Active Users in DB:', users);
  } finally {
    await prisma.$disconnect();
  }
}

findAdmin();
