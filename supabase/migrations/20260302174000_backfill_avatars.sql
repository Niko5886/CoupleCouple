-- Backfill missing avatars for users who already have approved photos
UPDATE public.profiles p
SET avatar_url = (
  SELECT photo_url 
  FROM public.profile_photos ph 
  WHERE ph.user_id = p.id 
    AND ph.approval_status = 'approved' 
  ORDER BY ph.uploaded_at ASC 
  LIMIT 1
)
WHERE (p.avatar_url IS NULL OR p.avatar_url = '') 
  AND EXISTS (
    SELECT 1 
    FROM public.profile_photos ph 
    WHERE ph.user_id = p.id 
      AND ph.approval_status = 'approved'
  );
