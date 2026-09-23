-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "titre" VARCHAR(150) NOT NULL,
    "message" VARCHAR(500) NOT NULL,
    "priorite" VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "target_route" VARCHAR(255),
    "dedup_key" VARCHAR(150),
    "cree_le" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_recipients" (
    "id" SERIAL NOT NULL,
    "notification_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "lu_le" TIMESTAMPTZ(6),
    "efface_le" TIMESTAMPTZ(6),

    CONSTRAINT "notification_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_company_id_dedup_key_key" ON "notifications"("company_id", "dedup_key");

-- CreateIndex
CREATE INDEX "notifications_company_id_cree_le_idx" ON "notifications"("company_id", "cree_le");

-- CreateIndex
CREATE UNIQUE INDEX "notification_recipients_notification_id_user_id_key" ON "notification_recipients"("notification_id", "user_id");

-- CreateIndex
CREATE INDEX "notification_recipients_user_id_lu_efface_le_idx" ON "notification_recipients"("user_id", "lu", "efface_le");

-- CreateIndex
CREATE INDEX "notification_recipients_user_id_notification_id_idx" ON "notification_recipients"("user_id", "notification_id");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
