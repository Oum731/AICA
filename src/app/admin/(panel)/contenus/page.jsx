import Link from 'next/link';
import { SECTIONS, TYPE_TO_SECTION } from '@/config';
import { listerPosts, dateLongue } from '@/lib/posts';
import { deleteDemos } from '../../actions';

export default async function Contenus({ searchParams }) {
  const type = (await searchParams).type || 'event';
  const sec = SECTIONS[TYPE_TO_SECTION[type]] || SECTIONS.evenements;
  const rows = await listerPosts(sec.type, { admin: true, limit: 200 });
  return (
    <>
      <div className="rowhead"><h1>{sec.titre}</h1><div className="quick"><Link className="btn" href={`/admin/contenus/nouveau?type=${sec.type}`}>+ Ajouter</Link>{rows.some((p) => p.demo) && <form action={deleteDemos}><button className="btn danger small">Supprimer tous les exemples</button></form>}</div></div>
      {rows.some((p) => p.demo) && <p className="hint">Les contenus marqués « Exemple » sont fictifs : supprimez-les quand vous avez publié les vrais.</p>}
      <div className="tablewrap"><table className="tbl"><thead><tr><th>Titre</th><th>Date</th><th>Statut</th></tr></thead><tbody>
        {rows.map((p) => <tr key={p.id}><td><Link href={`/admin/contenus/${p.id}`}>{p.title}</Link> {p.demo && <span className="pill warn">Exemple</span>}</td><td>{p.event_date ? dateLongue(p.event_date) : '—'}</td><td><span className={'pill ' + (p.published ? 'ok' : 'warn')}>{p.published ? 'Publié' : 'Brouillon'}</span></td></tr>)}
        {!rows.length && <tr><td colSpan="3">Rien pour le moment. Cliquez sur « Ajouter ».</td></tr>}
      </tbody></table></div>
    </>
  );
}
