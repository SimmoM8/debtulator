import { createClient } from 'npm:@supabase/supabase-js@2';

const jsonHeaders = { 'Content-Type': 'application/json' };

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return response(405, { error: 'Method not allowed.' });
  }
  if (Deno.env.get('ENABLE_DEVELOPMENT_RESET') !== 'true') {
    return response(404, { error: 'Development reset is disabled.' });
  }

  const authorization = request.headers.get('Authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) {
    return response(401, { error: 'Authentication required.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return response(500, { error: 'Supabase function environment is incomplete.' });
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);
  if (userError || !user) {
    return response(401, { error: 'Invalid authentication session.' });
  }

  const allowedUserIds = new Set(
    (Deno.env.get('DEVELOPMENT_RESET_USER_IDS') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (!allowedUserIds.has(user.id)) {
    return response(403, { error: 'This user is not allowed to reset test data.' });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await adminClient.rpc('reset_development_test_data');
  if (error) {
    console.error('Development reset failed', error);
    return response(500, { error: 'Hosted test-data reset failed.' });
  }

  return response(200, { reset: true });
});
