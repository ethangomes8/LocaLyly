-- =============================================
-- LocaLyly — Migration v3: Theme & Eco Mode
-- =============================================
-- Exécute ce SQL dans Supabase → SQL Editor
-- =============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS eco_mode BOOLEAN DEFAULT false;
