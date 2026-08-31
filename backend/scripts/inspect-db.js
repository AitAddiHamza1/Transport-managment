const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables WHERE table_schema='public';
  `;
  console.log('Tables:', tables);

  const settings = await prisma.$queryRaw`
    SELECT * FROM "company_settings";
  `;
  console.log('Settings rows:', settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
