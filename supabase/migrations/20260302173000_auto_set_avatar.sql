-- Trigger to automatically set the first approved photo as the user's avatar
CREATE OR REPLACE FUNCTION public.set_avatar_on_photo_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_avatar text;
BEGIN
  -- Only proceed if the photo is being approved
  IF NEW.approval_status = 'approved' AND (OLD.approval_status IS DISTINCT FROM 'approved') THEN
    
    -- Check if the user already has an avatar
    SELECT avatar_url INTO current_avatar
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- If no avatar is set, or if it's empty, update it with this photo
    IF current_avatar IS NULL OR current_avatar = '' THEN
      -- Set the profile avatar
      UPDATE public.profiles
      SET avatar_url = NEW.photo_url,
          updated_at = now()
      WHERE id = NEW.user_id;

      -- Also mark this photo as primary in the photos table for consistency
      UPDATE public.profile_photos
      SET is_primary = true
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_avatar_on_approval ON public.profile_photos;
CREATE TRIGGER trg_set_avatar_on_approval
AFTER UPDATE ON public.profile_photos
FOR EACH ROW
EXECUTE FUNCTION public.set_avatar_on_photo_approval();
