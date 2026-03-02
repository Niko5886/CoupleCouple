import { supabase } from './supabaseClient.js';
import { getAuthUser } from './authState.js';

function nowIso() {
  return new Date().toISOString();
}

async function insertAudit(action, targetUserId, targetPhotoId, details = {}) {
  const admin = getAuthUser();
  if (!admin) return;
  await supabase.from('admin_audit_log').insert({
    admin_id: admin.id,
    action,
    target_user_id: targetUserId || null,
    target_photo_id: targetPhotoId || null,
    details
  });
}

export async function fetchAdminStats() {
  const queries = [
    supabase.from('profiles').select('id', { count: 'exact', head: true }).in('approval_status', ['pending', 'in_review']),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    supabase.from('profile_photos').select('id', { count: 'exact', head: true }).in('approval_status', ['pending', 'in_review']),
    supabase.from('profile_photos').select('id', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    supabase.from('profiles').select('id', { count: 'exact', head: true })
  ];

  const [pendingUsers, approvedUsers, pendingPhotos, approvedPhotos, totalUsers] = await Promise.all(queries);

  return {
    pendingUsers: pendingUsers.count || 0,
    approvedUsers: approvedUsers.count || 0,
    pendingPhotos: pendingPhotos.count || 0,
    approvedPhotos: approvedPhotos.count || 0,
    totalUsers: totalUsers.count || 0
  };
}

export async function fetchPendingProfiles(statuses = ['pending', 'in_review']) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('approval_status', statuses)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateProfileStatus(userId, status, reason = '') {
  const admin = getAuthUser();
  if (!admin) throw new Error('Няма активен админ.');
  const payload = {
    approval_status: status,
    rejection_reason: status === 'rejected' ? reason || null : null,
    approved_by: status === 'approved' ? admin.id : null,
    approved_at: status === 'approved' ? nowIso() : null
  };
  const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
  if (error) throw error;
  await insertAudit(`profile_${status}`, userId, null, { reason });
}

export async function fetchPendingPhotos(statuses = ['pending', 'in_review']) {
  const { data, error } = await supabase
    .from('profile_photos')
    .select('*')
    .in('approval_status', statuses)
    .order('uploaded_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function approvePhotosBatch(photoIds = []) {
  if (!photoIds.length) return;
  const admin = getAuthUser();
  const { error } = await supabase
    .from('profile_photos')
    .update({
      approval_status: 'approved',
      approved_by: admin?.id || null,
      approved_at: nowIso(),
      rejected_at: null,
      rejection_reason: null
    })
    .in('id', photoIds);
  if (error) throw error;
  await ensurePrimaryForApprovedPhotos(photoIds);
  await insertAudit('photos_approved_batch', null, null, { photoIds });
}

export async function rejectPhotosBatch(photoIds = [], reason = '') {
  if (!photoIds.length) return;
  const admin = getAuthUser();
  const { error } = await supabase
    .from('profile_photos')
    .update({
      approval_status: 'rejected',
      rejected_at: nowIso(),
      rejection_reason: reason || null,
      approved_by: admin?.id || null
    })
    .in('id', photoIds);
  if (error) throw error;
  await insertAudit('photos_rejected_batch', null, null, { photoIds, reason });
}

async function ensurePrimaryForApprovedPhotos(photoIds) {
  const { data: photos } = await supabase
    .from('profile_photos')
    .select('id, user_id, photo_url, requested_primary')
    .in('id', photoIds);

  if (!photos || !photos.length) return;

  for (const photo of photos) {
    if (photo.requested_primary) {
      await supabase
        .from('profile_photos')
        .update({ is_primary: true })
        .eq('id', photo.id);

      await supabase
        .from('profile_photos')
        .update({ is_primary: false })
        .eq('user_id', photo.user_id)
        .neq('id', photo.id);

      await supabase
        .from('profiles')
        .update({ avatar_url: photo.photo_url })
        .eq('id', photo.user_id);
    }
  }
}

export async function fetchAuditLog(limit = 20) {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchProfileHistory(limit = 20) {
  const { data, error } = await supabase
    .from('profile_change_log')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchNotifications(limit = 20) {
  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteUserAndData(userId) {
  console.log(`Initialising delete user request for ID: ${userId}`);
  
  // Explicitly get the current session token to ensure it's passed correctly
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('No active session found. Please log in again.');
  }
  
  const token = session.access_token;

  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { userId },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (error) {
    console.error('Change log: Supabase Function Error:', error);
    // If the error object has context (e.g. from JSON response), log it
    if (error.context && error.context.json) {
       const errorBody = await error.context.json();
       console.error('Change log: Function Error Body:', errorBody);
       throw new Error(errorBody.error || error.message);
    }
    throw error;
  }
  
  // Also check if data contains an error property (if 200 OK but application error)
  if (data && data.error) {
    console.error('Change log: Application Error in response:', data.error);
    throw new Error(data.error);
  }

  return data;
}
