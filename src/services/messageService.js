import { supabase } from './supabaseClient.js';
import { getAuthUser } from './authState.js';

/**
 * Fetches the list of conversations for the current user.
 */
export async function fetchConversations() {
  const user = getAuthUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase.rpc('get_conversations', { p_uid: user.id });
  if (error) throw error;
  
  return data; // Array of { contact_id, last_message_content, last_message_at, unread_count }
}

/**
 * Fetches messages between the current user and a specific contact.
 */
export async function fetchMessagesWith(contactId) {
  const user = getAuthUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`)
    .order('created_at', { ascending: true }); // ASC so newest is at the bottom

  if (error) throw error;
  return data;
}

/**
 * Sends a text message to a contact.
 */
export async function sendMessage(receiverId, content) {
  const user = getAuthUser();
  if (!user) throw new Error('Not authenticated');

  if (!content || !content.trim()) throw new Error('Message cannot be empty');

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Marks messages as read from a specific sender.
 */
export async function markAsRead(senderId) {
  const user = getAuthUser();
  if (!user) return;

  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('receiver_id', user.id)
    .eq('sender_id', senderId)
    .is('read_at', null);

  if (error) console.error('Failed to mark as read:', error);
}

/**
 * Subscribes to new messages where the current user is involved.
 */
export function subscribeToMessages(onNewMessage) {
  const user = getAuthUser();
  if (!user) return null;

  return supabase
    .channel('public:messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `sender_id=eq.${user.id}`
      },
      (payload) => {
        onNewMessage(payload.new);
      }
    )
    .subscribe();
}
