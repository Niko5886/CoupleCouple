// @ts-nocheck
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      console.error("Missing Authorization header");
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Admin client (service_role) to bypass RLS for privileged checks/actions
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Verify caller is an admin
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth verification failed:", authError);
      return new Response(JSON.stringify({ 
        error: `Unauthorized: ${authError?.message || 'Invalid user token'}`, 
        // Be careful not to leak sensitive internal error details to client in prod, 
        // but for debugging admin panel errors this is helpful.
        details: authError 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: Admins only' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      });
    }

    // 2. Parse payload request
    const reqData = await req.json();
    const { userId: targetUserId } = reqData;

    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'Missing userId parameter' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: targetAdminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)
      .eq('role', 'admin')
      .maybeSingle();

    if (targetAdminRole) {
      const { count: adminCount, error: countError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (countError) {
        return new Response(JSON.stringify({ error: 'Failed to verify admin count' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }

      if ((adminCount ?? 0) <= 1) {
        return new Response(JSON.stringify({ error: 'Cannot delete the last admin user' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        });
      }
    }

    // 3. Start deletion flow
    console.log(`Starting deletion of user ${targetUserId} by admin ${user.id}`);

    // 4. Delete all user photos from storage
    const { data: photosData } = await supabaseAdmin
      .from('profile_photos')
      .select('storage_path')
      .eq('user_id', targetUserId);
    
    if (photosData && photosData.length > 0) {
      const pathsToDelete = photosData.map(p => p.storage_path).filter(Boolean);
      if (pathsToDelete.length > 0) {
        console.log(`Deleting ${pathsToDelete.length} photos from storage...`);
        const { error: storageError } = await supabaseAdmin.storage
          .from('profile-photos')
          .remove(pathsToDelete);
        if (storageError) {
          console.error("Storage delete error:", storageError);
        }
      }
    }

    // 5. Unlink non-cascading references to avoid FK violation during Auth User Deletion
    // UPDATE user references (approved_by, changed_by) to NULL
    await supabaseAdmin.from('profiles').update({ approved_by: null }).eq('approved_by', targetUserId);
    await supabaseAdmin.from('profile_photos').update({ approved_by: null }).eq('approved_by', targetUserId);
    await supabaseAdmin.from('profile_change_log').update({ changed_by: null }).eq('changed_by', targetUserId);

    // DELETE non-cascading dependent rows entirely
    // Tasks table seems to be missing from DB or not needed for Dating app
    // await supabaseAdmin.from('tasks').delete().eq('created_by', targetUserId);
    
    // Admin notifications and audit log - cascading fixed in DB migrations, but good to clean manually or let cascade
    // However, some might not be cascading yet if migrations failed? 
    // We fixed admin_notifications cascading.
    
    await supabaseAdmin.from('admin_notifications').delete().eq('target_user_id', targetUserId);
    await supabaseAdmin.from('admin_audit_log').delete().eq('admin_id', targetUserId);
    await supabaseAdmin.from('admin_audit_log').delete().eq('target_user_id', targetUserId);
    
    // Explicitly delete their profile_change_log entries just in case
    await supabaseAdmin.from('profile_change_log').delete().eq('user_id', targetUserId);

    // 6. Delete the user from Auth (This will cascade to profiles, user_roles, projects, tasks, etc)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (deleteUserError) {
      console.error("Auth delete error:", deleteUserError);
      return new Response(JSON.stringify({ error: deleteUserError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 7. Log the deletion in audit log
    await supabaseAdmin.from('admin_audit_log').insert({
      admin_id: user.id,
      action: 'delete_user',
      details: { deleted_user_id: targetUserId }
    });

    console.log(`Successfully deleted user ${targetUserId}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const err = error as Error;
    console.error("Unexpected error:", err.message);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
