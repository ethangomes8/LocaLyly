-- =============================================
-- LocaLyly — Migration v2: Avatar, Couleur & Policies
-- =============================================
-- Exécute ce SQL dans Supabase → SQL Editor
-- =============================================

-- 1. Ajouter les colonnes avatar et color
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3b82f6';

-- 2. Autoriser les utilisateurs à mettre à jour leur propre profil
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
