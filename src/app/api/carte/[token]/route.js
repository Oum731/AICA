import { getDb } from '@/lib/db';
import { regenererCarte } from '@/lib/members';

export const runtime = 'nodejs';

export async function GET(request, { params }) {
  const { token } = await params;
  const sql = await getDb();
  const [m0] = await sql`select id, number, pdf, status from members where token = ${token}`;
  const m = m0 && m0.status === 'active' && !m0.pdf ? { ...m0, pdf: await regenererCarte(m0.id) } : m0;
  if (!m?.pdf || m.status !== 'active') return new Response('Carte introuvable', { status: 404 });
  const dl = new URL(request.url).searchParams.has('telecharger');
  return new Response(m.pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `${dl ? 'attachment' : 'inline'}; filename="carte-${m.number}.pdf"`, 'Cache-Control': 'private, no-store' } });
}
