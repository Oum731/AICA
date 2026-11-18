import { AFFICHE_NOEL } from './seed-data';

const J = (n) => new Date(Date.now() + n * 864e5).toISOString();

// Contenus d'exemple, affichés une seule fois à la première utilisation. Marqués « demo » : l'admin les supprime d'un clic.
// L'arbre de Noël, lui, est réel (pas un exemple) : sa date exacte reste à confirmer.
export async function semer(tx) {
  const [flag] = await tx`insert into settings (key, value) values ('seed_v1', now()::text) on conflict do nothing returning key`;
  if (!flag) return;
  const poster = Buffer.from(AFFICHE_NOEL, 'base64');
  await tx`insert into posts (type, title, slug, summary, body, location, event_date, published, image, image_type, demo, date_label) values
    ('event', 'Arbre de Noël des enfants', 'arbre-de-noel-des-enfants',
     'Une fête pour les enfants de la communauté, en décembre à Casablanca, Aïn Sebaâ (Wifaq). Date et heure à confirmer.',
     ${'L’AICA organise un arbre de Noël pour les enfants à Casablanca, dans le quartier d’Aïn Sebaâ (Wifaq), au mois de décembre 2026.\n\nLa date et l’heure précises, ainsi que le programme, seront annoncés très bientôt sur cette page : revenez la consulter.\n\nPour toute question ou pour proposer votre aide, écrivez-nous à aicaivoirienscasa@gmail.com.'},
     'Aïn Sebaâ (Wifaq), Casablanca', '2026-12-20 12:00+01', true, ${poster}, 'image/jpeg', false, 'Décembre 2026 (date et heure à confirmer)')`;
  await tx`insert into posts (type, title, slug, summary, body, location, event_date, published, demo) values
    ('event', 'Soirée culturelle ivoirienne', 'exemple-soiree-culturelle-ivoirienne', 'Exemple : musique, danse et gastronomie ivoirienne pour toute la communauté.',
     ${'Ceci est un exemple de contenu, affiché en attendant que l’association publie ses vraies informations.\n\nIci, vous présenterez le programme, l’horaire, le lieu et la façon de participer.'},
     'Casablanca', ${J(75)}, true, true),
    ('event', 'Tournoi de football entre communautés', 'exemple-tournoi-de-football', 'Exemple : un tournoi convivial pour les amateurs de football.',
     ${'Ceci est un exemple de contenu, à remplacer par vos vraies informations.\n\nVous pourrez ajouter une photo, le règlement, les équipes et les résultats.'},
     'Casablanca', ${J(120)}, true, true),
    ('event', 'Collecte de vivres solidaire', 'exemple-collecte-de-vivres', 'Exemple d’action menée : une collecte au profit de familles dans le besoin.',
     ${'Ceci est un exemple d’action déjà réalisée, affiché en attendant vos vraies publications.\n\nVous pourrez y raconter ce qui a été fait, avec des photos et un bilan.'},
     'Casablanca', ${J(-60)}, true, true),
    ('event', 'Journée d’accueil des nouveaux arrivants', 'exemple-journee-d-accueil', 'Exemple d’action menée : accueillir et orienter les nouveaux Ivoiriens de Casablanca.',
     ${'Ceci est un exemple de contenu, à remplacer par vos vraies informations.'},
     'Casablanca', ${J(-150)}, true, true)`;
  await tx`insert into posts (type, title, slug, summary, body, location, published, demo) values
    ('activity', 'Football du dimanche', 'exemple-football-du-dimanche', 'Exemple : des matchs amicaux réguliers ouverts à tous les membres.', ${'Ceci est un exemple d’activité régulière. Indiquez ici les jours, horaires et le lieu.'}, 'Casablanca', true, true),
    ('activity', 'Danses et chants traditionnels', 'exemple-danses-et-chants', 'Exemple : transmettre la culture ivoirienne aux plus jeunes.', ${'Ceci est un exemple d’activité régulière. Indiquez ici les jours, horaires et le lieu.'}, 'Casablanca', true, true),
    ('activity', 'Soutien scolaire', 'exemple-soutien-scolaire', 'Exemple : un accompagnement pour les élèves et étudiants de la communauté.', ${'Ceci est un exemple d’activité régulière. Indiquez ici les jours, horaires et le lieu.'}, 'Casablanca', true, true)`;
}
