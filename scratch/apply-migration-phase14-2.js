const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('=== APPLYING PHASE 14.2 ADDITIVE SQL MIGRATION ===');

    // 1. Independent Column Addition
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "voyages" ADD COLUMN IF NOT EXISTS "id_client" INTEGER;
    `);
    console.log('✓ Column id_client added/verified on voyages');

    // 2. Independent Index Creation
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "voyages_id_client_idx" ON "voyages"("id_client");
    `);
    console.log('✓ Index voyages_id_client_idx created/verified');

    // 3. Guarded Foreign Key Addition
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'voyages_id_client_fkey'
          ) THEN
              ALTER TABLE "voyages" 
                ADD CONSTRAINT "voyages_id_client_fkey" 
                FOREIGN KEY ("id_client") REFERENCES "clients"("id") 
                ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
      END $$;
    `);
    console.log('✓ Foreign key voyages_id_client_fkey created/verified');

    // 4. Create Table company_settings
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_settings" (
          "id" SERIAL NOT NULL,
          "singleton_key" VARCHAR(20) NOT NULL DEFAULT 'DEFAULT',
          "nom_entreprise" VARCHAR(150),
          "nom_legal" VARCHAR(150),
          "adresse" VARCHAR(255),
          "ville" VARCHAR(100),
          "pays" VARCHAR(100),
          "telephone" VARCHAR(30),
          "telephone_secondaire" VARCHAR(30),
          "email" CITEXT,
          "site_web" VARCHAR(150),
          "ice" VARCHAR(15),
          "identifiant_fiscal" VARCHAR(30),
          "registre_commerce" VARCHAR(60),
          "patente" VARCHAR(30),
          "cnss" VARCHAR(30),
          "nom_banque" VARCHAR(100),
          "rib" VARCHAR(50),
          "iban" VARCHAR(50),
          "swift_bic" VARCHAR(20),
          "taux_tva_par_defaut" DECIMAL(5,2) NOT NULL DEFAULT 20.00,
          "delai_paiement_par_defaut" INTEGER NOT NULL DEFAULT 30,
          "devise" VARCHAR(3) NOT NULL DEFAULT 'MAD',
          "prefixe_facture" VARCHAR(10) DEFAULT '',
          "separateur_facture" VARCHAR(2) NOT NULL DEFAULT '-',
          "padding_facture" INTEGER NOT NULL DEFAULT 1,
          "template_facture" VARCHAR(30) NOT NULL DEFAULT 'CLASSIC_TRANSPORT',
          "texte_pied_de_page" VARCHAR(500),
          "note_legale_tva" VARCHAR(500),
          "logo_filename" VARCHAR(255),
          "logo_original_name" VARCHAR(255),
          "logo_mime_type" VARCHAR(100),
          "logo_size" INTEGER,
          "logo_path" VARCHAR(500),
          "stamp_filename" VARCHAR(255),
          "stamp_original_name" VARCHAR(255),
          "stamp_mime_type" VARCHAR(100),
          "stamp_size" INTEGER,
          "stamp_path" VARCHAR(500),
          "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "company_settings_singleton_key_key" UNIQUE ("singleton_key")
      );
    `);
    console.log('✓ Table company_settings created/verified');

    // 5. Add CHECK Constraint singleton_key = 'DEFAULT'
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'company_settings_singleton_key_check'
          ) THEN
              ALTER TABLE "company_settings"
                ADD CONSTRAINT "company_settings_singleton_key_check"
                CHECK ("singleton_key" = 'DEFAULT');
          END IF;
      END $$;
    `);
    console.log('✓ Check constraint company_settings_singleton_key_check created/verified');

    // 6. Seed Empty Initial Single Profile Row
    await prisma.$executeRawUnsafe(`
      INSERT INTO "company_settings" ("singleton_key") VALUES ('DEFAULT') ON CONFLICT ("singleton_key") DO NOTHING;
    `);
    console.log('✓ Single profile row with DEFAULT key seeded/verified');

    // 7. Create Table invoice_sequences
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "invoice_sequences" (
          "annee" INTEGER NOT NULL,
          "dernier_numero" INTEGER NOT NULL DEFAULT 0,
          CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("annee")
      );
    `);
    console.log('✓ Table invoice_sequences created/verified');

    console.log('\n=== VERIFYING CONSTRAINTS AND SCHEMAS DIRECTLY IN POSTGRESQL ===');
    const csRows = await prisma.companySettings.findMany();
    console.log(`CompanySettings row count: ${csRows.length}`);
    console.log(`CompanySettings row[0] singletonKey: ${csRows[0]?.singletonKey}`);

    const seqRows = await prisma.invoiceSequence.findMany();
    console.log(`InvoiceSequence row count: ${seqRows.length}`);

    console.log('\n=== MIGRATION SUCCESSFULLY COMPLETED ===');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
