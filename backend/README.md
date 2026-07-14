# Backend — Gestion de transport & logistique (NestJS + Prisma)

Architecture backend **modulaire**, prête pour le développement des fonctionnalités.
Aucune logique métier n'est encore implémentée : chaque module contient un contrôleur et un
service vides, prêts à être complétés.

## Stack

- **NestJS 10** / TypeScript
- **Prisma 5** (ORM) + **PostgreSQL**
- **Swagger** (OpenAPI) pour la documentation d'API
- **JWT** (préparé : stratégie, guards, décorateurs — sans logique de login à ce stade)
- **Docker / Docker Compose**

## Structure

```
backend/
├── prisma/
│   ├── schema.prisma            # 18 modèles mappés sur la base validée
│   ├── migrations/0_init/       # migration initiale (baseline = schéma SQL validé)
│   └── seed.ts                  # rôles par défaut
├── src/
│   ├── config/                  # configuration + validation des variables d'env
│   ├── prisma/                  # PrismaModule + PrismaService (global)
│   ├── modules/
│   │   ├── auth/                # préparation JWT (module, strategy, guards, decorators)
│   │   ├── users/ roles/ clients/ conducteurs/ vehicules/
│   │   ├── documents-vehicules/ documents-conducteurs/
│   │   ├── voyages/ bons-carburant/ depenses-vehicules/ depenses-administratives/
│   │   ├── factures/ creances-clients/ paiements-clients/
│   │   ├── fournisseurs/ dettes-fournisseurs/ paiements-fournisseurs/
│   │   └── gestion-paiements/
│   ├── app.module.ts
│   └── main.ts                  # bootstrap + Swagger + ValidationPipe global
├── Dockerfile
└── docker-compose.yml
```

## Démarrage (développement)

```bash
cd backend

# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
copy .env.example .env   # puis adapter DATABASE_URL et les secrets JWT

# 3. Lancer PostgreSQL (via Docker) ou utiliser une instance existante
docker compose up -d postgres

# 4. Générer le client Prisma
npm run prisma:generate

# 5. Appliquer la migration initiale
npm run prisma:deploy       # applique prisma/migrations sur une base vide

# 6. (Optionnel) Insérer les rôles par défaut
npm run db:seed

# 7. Démarrer l'API
npm run start:dev
```

- API : `http://localhost:3000/api`
- Swagger : `http://localhost:3000/docs`

## Tout via Docker

```bash
docker compose up --build
```

## Note sur la migration initiale

La migration `prisma/migrations/0_init/migration.sql` correspond **exactement** au schéma SQL
validé à l'étape 2 (types ENUM, tables, contraintes, colonnes générées, index, triggers,
commentaires). Sur une base **vide**, `prisma migrate deploy` l'applique intégralement.

Si la base a déjà été créée à partir de `database/transport_db.sql`, marquez la migration comme
appliquée pour établir la ligne de base :

```bash
npx prisma migrate resolve --applied 0_init
```
