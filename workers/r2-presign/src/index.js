import { AwsClient } from 'aws4fetch';

const BUCKET = 'brackenroll-assets';
const PUBLIC_BASE = 'https://assets.devverheart.fwbgaming.win';

export default {
  async fetch(request, env) {
    if (request.headers.get('X-Worker-Secret') !== env.WORKER_SECRET) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { key, contentType } = await request.json();
    if (!key || !contentType) {
      return new Response('Missing key or contentType', { status: 400 });
    }

    const aws = new AwsClient({
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      region: 'auto',
      service: 's3',
    });

    const endpoint = `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${key}`;
    const url = new URL(endpoint);
    url.searchParams.set('X-Amz-Expires', '900');

    const signed = await aws.sign(
      new Request(url.toString(), {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
      }),
      { aws: { signQuery: true } }
    );

    return new Response(JSON.stringify({
      uploadUrl: signed.url,
      publicUrl: `${PUBLIC_BASE}/${key}`,
      key,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
