-- CreateEnum
CREATE TYPE "platform_admin_statut" AS ENUM ('ACTIF', 'INACTIF');

-- CreateTable
CREATE TABLE "platform_admins" (
    "id" SERIAL NOT NULL,
    "email" CITEXT NOT NULL,
    "nom" VARCHAR(120) NOT NULL,
    "mot_de_passe" VARCHAR(255) NOT NULL,
    "statut" "platform_admin_statut" NOT NULL DEFAULT 'ACTIF',
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "derniere_connexion" TIMESTAMPTZ(6),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_refresh_sessions" (
    "id" SERIAL NOT NULL,
    "platform_admin_id" INTEGER NOT NULL,
    "jti" VARCHAR(64) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_jti" VARCHAR(64),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mis_a_jour_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_refresh_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "platform_admins_email_key" ON "platform_admins"("email");

-- CreateIndex
CREATE INDEX "platform_admins_statut_idx" ON "platform_admins"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "platform_refresh_sessions_jti_key" ON "platform_refresh_sessions"("jti");

-- CreateIndex
CREATE INDEX "platform_refresh_sessions_platform_admin_id_idx" ON "platform_refresh_sessions"("platform_admin_id");

-- AddForeignKey
ALTER TABLE "platform_refresh_sessions" ADD CONSTRAINT "platform_refresh_sessions_platform_admin_id_fkey" FOREIGN KEY ("platform_admin_id") REFERENCES "platform_admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
