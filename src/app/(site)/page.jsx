import Link from 'next/link';
import { safe } from '@/lib/db';
import { listerPosts, dateLongue } from '@/lib/posts';
import { AdSlot } from '@/components/site/Ads';
import { ADS } from '@/config';
import { PostCard } from '@/components/site/Chrome';

export const dynamic = 'force-dynamic';

export default async function Accueil() {
  const [futurs, passes, activites, nb] = await Promise.all([
    safe(() => listerPosts('event', { futur: 'futur', limit: 4 }), []),
    safe(() => listerPosts('event', { futur: 'passe', limit: 3 }), []),
    safe(() => listerPosts('activity', { limit: 4 }), []),
    safe(async (sql) => (await sql`select count(*)::int n from members where status = 'active'`)[0].n, 0),
  ]);
  const une = futurs[0] || null;
  const events = futurs.slice(1);
  return (
    <>
      <section className="hero">
        <div className="wrap herogrid">
          <div>
            <p className="eyebrow light">Casablanca · Maroc</p>
            <h1>Les Ivoiriens de Casablanca, <em>unis</em> et solidaires.</h1>
            <p className="lead">Retrouvez nos événements, nos actions et nos activités, et rejoignez la communauté en obtenant votre carte de membre en quelques minutes.</p>
            <div className="cta"><Link className="btn big" href="/adhesion">Obtenir ma carte de membre</Link><Link className="btn big ghost light" href="/evenements">Voir les événements</Link></div>
          </div>
          <div className="herologo"><img src="/brand/logo.png" alt="Logo de l’Association des Ivoiriens de Casablanca" /></div>
        </div>
        <div className="flagbar" aria-hidden><i /><i /><i /></div>
      </section>

      {nb > 0 && <section className="band"><div className="wrap"><b>{nb}</b> membre{nb > 1 ? 's' : ''} inscrit{nb > 1 ? 's' : ''} à ce jour</div></section>}

      {une && (
        <section className="sec wrap">
          <p className="eyebrow">À la une</p>
          <Link href={`/evenements/${une.slug}`} className="featured">
            {une.has_image && <img src={`/api/media/${une.id}`} alt={`Affiche : ${une.title}`} />}
            <div>
              <h2>{une.title}</h2>
              <p className="meta"><span>📅 {une.date_label || dateLongue(une.event_date)}</span>{une.location && <span>📍 {une.location}</span>}</p>
              <p>{une.summary}</p>
              <span className="btn">Voir les détails</span>
            </div>
          </Link>
        </section>
      )}

      <section className="sec wrap">
        <div className="sechead"><h2>Prochains événements</h2><Link href="/evenements">Tout voir →</Link></div>
        {events.length ? <div className="pgrid">{events.map((p) => <PostCard key={p.id} p={p} section="evenements" />)}</div> : <p className="empty">Aucun événement programmé pour le moment. Revenez bientôt !</p>}
      </section>

      <AdSlot client={ADS.client} slot={ADS.slot} />

      <section className="sec alt"><div className="wrap">
        <div className="sechead"><h2>Nos réalisations</h2><Link href="/evenements">Tout voir →</Link></div>
        {passes.length ? <div className="pgrid">{passes.map((p) => <PostCard key={p.id} p={p} section="evenements" />)}</div> : <p className="empty">Nos actions et événements passés seront bientôt présentés ici.</p>}
      </div></section>

      <section className="sec wrap">
        <div className="sechead"><h2>Activités</h2><Link href="/activites">Tout voir →</Link></div>
        {activites.length ? <div className="pgrid four">{activites.map((p) => <PostCard key={p.id} p={p} section="activites" />)}</div> : <p className="empty">Nos activités seront bientôt présentées ici.</p>}
      </section>

      <section className="sec wrap">
        <div className="joincard">
          <div><h2>Votre carte de membre AICA</h2><p>Remplissez le formulaire en 2 minutes : votre carte est créée automatiquement, avec un QR code de vérification. Téléchargez-la en PDF ou gardez-la sur votre téléphone.</p></div>
          <Link className="btn big" href="/adhesion">Je m’inscris</Link>
        </div>
      </section>
    </>
  );
}
