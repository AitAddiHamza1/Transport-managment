import { PrismaClient, ContratType, EmployeStatut, ConducteurStatut, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const args = process.argv.slice(2);
  const confirm = args.includes('--confirm');

  if (!confirm) {
    console.log('==================================================');
    console.log('WARNING: This script will delete ALL operational test data:');
    console.log('voyages, factures, payments, driver profiles, and employees.');
    console.log('Configuration metadata (roles, permissions, admin user, company settings) will be preserved.');
    console.log('To run this script, append --confirm.');
    console.log('Example: npx ts-node --transpile-only scripts/reset-phase6d-test-data.ts --confirm');
    console.log('==================================================');

    // Print record counts
    try {
      const versementsCount = await prisma.versementEmploye.count();
      const paiementsEmpCount = await prisma.paiementEmploye.count();
      const docsEmpCount = await prisma.documentEmploye.count();
      const docsCondCount = await prisma.documentConducteur.count();
      const paiementsClientCount = await prisma.paiementClient.count();
      const creancesCount = await prisma.creanceClient.count();
      const facturesCount = await prisma.facture.count();
      const voyagesCount = await prisma.voyage.count();
      const conducteursCount = await prisma.conducteur.count();
      const employesCount = await prisma.employe.count();

      console.log('\nCurrent Database Record Counts:');
      console.log(`- Versements employés: ${versementsCount}`);
      console.log(`- Paiements employés: ${paiementsEmpCount}`);
      console.log(`- Documents employés: ${docsEmpCount}`);
      console.log(`- Documents conducteurs: ${docsCondCount}`);
      console.log(`- Paiements clients: ${paiementsClientCount}`);
      console.log(`- Créances clients: ${creancesCount}`);
      console.log(`- Factures: ${facturesCount}`);
      console.log(`- Voyages: ${voyagesCount}`);
      console.log(`- Conducteurs: ${conducteursCount}`);
      console.log(`- Employés: ${employesCount}`);
    } catch (err) {
      console.error('Error fetching record counts:', err);
    }
    process.exit(0);
  }

  console.log('[RESET] Starting transactional test data cleanup...');
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Delete in FK-safe order
      await tx.versementEmploye.deleteMany();
      await tx.paiementEmploye.deleteMany();
      await tx.documentEmploye.deleteMany();
      await tx.documentConducteur.deleteMany();
      await tx.paiementClient.deleteMany();
      await tx.creanceClient.deleteMany();
      // Unlink voyages from invoices first if needed
      await tx.facture.deleteMany();
      // Set voyages status to LIVRE/PLANIFIE or delete voyages
      await tx.voyage.deleteMany();
      await tx.conducteur.deleteMany();
      await tx.employe.deleteMany();
      
      // Reset sequences
      await tx.$executeRaw`DELETE FROM employe_sequences;`;
      await tx.$executeRaw`DELETE FROM invoice_sequences;`;

      console.log('  ✓ Deletions completed safely.');

      // 2. Seed development fixture (Mohamed Alli)
      // Concurrency-safe employee sequence record creation
      await tx.$executeRaw`
        INSERT INTO employe_sequences (prefixe, dernier_numero)
        VALUES ('EMP', 1);
      `;
      const matricule = 'EMP-0001';

      const employee = await tx.employe.create({
        data: {
          matricule,
          nom: 'Alli',
          prenom: 'Mohamed',
          poste: 'Conducteur',
          typeContrat: ContratType.CDI,
          salaireBase: new Prisma.Decimal('5000.00'),
          statut: EmployeStatut.ACTIF,
          dateEmbauche: new Date('2026-08-01'),
          telephone: '+212600889900',
          adresse: 'Casablanca',
        }
      });

      console.log(`  ✓ Seeded Employee profile: ${employee.prenom} ${employee.nom} (${employee.matricule})`);

      const driver = await tx.conducteur.create({
        data: {
          idEmploye: employee.id,
          nomConducteur: `${employee.prenom} ${employee.nom}`,
          telephone: employee.telephone,
          adresse: employee.adresse,
          statut: ConducteurStatut.DISPONIBLE,
        }
      });

      console.log(`  ✓ Seeded linked Conducteur profile (ID: ${driver.id}, Status: ${driver.statut})`);
    });

    console.log('[RESET] Database reset and seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[RESET] Failed to reset database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
