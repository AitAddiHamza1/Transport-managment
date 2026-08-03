import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

// Modules métier (18 tables)
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { ClientsModule } from './modules/clients/clients.module';
import { ConducteursModule } from './modules/conducteurs/conducteurs.module';
import { VehiculesModule } from './modules/vehicules/vehicules.module';
import { DocumentsVehiculesModule } from './modules/documents-vehicules/documents-vehicules.module';
import { DocumentsConducteursModule } from './modules/documents-conducteurs/documents-conducteurs.module';
import { VoyagesModule } from './modules/voyages/voyages.module';
import { BonsCarburantModule } from './modules/bons-carburant/bons-carburant.module';
import { DepensesVehiculesModule } from './modules/depenses-vehicules/depenses-vehicules.module';
import { DepensesAdministrativesModule } from './modules/depenses-administratives/depenses-administratives.module';
import { FacturesModule } from './modules/factures/factures.module';
import { CreancesClientsModule } from './modules/creances-clients/creances-clients.module';
import { PaiementsClientsModule } from './modules/paiements-clients/paiements-clients.module';
import { FournisseursModule } from './modules/fournisseurs/fournisseurs.module';
import { DettesFournisseursModule } from './modules/dettes-fournisseurs/dettes-fournisseurs.module';
import { PaiementsFournisseursModule } from './modules/paiements-fournisseurs/paiements-fournisseurs.module';
import { GestionPaiementsModule } from './modules/gestion-paiements/gestion-paiements.module';

import { CompanySettingsModule } from './modules/company-settings/company-settings.module';
import { EmployesModule } from './modules/employes/employes.module';
import { PaiementsEmployesModule } from './modules/paiements-employes/paiements-employes.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    AuthModule,
    DashboardModule,

    // Modules métier
    UsersModule,
    RolesModule,
    ClientsModule,
    ConducteursModule,
    VehiculesModule,
    DocumentsVehiculesModule,
    DocumentsConducteursModule,
    VoyagesModule,
    BonsCarburantModule,
    DepensesVehiculesModule,
    DepensesAdministrativesModule,
    FacturesModule,
    CreancesClientsModule,
    PaiementsClientsModule,
    FournisseursModule,
    DettesFournisseursModule,
    PaiementsFournisseursModule,
    GestionPaiementsModule,
    CompanySettingsModule,
    EmployesModule,
    PaiementsEmployesModule,
  ],
})
export class AppModule {}
