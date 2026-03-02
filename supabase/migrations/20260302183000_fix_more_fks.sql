-- Fix profile_change_log FK to set null on delete
DO $$
BEGIN
  -- Drop existing constraint
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_change_log_changed_by_fkey') THEN
    ALTER TABLE public.profile_change_log DROP CONSTRAINT profile_change_log_changed_by_fkey;
  END IF;

  -- Re-add with ON DELETE SET NULL
  ALTER TABLE public.profile_change_log
    ADD CONSTRAINT profile_change_log_changed_by_fkey
    FOREIGN KEY (changed_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;

END $$;

-- Fix profile_photos approved_by FK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profile_photos_approved_by_fkey') THEN
    ALTER TABLE public.profile_photos DROP CONSTRAINT profile_photos_approved_by_fkey;
  END IF;

  ALTER TABLE public.profile_photos
    ADD CONSTRAINT profile_photos_approved_by_fkey
    FOREIGN KEY (approved_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;
END $$;

-- Fix profiles approved_by FK
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_approved_by_fkey') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_approved_by_fkey;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_approved_by_fkey
    FOREIGN KEY (approved_by)
    REFERENCES auth.users(id)
    ON DELETE SET NULL;
END $$;
