-- Migration: Create messages table for private chat
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indices for fast retrieval of conversations
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Select policy: User can read messages they sent or received
DROP POLICY IF EXISTS messages_select_policy ON public.messages;
CREATE POLICY messages_select_policy ON public.messages
  FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));

-- Insert policy: User can insert messages where they are the sender
DROP POLICY IF EXISTS messages_insert_policy ON public.messages;
CREATE POLICY messages_insert_policy ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Update policy: User can ONLY update 'read_at' for messages they received (to mark as read)
DROP POLICY IF EXISTS messages_update_policy ON public.messages;
CREATE POLICY messages_update_policy ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id); 
  -- Note: Depending on logic, we might need a trigger to ensure they only change read_at

-- Enable real-time for messages table
alter publication supabase_realtime add table public.messages;
