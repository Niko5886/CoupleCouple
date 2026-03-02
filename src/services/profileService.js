import { supabase } from './supabaseClient.js';
import { getAuthUser, userHasRole } from './authState.js';

const BUCKET = 'profile-photos';
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

function assertFileSize(file) {
  if (file && file.size > MAX_FILE_BYTES) {
    throw new Error('File exceeds 5MB limit.');
  }
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchProfileWithPhotos(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;

  // Fetch photos ordered by primary and time
  const { data: photos, error: photosError } = await supabase
    .from('profile_photos')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('uploaded_at', { ascending: false });

  if (photosError) throw photosError;

  return { profile: data, photos: photos || [] };
}

export async function updateProfile(userId, payload) {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function uploadProfilePhoto(userId, file, { setPrimary = false } = {}) {
  assertFileSize(file);
  const fileExt = file.name.split('.').pop();
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const filePath = `${userId}/${uuid}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;

  // Check if user is admin - admins get auto-approved photos
  const isAdmin = await userHasRole('admin');
  const currentUser = getAuthUser();
  
  const photoData = {
    user_id: userId,
    photo_url: publicUrl,
    storage_path: filePath,
    is_primary: false,
    requested_primary: !!setPrimary
  };

  if (isAdmin) {
    // Admin photos are auto-approved
    photoData.approval_status = 'approved';
    photoData.approved_by = currentUser?.id || null;
    photoData.approved_at = new Date().toISOString();
  } else {
    // Regular users need approval
    photoData.approval_status = 'pending';
  }

  const { data, error } = await supabase
    .from('profile_photos')
    .insert(photoData)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function setPrimaryPhoto(userId, photoId) {
  const { data: photo, error: photoError } = await supabase
    .from('profile_photos')
    .select('id, photo_url, approval_status')
    .eq('id', photoId)
    .eq('user_id', userId)
    .single();

  if (photoError) throw photoError;

  if (photo.approval_status !== 'approved') {
    throw new Error('Снимката трябва да е одобрена, за да стане основна.');
  }

  const { error } = await supabase
    .from('profile_photos')
    .update({ is_primary: true })
    .eq('id', photoId)
    .eq('user_id', userId);

  if (error) throw error;

  await supabase
    .from('profile_photos')
    .update({ is_primary: false })
    .eq('user_id', userId)
    .neq('id', photoId);

  await supabase
    .from('profiles')
    .update({ avatar_url: photo.photo_url })
    .eq('id', userId);
}

export async function deletePhoto(userId, photoId) {
  const { data: photo, error: photoError } = await supabase
    .from('profile_photos')
    .select('id, photo_url, is_primary, storage_path')
    .eq('id', photoId)
    .eq('user_id', userId)
    .single();

  if (photoError) throw photoError;

  if (photo.storage_path) {
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  }

  const { error } = await supabase
    .from('profile_photos')
    .delete()
    .eq('id', photoId)
    .eq('user_id', userId);
  if (error) throw error;

  if (photo.is_primary) {
    const { data: nextPhoto } = await supabase
      .from('profile_photos')
      .select('id, photo_url')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (nextPhoto?.id) {
      await supabase
        .from('profile_photos')
        .update({ is_primary: true })
        .eq('id', nextPhoto.id)
        .eq('user_id', userId);

      await supabase
        .from('profiles')
        .update({ avatar_url: nextPhoto.photo_url })
        .eq('id', userId);
    } else {
      await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);
    }
  }
}

export async function markLastSeen() {
  const { error } = await supabase.rpc('mark_last_seen');
  if (error) throw error;
}

export function calculateAge(birthDate) {
  if (!birthDate) return null;
  const dob = new Date(birthDate);
  const diff = Date.now() - dob.getTime();
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

export function formatLastSeen(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('bg-BG');
}

export async function fetchProfilesByIds(userIds) {
  if (!userIds || !userIds.length) return [];
  const { data, error } = await supabase.from('profiles').select('id, username, avatar_url, is_online, last_seen_at').in('id', userIds);
  if (error) throw error;
  return data;
}
