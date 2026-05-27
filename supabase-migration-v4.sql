-- =============================================
-- LocaLyly — Migration v4: Status
-- =============================================
-- Exécute ce SQL dans Supabase → SQL Editor
-- =============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT NULL;
