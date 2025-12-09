-- CreateTable
CREATE TABLE "growatt_daily_history" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "plantName" TEXT,
    "plantId" TEXT,
    "dailyGeneration" DECIMAL(10,3) NOT NULL,
    "monthlyGeneration" DECIMAL(12,3),
    "yearlyGeneration" DECIMAL(12,3),
    "totalGeneration" DECIMAL(12,3),
    "currentPower" DECIMAL(8,3),
    "co2Reduction" DECIMAL(10,3),
    "revenue" DECIMAL(10,2),
    "status" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growatt_daily_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "growatt_daily_history_clientId_date_key" ON "growatt_daily_history"("clientId", "date");

-- CreateIndex
CREATE INDEX "growatt_daily_history_clientId_date_idx" ON "growatt_daily_history"("clientId", "date");

-- CreateIndex
CREATE INDEX "growatt_daily_history_date_idx" ON "growatt_daily_history"("date");

-- AddForeignKey
ALTER TABLE "growatt_daily_history" ADD CONSTRAINT "growatt_daily_history_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
