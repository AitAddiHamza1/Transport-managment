/**
 * Seed Prisma — garantit les rôles applicatifs et le premier compte ADMIN_GENERAL.
 *
 * Comportement :
 * - Les rôles sont créés ou mis à jour (idempotent).
 * - Le compte ADMIN_GENERAL est créé UNIQUEMENT s'il n'existe pas encore.
 * - Un compte ADMIN_GENERAL existant n'est JAMAIS modifié (mot de passe, rôle, statut inchangés).
 * - Les variables SEED_ADMIN_NAME, SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD sont OBLIGATOIRES.
 * - En cas de variables manquantes, le seed échoue clairement avec un message explicite.
 *
 * Idempotence garantie : rejouer `npm run db:seed` est toujours sûr.
 *
 * Exécution : npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Profils applicatifs (rôles). ADMIN_GENERAL = super-administrateur (gère les utilisateurs).
const ROLES: { nom: string; description: string }[] = [
  { nom: 'ADMIN_GENERAL', description: 'Administrateur Général — accès total, gère les utilisateurs et leurs permissions' },
  { nom: 'ADMINISTRATEUR', description: 'Administrateur — accès étendu (hors gestion des utilisateurs)' },
  { nom: 'EXPLOITANT', description: 'Exploitation : voyages, véhicules, conducteurs, clients, documents' },
  { nom: 'COMPTABLE', description: 'Comptabilité : factures, créances, dettes, paiements' },
  { nom: 'CHAUFFEUR', description: 'Chauffeur : consultation des voyages et saisies terrain' },
  { nom: 'PERSONNALISE', description: 'Profil personnalisé — permissions définies au cas par cas' },
  { nom: 'ADMIN', description: 'Administrateur — accès total (alias SQL, conservé pour compatibilité)' },
  { nom: 'GESTIONNAIRE', description: 'Gestionnaire — gestion opérationnelle (alias SQL)' },
];

async function main() {
  // ── Validation des variables d'environnement ─────────────────────────────
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  const adminName = process.env.SEED_ADMIN_NAME?.trim();

  if (!adminEmail || !adminPassword || !adminName) {
    throw new Error(
      'Variables requises manquantes.\n' +
        'Définissez SEED_ADMIN_NAME, SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD dans votre fichier .env.\n' +
        'Exemple : SEED_ADMIN_EMAIL=admin@votreentreprise.com',
    );
  }

  if (adminPassword.length < 6) {
    throw new Error('Le mot de passe SEED_ADMIN_PASSWORD doit contenir au moins 6 caractères.');
  }

  if (adminPassword.length > 72) {
    throw new Error('Le mot de passe SEED_ADMIN_PASSWORD ne doit pas dépasser 72 caractères.');
  }

  // ── 1. Garantir les rôles ─────────────────────────────────────────────────
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { nom: role.nom },
      update: { description: role.description },
      create: role,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`Seed : ${ROLES.length} rôles garantis.`);

  // ── 2. Trouver le rôle ADMIN_GENERAL dynamiquement ───────────────────────
  const adminRole = await prisma.role.findUnique({ where: { nom: 'ADMIN_GENERAL' } });
  if (!adminRole) {
    throw new Error('Rôle ADMIN_GENERAL introuvable après insertion. Vérifiez la liste des rôles dans seed.ts.');
  }

  // ── 3. Créer le premier ADMIN_GENERAL uniquement s'il est absent ─────────
  // Un compte existant n'est jamais modifié (mot de passe, rôle, statut inchangés).
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existingAdmin) {
    // eslint-disable-next-line no-console
    console.log(`Seed : Administrateur Général déjà existant (${adminEmail}). Aucune modification effectuée.`);
  } else {
    // Hash du mot de passe — même convention que UsersService (bcrypt, 10 rounds)
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        nom: adminName,
        email: adminEmail,
        motDePasse: hashedPassword,
        idRole: adminRole.id,
        statut: 'ACTIF',
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Seed : Administrateur Général créé (${adminEmail}, profil ADMIN_GENERAL).`);
  }
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('Seed échoué :', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
