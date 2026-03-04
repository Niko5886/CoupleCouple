import { createClient } from '@supabase/supabase-js';

// Supabase configuration with fallback to hardcoded values for production deployment
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://codjrsxeqmeoscnjyeyj.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvZGpyc3hlcW1lb3Njbmp5ZXlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Mzg3ODMsImV4cCI6MjA4NzUxNDc4M30.SI_Zmbo6X5RKHsuxLwhrG0dnjiMCr6ebIQk-9NSWInU';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Auth state listener
let authStateCallback = null;

supabase.auth.onAuthStateChange((event, session) => {
  if (authStateCallback) {
    authStateCallback(event, session);
  }
});

export function setAuthStateCallback(callback) {
  authStateCallback = callback;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}
