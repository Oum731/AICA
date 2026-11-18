export const SITE = {
  nom: 'AICA',
  nomLong: 'Association des Ivoiriens de Casablanca',
  email: 'aicaivoirienscasa@gmail.com',
  ville: 'Casablanca, Maroc',
  url: (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'http://localhost:3000')).replace(/\/$/, ''),
  validiteMois: 12,
};
// Les « actions menées » sont des événements déjà réalisés : une seule rubrique « Événements ».
export const SECTIONS = {
  evenements: { type: 'event', titre: 'Événements', un: 'Événement', desc: 'Rencontres, fêtes, tournois, actions de solidarité : ce que nous organisons et ce que nous avons réalisé ensemble.' },
  activites: { type: 'activity', titre: 'Activités', un: 'Activité', desc: 'Les activités régulières de la communauté : sport, culture, jeunesse…' },
};
export const TYPE_TO_SECTION = { event: 'evenements', action: 'evenements', activity: 'activites' };

// Publicité Google AdSense (renseignée dans les variables Vercel une fois le compte AdSense approuvé)
export const ADS = {
  client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '', // ex. ca-pub-1234567890123456
  slot: process.env.NEXT_PUBLIC_ADSENSE_SLOT || '',     // identifiant du bloc d'annonces « display »
};
