import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_TYPES = ['map', 'token', 'image', 'portrait'] as const;
type AssetType = typeof ALLOWED_TYPES[number];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { campaignId?: string | null; type: AssetType; hash: string; filename: string; contentType: string };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { campaignId, type, hash, filename, contentType } = body;
  if (!type || !hash || !filename || !contentType) {
    return new Response('Missing required fields', { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(type)) {
    return new Response('Invalid asset type', { status: 400 });
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? 'bin';
  let key: string;

  if (campaignId) {
    const { data: member } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return new Response('Forbidden', { status: 403 });
    }
    key = `campaigns/${campaignId}/${type}/${hash}.${ext}`;
  } else {
    // Global (user-owned) asset — authenticated user only, no campaign required
    key = `global/${user.id}/${type}/${hash}.${ext}`;
  }

  const workerRes = await fetch(Deno.env.get('WORKER_URL')!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Worker-Secret': Deno.env.get('WORKER_SECRET')!,
    },
    body: JSON.stringify({ key, contentType }),
  });

  if (!workerRes.ok) {
    return new Response('Failed to generate upload URL', { status: 502 });
  }

  const result = await workerRes.json();

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
