import Link from 'next/link';
import { SITE, ADS } from '@/config';

export const metadata = { title: 'Confidentialité et données personnelles', description: 'Comment l’AICA traite les données de ses membres : usage interne et archives, jamais commercial.' };

export default function Confidentialite() {
  return (
    <div className="wrap page narrow legal">
      <h1>Confidentialité et données personnelles</h1>
      <p className="hint">Dernière mise à jour : novembre 2026</p>
      <p className="lead dark">L’AICA collecte les informations de ses membres uniquement pour gérer l’adhésion, éditer la carte de membre et tenir ses archives. <b>Ces données ne sont jamais vendues, louées ni utilisées à des fins commerciales ou publicitaires.</b></p>

      <h2>1. Qui est responsable ?</h2>
      <p>L’<b>{SITE.nomLong}</b> (AICA), {SITE.ville}. Contact pour toute question sur vos données : <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</p>

      <h2>2. Quelles données collectons-nous ?</h2>
      <p>Lorsque vous demandez votre carte de membre :</p>
      <ul>
        <li><b>Identité</b> : nom, prénoms, date et lieu de naissance, photo d’identité.</li>
        <li><b>Contact</b> : numéro de téléphone, adresse e-mail (facultative), quartier.</li>
        <li><b>Situation</b> : profession, fonction au sein de l’association, numéro de pièce d’identité ou de carte de séjour (facultatif).</li>
        <li><b>Sécurité</b> : nom et téléphone d’une personne à prévenir en cas d’urgence. Merci de l’informer que vous avez communiqué ses coordonnées.</li>
      </ul>
      <p>Si vous nous écrivez par le formulaire de contact : votre nom, votre e-mail et votre message.</p>

      <h2>3. Pourquoi ces données ?</h2>
      <ul>
        <li>Gérer votre adhésion et <b>éditer, vérifier et renouveler votre carte de membre</b> (le QR code permet de vérifier qu’elle est authentique et valide).</li>
        <li><b>Tenir les archives</b> de l’association et connaître la composition de ses membres (effectifs, répartition par quartier ou par profession, etc.) afin d’organiser des activités adaptées.</li>
        <li>Vous joindre pour la vie de l’association (événements, informations importantes) et en cas d’urgence.</li>
      </ul>
      <p>Nous n’utilisons <b>jamais</b> ces données pour de la prospection commerciale, du profilage publicitaire ou de la revente.</p>

      <h2>4. Qui peut voir vos données ?</h2>
      <ul>
        <li>Uniquement les <b>administrateurs habilités</b> de l’AICA, après connexion sécurisée.</li>
        <li>Toute personne qui scanne le QR code de votre carte voit <b>seulement</b> votre nom, votre fonction et la validité de la carte, jamais votre téléphone, votre adresse ni votre photo.</li>
        <li>Des prestataires techniques qui hébergent le site et la base de données (Vercel et Supabase) agissent pour notre compte, uniquement pour stocker les données. Ils ne les utilisent pas pour eux-mêmes.</li>
      </ul>
      <p>Aucune donnée de membre n’est transmise à des annonceurs ni à des tiers.</p>

      <h2>5. Combien de temps ?</h2>
      <p>Vos données sont conservées pendant la durée de votre adhésion, puis <b>archivées</b> pour la mémoire de l’association. Vous pouvez demander à tout moment leur suppression (voir ci-dessous).</p>

      <h2>6. Vos droits</h2>
      <p>Conformément à la loi marocaine n° 09-08 relative à la protection des personnes physiques à l’égard du traitement des données à caractère personnel, et, pour les personnes concernées, au règlement européen (RGPD), vous pouvez à tout moment <b>accéder</b> à vos données, les <b>rectifier</b>, vous <b>opposer</b> à leur traitement ou demander leur <b>suppression</b>. Écrivez-nous à <a href={`mailto:${SITE.email}`}>{SITE.email}</a> en indiquant votre nom et votre numéro de carte : nous vous répondrons dans les meilleurs délais.</p>
      <p>Vous pouvez aussi saisir la Commission Nationale de contrôle de la protection des Données à caractère Personnel (CNDP) au Maroc.</p>

      <h2>7. Sécurité</h2>
      <p>Les échanges avec le site sont chiffrés (HTTPS). L’accès à l’espace d’administration est protégé par mot de passe. Les photos et les fiches des membres ne sont pas accessibles publiquement, et votre lien de carte personnel est une adresse longue et aléatoire.</p>

      <h2>8. Enfants</h2>
      <p>Les événements destinés aux enfants (comme l’arbre de Noël) ne donnent lieu à la collecte d’aucune donnée sur les enfants sur ce site.</p>

      <h2 id="cookies">9. Cookies et publicité</h2>
      <p>Le site n’utilise <b>aucun cookie de suivi</b> pour son fonctionnement : seul un cookie technique protège la connexion des administrateurs.</p>
      {ADS.client ? (
        <p>Pour financer son développement, le site affiche des <b>publicités Google AdSense</b>. Google peut utiliser des cookies pour afficher des annonces, personnalisées ou non selon votre choix dans le bandeau affiché à votre première visite. Ces publicités n’apparaissent jamais sur les pages de formulaire, de carte de membre ou d’administration, et <b>vos données de membre ne sont jamais partagées avec Google</b>. Pour en savoir plus : <a href="https://policies.google.com/technologies/ads?hl=fr" target="_blank" rel="noopener noreferrer">règles de Google sur la publicité</a>. Vous pouvez modifier votre choix en effaçant les données du site dans votre navigateur.</p>
      ) : (
        <p>Le site ne diffuse actuellement aucune publicité. Si des publicités (Google AdSense) sont ajoutées, cette page sera mise à jour et un bandeau vous demandera votre choix.</p>
      )}

      <h2>10. Modifications</h2>
      <p>Cette politique peut évoluer ; la date de mise à jour figure en haut de page.</p>
      <p><Link href="/mentions-legales">Mentions légales</Link> · <Link href="/adhesion">Obtenir ma carte</Link></p>
    </div>
  );
}
