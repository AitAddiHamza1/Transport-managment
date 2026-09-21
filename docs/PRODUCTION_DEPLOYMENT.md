# GUIDE DE DÉPLOIEMENT PRODUCTION (DOCKER & LINUX VPS)

Ce document décrit la procédure officielle et sécurisée pour déployer l'application **Transport-managment** sur un serveur VPS Linux en utilisant Docker et Docker Compose.

---

## 1. ARCHITECTURE TECHNIQUE & FLUX DES REQUÊTES

```
                           [ Internet / Navigateurs Web ]
                                         │
                                         ▼
                                HTTP / HTTPS (Port 80 / 443)
                      ┌─────────────────────────────────────────┐
                      │ Frontend Nginx (Conteneur transport_frontend_prod) │
                      │  - Sert le bundle React SPA (dist/)     │
                      │  - Redirige les routes client vers index.html │
                      │  - Proxy /api/* vers http://backend:3000/api/ │
                      └────────────────────┬────────────────────┘
                                           │
                                           ▼ (Réseau Docker interne)
                      ┌─────────────────────────────────────────┐
                      │ Backend NestJS (Conteneur transport_backend_prod) │
                      │  - Exécute l'API REST                   │
                      │  - Authentification JWT (Double secret) │
                      │  - Gestion des documents (/app/uploads) │
                      └────────────┬──────────────────┬─────────┘
                                   │                  │
           (postgresql://...)      │                  │  Volume Persistant Host
                                   ▼                  ▼  (uploads_prod_data)
                      ┌───────────────────┐  ┌───────────────────┐
                      │ PostgreSQL 16     │  │ Stockage Fichiers │
                      │ (transport_postgres_prod) │  │ /app/uploads      │
                      └───────────────────┘  └───────────────────┘
```

---

## 2. INVENTAIRE DES VARIABLES D'ENVIRONNEMENT PRODUCTION

Créez un fichier `.env` sur le VPS avec les variables suivantes :

```env
# --- Application ---
NODE_ENV=production
PORT=3000
API_PREFIX=api
CORS_ORIGIN=https://app.votre-domaine.com

# --- Base de données PostgreSQL ---
POSTGRES_USER=transport_prod_usr
POSTGRES_PASSWORD=PASSWORD_SUPER_SECURISE_A_MODIFIER!
POSTGRES_DB=transport_prod_db

# --- Authentification JWT Utilisateurs ---
# Les 4 secrets JWT doivent être OBLIGATOIREMENT distincts et complexes (min 32 caractères).
JWT_ACCESS_SECRET=SECRET_ACCESS_TENANT_SUPER_COMPLEXE_123456789!
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=SECRET_REFRESH_TENANT_SUPER_COMPLEXE_987654321!
JWT_REFRESH_EXPIRES_IN=7d

# --- Authentification JWT Plateforme Admin ---
PLATFORM_JWT_SECRET=SECRET_ACCESS_PLATFORM_SUPER_COMPLEXE_123456!
PLATFORM_JWT_EXPIRES_IN=15m
PLATFORM_JWT_REFRESH_SECRET=SECRET_REFRESH_PLATFORM_SUPER_COMPLEXE_654321!
PLATFORM_JWT_REFRESH_EXPIRES_IN=7d

# --- Variables d'initialisation du premier Administrateur Général (Seed unique) ---
SEED_ADMIN_NAME=Administrateur Général
SEED_ADMIN_EMAIL=admin@votre-domaine.com
SEED_ADMIN_PASSWORD=MotDePasseAdminSecurise2025!

# --- Frontend ---
VITE_API_URL=/api
```

---

## 3. COMMANDES INTERDITES EN PRODUCTION ⚠️

> [!CAUTION]
> **NE JAMAIS EXÉCUTER LES COMMANDES SUIVANTES EN PRODUCTION :**
> - `npx prisma db push` (Cause une dérive de schéma et risque de suppression accidentelle de colonnes ou tables).
> - `npx prisma migrate reset` (Supprime et réinitialise TOUTE la base de données).
> - `docker compose down -v` (Supprime les volumes persistants et détruit les données PostgreSQL et les fichiers téléversés).

---

## 4. PROCÉDURE DE DÉPLOIEMENT INITIAL

### Étape A : Cloner le dépôt et configurer les variables
```bash
git clone <URL_DU_DEPOT_GIT> /opt/transport-managment
cd /opt/transport-managment
cp backend/.env.example .env
# Éditer .env et renseigner les vrais secrets de production
nano .env
```

### Étape B : Lancer la stack Docker Production
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Étape C : Initialiser la base de données et le schéma
Les migrations Prisma s'appliquent automatiquement au démarrage du backend (`npx prisma migrate deploy`).
Pour vérifier le statut des migrations :
```bash
docker compose -f docker-compose.prod.yml exec backend npx prisma migrate status
```

### Étape D : Exécuter le Seed du premier Administrateur (UNE SEULE FOIS)
```bash
docker compose -f docker-compose.prod.yml exec backend npm run db:seed
```

---

## 5. GESTION DES DOCUMENTS TÉLÉVERSÉS & PERSISTENCE

Tous les documents d'exploitation (documents véhicules, récépissés de traversées, justificatifs de dépenses, photos employés, chèques, lettres de change, logos et tampons) sont enregistrés dans le volume persistant `uploads_prod_data` monté sur `/app/uploads`.

Les fichiers persistent automatiquement lors des redémarrages de conteneurs, des reconstructions d'images et des mises à jour du code.

### Sauvegarde du volume des fichiers :
```bash
docker run --rm -v transport-managment_uploads_prod_data:/volume -v $(pwd):/backup alpine tar -czf /backup/uploads_backup_$(date +%Y%m%d).tar.gz -C /volume .
```

---

## 6. MAINTENANCE & INSPECTION DES LOGS

- **Inspecter les logs du Backend** :
  ```bash
  docker compose -f docker-compose.prod.yml logs -f backend
  ```
- **Inspecter les logs de Nginx / Frontend** :
  ```bash
  docker compose -f docker-compose.prod.yml logs -f frontend
  ```
- **Redémarrer les services sans perte de données** :
  ```bash
  docker compose -f docker-compose.prod.yml restart
  ```
