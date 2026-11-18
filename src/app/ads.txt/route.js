import { ADS } from '@/config';

// Fichier ads.txt exigé par Google AdSense : n'existe que si l'identifiant éditeur est configuré.
export async function GET() {
  const id = ADS.client.replace(/^ca-/, '');
  if (!/^pub-\d+$/.test(id)) return new Response('Not found', { status: 404 });
  return new Response(`google.com, ${id}, DIRECT, f08c47fec0942fa0\n`, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
