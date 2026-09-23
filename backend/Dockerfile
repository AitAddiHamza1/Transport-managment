# ============================================================
#  Dockerfile multi-étapes — Backend NestJS + Prisma
# ============================================================

# ---- Étape 1 : build ----

FROM node:20-bookworm-slim AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dépendances (cache)
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Génération du client Prisma + build TypeScript
COPY . .
RUN npx prisma generate
RUN npm run build
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --target ES2021 --esModuleInterop --skipLibCheck

# ---- Étape 2 : runner ----

FROM node:20-bookworm-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

# Dépendances de production uniquement
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

# Création du dossier pour le volume persistant des fichiers téléversés
RUN mkdir -p /app/uploads

# Artéfacts de build
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Applique les migrations Prisma puis démarre l'API NestJS.
# REMARQUE : Le seed (seed.js) n'est PAS exécuté automatiquement ici pour éviter tout crash
# si SEED_ADMIN_* est absent et garantir un redémarrage sûr et idempotent du conteneur.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]
