import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, nom: true, email: true, companyId: true, statut: true, role: { select: { nom: true } } }
  });
  console.log('=== USERS ===');
  console.log(JSON.stringify(users, null, 2));

  const companies = await prisma.company.findMany();
  console.log('=== COMPANIES ===');
  console.log(JSON.stringify(companies, null, 2));

  const clients = await prisma.client.findMany({
    select: { id: true, nomEntreprise: true, companyId: true, ice: true }
  });
  console.log('=== CLIENTS ===');
  console.log(JSON.stringify(clients, null, 2));

  const factures = await prisma.facture.findMany({
    select: { id: true, numeroFacture: true, nomClient: true, companyId: true, montantTotal: true }
  });
  console.log('=== FACTURES ===');
  console.log(JSON.stringify(factures, null, 2));

  const paiements = await prisma.paiementClient.findMany({
    select: { id: true, numeroFacture: true, nomClient: true, montantRecu: true, datePaiement: true }
  });
  console.log('=== PAIEMENTS ===');
  console.log(JSON.stringify(paiements, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
