import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { generateSecureTemporaryPassword } from '../modules/company-provisioning/company-provisioning.service';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') continue;
    if (arg.startsWith('--') || arg.startsWith('-')) {
      const trimmed = arg.replace(/^-+/, '');
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex !== -1) {
        const key = trimmed.substring(0, eqIndex);
        let val = trimmed.substring(eqIndex + 1);
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        result[key] = val;
      } else {
        const key = trimmed;
        if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          let val = args[++i];
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          result[key] = val;
        } else {
          result[key] = 'true';
        }
      }
    }
  }

  if (!result.name && !result.adminName && !result.n) {
    const envName = process.env.npm_config_name || process.env.npm_config_adminname || process.env.npm_config_admin_name;
    if (envName) {
      result.name = envName;
    }
  }

  if (!result.email && !result.adminEmail && !result.e) {
    const envEmail = process.env.npm_config_email || process.env.npm_config_adminemail || process.env.npm_config_admin_email;
    if (envEmail) {
      result.email = envEmail;
    }
  }

  return result;
}

async function bootstrap() {
  const parsed = parseArgs(process.argv.slice(2));

  const adminName = parsed.adminName || parsed.name || parsed.n;
  const adminEmail = parsed.adminEmail || parsed.email || parsed.e;

  if (!adminName || !adminEmail) {
    // eslint-disable-next-line no-console
    console.error(`
❌ ERREUR DE PROVISIONNEMENT PLATFORME : Arguments requis manquants.

USAGE :
  npm run provision:platform-admin -- --name="<Nom Admin>" --email="<Email Admin>"

EXEMPLE :
  npm run provision:platform-admin -- --name="Karim Admin" --email="admin@platform.ma"
`);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const prisma = app.get(PrismaService);
    const emailFormatted = adminEmail.trim().toLowerCase();

    const existing = await prisma.platformAdmin.findUnique({
      where: { email: emailFormatted },
    });

    if (existing) {
      // eslint-disable-next-line no-console
      console.error(`❌ L'adresse e-mail « ${emailFormatted} » est déjà utilisée par un autre administrateur plateforme.`);
      process.exitCode = 1;
      return;
    }

    const temporaryPassword = generateSecureTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);

    const platformAdmin = await prisma.platformAdmin.create({
      data: {
        nom: adminName.trim(),
        email: emailFormatted,
        motDePasse: hashedPassword,
        statut: 'ACTIF',
        mustChangePassword: true,
      },
    });

    // eslint-disable-next-line no-console
    console.log(`
=====================================================================
        ADMINISTRATEUR PLATEFORME PROVISIONNÉ AVEC SUCCÈS
=====================================================================
  ID Administrateur  : ${platformAdmin.id}
  Nom Administrateur : ${platformAdmin.nom}
  E-mail             : ${platformAdmin.email}
  Statut             : ${platformAdmin.statut}
---------------------------------------------------------------------
  MOT DE PASSE TEMPORAIRE — CHANGEMENT OBLIGATOIRE À LA PREMIÈRE CONNEXION :
  👉  ${temporaryPassword}
=====================================================================
`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`
❌ ÉCHEC DU PROVISIONNEMENT PLATEFORME :
  ${(error as Error).message}
`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
