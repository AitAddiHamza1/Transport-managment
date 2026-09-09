import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CompanyProvisioningService } from '../modules/company-provisioning/company-provisioning.service';

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const parts = arg.substring(2).split('=');
      const key = parts[0];
      let val = parts.slice(1).join('=');
      if (!val && i + 1 < args.length && !args[i + 1].startsWith('--')) {
        val = args[++i];
      }
      result[key] = val;
    }
  }
  return result;
}

async function bootstrap() {
  const parsed = parseArgs(process.argv.slice(2));

  const companyName = parsed.companyName || parsed.company || parsed.c;
  const adminName = parsed.adminName || parsed.name || parsed.n;
  const adminEmail = parsed.adminEmail || parsed.email || parsed.e;

  if (!companyName || !adminName || !adminEmail) {
    // eslint-disable-next-line no-console
    console.error(`
❌ ERREUR DE PROVISIONNEMENT : Arguments requis manquants.

USAGE :
  npm run provision:company -- --companyName="<Nom Entreprise>" --adminName="<Nom Admin>" --adminEmail="<Email Admin>"

EXEMPLE :
  npm run provision:company -- --companyName="Transport Atlas" --adminName="Karim Atlas" --adminEmail="contact@atlas.ma"
`);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  try {
    const provisioningService = app.get(CompanyProvisioningService);
    const result = await provisioningService.provisionCompany({
      companyName,
      adminName,
      adminEmail,
    });

    // eslint-disable-next-line no-console
    console.log(`
=====================================================================
            ENTREPRISE PROVISIONNÉE AVEC SUCCÈS
=====================================================================
  ID Entreprise      : ${result.company.id}
  Nom Entreprise     : ${result.company.nom}
  Statut Entreprise  : ${result.company.statut}
---------------------------------------------------------------------
  ID Administrateur  : ${result.admin.id}
  Nom Administrateur : ${result.admin.nom}
  E-mail             : ${result.admin.email}
  Profil Rôle        : ADMIN_GENERAL (Super-administrateur)
---------------------------------------------------------------------
  MOT DE PASSE TEMPORAIRE — CHANGEMENT OBLIGATOIRE À LA PREMIÈRE CONNEXION :
  👉  ${result.temporaryPassword}
=====================================================================
`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`
❌ ÉCHEC DU PROVISIONNEMENT :
  ${(error as Error).message}
`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
