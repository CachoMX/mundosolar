-- Migration: Add GrowattDataCache table
-- Execute this SQL in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- Create the growatt_data_cache table
CREATE TABLE IF NOT EXISTS "growatt_data_cache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clientId" TEXT NOT NULL,
    "plantName" TEXT,
    "plantId" TEXT,

    -- Energy data
    "dailyGeneration" DECIMAL(10,3),
    "monthlyGeneration" DECIMAL(12,3),
    "yearlyGeneration" DECIMAL(12,3),
    "totalGeneration" DECIMAL(12,3),
    "currentPower" DECIMAL(8,3),

    -- Additional metrics
    "co2Reduction" DECIMAL(10,3),
    "revenue" DECIMAL(10,2),

    -- Status
    "status" TEXT,
    "lastUpdateFromGrowatt" TIMESTAMP(3),

    -- Cache metadata
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    -- Error tracking
    "fetchError" TEXT,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorAt" TIMESTAMP(3),

    -- System timestamps
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint on clientId
CREATE UNIQUE INDEX IF NOT EXISTS "growatt_data_cache_clientId_key" ON "growatt_data_cache"("clientId");

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "growatt_data_cache_expiresAt_idx" ON "growatt_data_cache"("expiresAt");
CREATE INDEX IF NOT EXISTS "growatt_data_cache_isStale_idx" ON "growatt_data_cache"("isStale");

-- Create trigger to automatically update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_growatt_data_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_growatt_data_cache_updated_at_trigger
    BEFORE UPDATE ON "growatt_data_cache"
    FOR EACH ROW
    EXECUTE FUNCTION update_growatt_data_cache_updated_at();

-- Grant necessary permissions (adjust based on your Supabase setup)
-- These may already be set up by Supabase's default policies
-- GRANT ALL ON "growatt_data_cache" TO authenticated;
-- GRANT ALL ON "growatt_data_cache" TO service_role;

-- Optional: Add a comment to the table
COMMENT ON TABLE "growatt_data_cache" IS 'Cached Growatt API data for faster dashboard loading. Updated daily by cron job.';
