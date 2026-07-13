/**
 * Seed Prisma — insère les rôles applicatifs par défaut et l'administrateur par défaut.
 * Idempotent : peut être rejoué sans créer de doublons.
 *
 * Exécution : npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLES: { nom: string; description: string }[] = [
  { nom: 'ADMIN', description: 'Administrateur système, accès total' },
  { nom: 'GESTIONNAIRE', description: 'Gestion opérationnelle : voyages, véhicules, conducteurs, clients' },
  { nom: 'COMPTABLE', description: 'Facturation, créances, dettes et comptabilité' },
  { nom: 'OPERATEUR', description: 'Saisie et suivi des voyages' },
  { nom: 'CONDUCTEUR', description: 'Application mobile conducteur' },
];

async function main() {
  // 1. Garantir les rôles
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { nom: role.nom },
      update: { description: role.description },
      create: role,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seed terminé : ${ROLES.length} rôles garantis.`);

  // 2. Garantir l'administrateur par défaut
  const adminEmail = 'admin@transport.com';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const adminRole = await prisma.role.findUnique({
      where: { nom: 'ADMIN' },
    });
    if (!adminRole) {
      throw new Error("Rôle ADMIN introuvable dans la base de données.");
    }

    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    await prisma.user.create({
      data: {
        nom: 'Administrateur',
        email: adminEmail,
        motDePasse: hashedPassword,
        idRole: adminRole.id,
        statut: 'ACTIF',
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Utilisateur administrateur créé : ${adminEmail}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(`L'utilisateur administrateur existe déjà : ${adminEmail}`);
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
