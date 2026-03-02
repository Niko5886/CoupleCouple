-- Migration: Helper function for getting user conversations
CREATE OR REPLACE FUNCTION public.get_conversations(p_uid uuid)
RETURNS TABLE (
  contact_id uuid,
  last_message_content text,
  last_message_at timestamptz,
  unread_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Security check: only allow users to query their own conversations
  IF p_uid != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  WITH recent_msgs AS (
    SELECT 
      CASE WHEN sender_id = p_uid THEN receiver_id ELSE sender_id END as other_user_id,
      content,
      created_at,
      read_at,
      receiver_id,
      ROW_NUMBER() OVER(
        PARTITION BY CASE WHEN sender_id = p_uid THEN receiver_id ELSE sender_id END 
        ORDER BY created_at DESC
      ) as rn
    FROM public.messages
    WHERE sender_id = p_uid OR receiver_id = p_uid
  ),
  unread_counts AS (
    SELECT 
      sender_id as other_user_id,
      COUNT(*) as unread_count
    FROM public.messages
    WHERE receiver_id = p_uid AND read_at IS NULL
    GROUP BY sender_id
  )
  SELECT 
    rm.other_user_id as contact_id,
    rm.content as last_message_content,
    rm.created_at as last_message_at,
    COALESCE(uc.unread_count, 0) as unread_count
  FROM recent_msgs rm
  LEFT JOIN unread_counts uc ON rm.other_user_id = uc.other_user_id
  WHERE rm.rn = 1
  ORDER BY rm.created_at DESC;
END;
$$;
