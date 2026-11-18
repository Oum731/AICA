import Link from 'next/link';
import { SITE } from '@/config';

export const metadata = { title: 'Mentions légales' };

export default function Mentions() {
  return (
    <div className="wrap page narrow legal">
      <h1>Mentions légales</h1>
      <h2>Éditeur du site</h2>
      <p><b>{SITE.nomLong} (AICA)</b>, association à but non lucratif.<br />Siège : {SITE.ville}.<br />E-mail : <a href={`mailto:${SITE.email}`}>{SITE.email}</a><br />Responsable de la publication : le Bureau de l’AICA.</p>
      <h2>Hébergement</h2>
      <p>Site hébergé par <b>Vercel Inc.</b>, 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis. Base de données hébergée par <b>Supabase</b> (région Europe).</p>
      <h2>Données personnelles</h2>
      <p>Le traitement des données de nos membres est décrit dans notre <Link href="/confidentialite">politique de confidentialité</Link> : usage interne (adhésion, carte de membre, archives), sans aucun usage commercial.</p>
      <h2>Publicité</h2>
      <p>Le site peut afficher des publicités tierces (Google AdSense), clairement signalées par la mention « Publicité ». Elles contribuent aux frais de conception et de maintenance du site.</p>
      <h2>Propriété intellectuelle</h2>
      <p>Le logo, les textes et les visuels du site appartiennent à l’AICA ou à leurs auteurs. Toute reproduction sans autorisation est interdite, sauf pour relayer nos événements.</p>
      <h2>Contenus d’exemple</h2>
      <p>Les contenus marqués « Exemple » sont fictifs et servent uniquement à illustrer le site en attendant les publications officielles.</p>
    </div>
  );
}
