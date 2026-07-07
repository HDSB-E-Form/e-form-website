import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("`set-user-role` function initialized");

Deno.serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, role, secondary_roles, department } = await req.json();

    if (!userId || !role || !department) {
      return new Response(JSON.stringify({ error: 'Missing required fields: userId, role, and department are required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the Auth context of the logged-in user.
    // This is for checking if the calling user is a super_admin.
    const authHeader = req.headers.get('Authorization')!;
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError || !user || user.user_metadata?.role !== 'super_admin') {
      throw new Error('Permission denied: Only super admins can change user roles.');
    }

    // If the check passes, create a client with the service_role key to perform admin actions.
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Update user metadata in auth.users for RLS
    const { error: authUpdateError } = await adminSupabase.auth.admin.updateUserById(
      userId,
      { user_metadata: { role, secondary_roles } }
    );
    if (authUpdateError) throw authUpdateError;

    // 2. Update the public.users table for UI display
    const { error: tableUpdateError } = await adminSupabase
      .from('users')
      .update({ role, secondary_roles, department })
      .eq('id', userId);

    if (tableUpdateError) throw tableUpdateError;

    return new Response(JSON.stringify({ message: "User role updated successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in set-user-role function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});