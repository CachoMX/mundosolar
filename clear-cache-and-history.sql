-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR TO CLEAR OLD DATA
-- ============================================
-- Deletes all cache and history records to start fresh
-- Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new
-- ============================================

-- Clear all history records
DELETE FROM growatt_daily_history;

-- Clear all cache records
DELETE FROM growatt_data_cache;

-- Verify they're empty
SELECT COUNT(*) as cache_count FROM growatt_data_cache;
SELECT COUNT(*) as history_count FROM growatt_daily_history;
