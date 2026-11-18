import { randomBytes } from 'node:crypto';
import { getDb } from './db';
import { traiterPhoto, regenererCarte, prochainNumero, formatNumero } from './members';
import { normTel } from './validate';

// ---------- Lecture du CSV (séparateur , ; ou tabulation, guillemets, BOM) ----------
export function parseCsv(texte) {
  let t = String(texte).replace(/^﻿/, '');
  const premiere = t.split(/\r?\n/, 1)[0] || '';
  const sep = [';', '\t', ','].map((c) => [c, premiere.split(c).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

// ---------- Correspondance des colonnes (noms de l'ancienne appli ou libres) ----------
const norm = (h) => String(h).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ALIAS = {
  number: ['id', 'ncarte', 'numerocarte', 'numcarte', 'matricule', 'carte'],
  nom: ['nom', 'lastname', 'surname'],
  prenoms: ['prenom', 'prenoms', 'firstname'],
  naissance_date: ['naissancedate', 'datenaissance', 'datedenaissance', 'naissance', 'ne', 'dob'],
  naissance_lieu: ['naissancelieu', 'lieunaissance', 'lieudenaissance', 'lieu'],
  telephone: ['contact', 'telephone', 'tel', 'phone', 'whatsapp', 'numerotelephone'],
  quartier: ['quartier'],
  profession: ['metier', 'profession'],
  fonction: ['fonction', 'role'],
  email: ['email', 'mail', 'courriel'],
  piece_no: ['numero', 'npiece', 'piece', 'numeropiece', 'cin', 'passeport', 'document', 'ndocument'],
  urgence_nom: ['urgencenom', 'urgnom', 'contacturgence', 'nomurgence'],
  urgence_tel: ['urgencetel', 'urgtel', 'telurgence', 'telephoneurgence'],
  expiration: ['expiration', 'exp', 'dateexpiration', 'validejusquau', 'valableau', 'au'],
  cree: ['date', 'horodatage', 'timestamp', 'createdat', 'dateenregistrement', 'datecreation'],
  sexe: ['sexe', 'genre'],
  situation: ['situationmatrimoniale', 'matrim', 'situation'],
  date_maroc: ['dateentreemaroc', 'datemaroc', 'entreemaroc'],
  diplome: ['diplome'],
  reseaux: ['reseauxsociaux', 'social', 'reseaux'],
  logement: ['logement'],
  photo_url: ['photourl', 'photo', 'lienphoto', 'urlphoto'],
};

export function mapper(rows) {
  const [entete, ...data] = rows;
  const cols = {}; const inconnues = [];
  entete.forEach((h, i) => {
    const n = norm(h); let trouve = null;
    for (const [champ, al] of Object.entries(ALIAS)) if (al.includes(n) && !(champ in cols)) { trouve = champ; break; }
    if (trouve) cols[trouve] = i; else if (n) inconnues.push(String(h).trim());
  });
  return { cols, inconnues, data };
}

function parseDate(v) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  let y, mo, d;
  if (m) [y, mo, d] = [m[1], m[2], m[3]];
  else if ((m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s))) [d, mo, y] = [m[1], m[2], m[3]];
  else return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dt = new Date(iso + 'T00:00:00Z');
  return isNaN(dt) || dt.toISOString().slice(0, 10) !== iso ? null : iso;
}
const plusAns = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCFullYear(d.getUTCFullYear() + n); return d.toISOString().slice(0, 10); };
const nz = (v, def = '') => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s || def; };

export function ligneVersMembre(r, cols) {
  const g = (k) => (k in cols ? r[cols[k]] : '');
  const erreurs = [];
  const nom = nz(g('nom')).toUpperCase(), prenoms = nz(g('prenoms'));
  if (nom.length < 2) erreurs.push('nom manquant');
  if (prenoms.length < 1) erreurs.push('prénoms manquants');
  const brut = nz(g('number')).toUpperCase();
  const mnum = /^AICA-(\d{4})-(\d+)$/.exec(brut);
  const naissance = parseDate(g('naissance_date'));
  if (nz(g('naissance_date')) && !naissance) erreurs.push('date de naissance illisible');
  const cree = parseDate(g('cree'));
  const exp = parseDate(g('expiration'));
  const today = new Date().toISOString().slice(0, 10);
  const valid_to = exp || plusAns(cree || today, 1);
  return {
    erreurs,
    m: {
      number: mnum ? formatNumero(mnum[1], Number(mnum[2])) : null,
      nom, prenoms,
      naissance_date: naissance, naissance_lieu: nz(g('naissance_lieu'), '—'),
      fonction: nz(g('fonction'), 'Membre'), profession: nz(g('profession'), '—'), quartier: nz(g('quartier'), '—'),
      telephone: normTel(g('telephone')) || null, email: nz(g('email')).toLowerCase() || null,
      urgence_nom: nz(g('urgence_nom'), '—'), urgence_tel: normTel(g('urgence_tel')) || null, piece_no: nz(g('piece_no'), '—').toUpperCase(),
      valid_from: plusAns(valid_to, -1), valid_to, cree,
      sexe: nz(g('sexe')), situation: nz(g('situation')), date_maroc: parseDate(g('date_maroc')), diplome: nz(g('diplome')),
      reseaux: nz(g('reseaux')), logement: nz(g('logement')), photo_url: nz(g('photo_url')) || null,
    },
  };
}

// ---------- Lien Google Sheets -> CSV ----------
export function urlCsvSheets(lien) {
  let u;
  try { u = new URL(String(lien).trim()); } catch { return null; }
  if (u.protocol !== 'https:' || u.hostname !== 'docs.google.com') return null;
  const m = /\/spreadsheets\/d\/(?:e\/)?([\w-]+)/.exec(u.pathname);
  if (!m) return null;
  if (u.pathname.includes('/d/e/')) return `https://docs.google.com/spreadsheets/d/e/${m[1]}/pub?output=csv${u.searchParams.get('gid') ? '&gid=' + u.searchParams.get('gid') : ''}`;
  const gid = u.searchParams.get('gid') || (/gid=(\d+)/.exec(u.hash) || [])[1] || '0';
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}
export async function telechargerSheets(lien) {
  const url = urlCsvSheets(lien);
  if (!url) throw new Error('Lien Google Sheets invalide (il doit commencer par https://docs.google.com/spreadsheets/…).');
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
  const t = await r.text();
  if (!r.ok || /^\s*<(!doctype|html)/i.test(t)) throw new Error('Impossible de lire le Sheet. Vérifiez qu’il est partagé en « Tous les utilisateurs disposant du lien : lecteur », ou exportez-le en CSV et envoyez le fichier.');
  return t;
}

// ---------- Import ----------
export async function importer(texteCsv, { simulation = true } = {}) {
  const rows = parseCsv(texteCsv);
  if (rows.length < 2) return { erreur: 'Aucune ligne de données trouvée (la première ligne doit contenir les titres des colonnes).' };
  const { cols, inconnues, data } = mapper(rows);
  if (!('nom' in cols) || !('prenoms' in cols)) return { erreur: `Colonnes « nom » et « prénom(s) » introuvables. Colonnes lues : ${rows[0].join(', ')}` };
  const sql = await getDb();
  const existants = new Set((await sql`select number from members`).map((r) => r.number));
  const cles = new Set((await sql`select telephone || '|' || naissance_date::text k from members where telephone is not null and naissance_date is not null`).map((r) => r.k));
  const res = { total: data.length, importes: 0, doublons: [], erreurs: [], sansPhoto: 0, avecPhotoUrl: 0, inconnues, colonnes: Object.keys(cols) };
  const aInserer = [];
  data.forEach((r, i) => {
    const { erreurs, m } = ligneVersMembre(r, cols);
    const ligne = i + 2;
    const nomAff = `${m.prenoms} ${m.nom}`.trim() || '(sans nom)';
    if (erreurs.length) return res.erreurs.push({ ligne, nom: nomAff, motif: erreurs.join(', ') });
    if (m.number && existants.has(m.number)) return res.doublons.push({ ligne, nom: nomAff, motif: `carte ${m.number} déjà dans la base` });
    const cle = m.telephone && m.naissance_date ? `${m.telephone}|${m.naissance_date}` : null;
    if (cle && cles.has(cle)) return res.doublons.push({ ligne, nom: nomAff, motif: 'même téléphone et date de naissance déjà présents' });
    if (m.number) existants.add(m.number);
    if (cle) cles.add(cle);
    aInserer.push(m);
  });
  res.importes = aInserer.length;
  res.avecPhotoUrl = aInserer.filter((m) => m.photo_url).length;
  res.sansPhoto = aInserer.filter((m) => !m.photo_url).length;
  if (simulation || !aInserer.length) return res;

  await sql.begin(async (tx) => {
    for (const m of aInserer) {
      const annee = Number((m.cree || new Date().toISOString()).slice(0, 4));
      const number = m.number || (await prochainNumero(tx, annee));
      await tx`insert into members (number, token, nom, prenoms, naissance_date, naissance_lieu, fonction, profession, quartier, telephone, email,
          urgence_nom, urgence_tel, piece_no, valid_from, valid_to, sexe, situation, date_maroc, diplome, reseaux, logement, photo_url, source, created_at)
        values (${number}, ${randomBytes(16).toString('hex')}, ${m.nom}, ${m.prenoms}, ${m.naissance_date}, ${m.naissance_lieu}, ${m.fonction}, ${m.profession}, ${m.quartier},
          ${m.telephone}, ${m.email}, ${m.urgence_nom}, ${m.urgence_tel}, ${m.piece_no}, ${m.valid_from}, ${m.valid_to}, ${m.sexe}, ${m.situation}, ${m.date_maroc},
          ${m.diplome}, ${m.reseaux}, ${m.logement}, ${m.photo_url}, 'import', ${m.cree ? m.cree + 'T12:00:00Z' : new Date().toISOString()})`;
    }
  });
  return res;
}

// ---------- Photos : récupération par lots à partir des liens du Sheet ----------
function urlPhoto(u) {
  let x;
  try { x = new URL(u); } catch { return null; }
  if (x.protocol !== 'https:') return null;
  const h = x.hostname.toLowerCase();
  if (h === 'localhost' || /^(\d{1,3}\.){3}\d{1,3}$/.test(h) || h.endsWith('.local') || h.endsWith('.internal') || h.includes(':')) return null;
  if (h === 'drive.google.com' || h === 'docs.google.com') {
    const id = (/\/d\/([\w-]+)/.exec(x.pathname) || [])[1] || x.searchParams.get('id');
    if (!id) return null;
    return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  return x.toString();
}
async function telechargerPhoto(u) {
  const url = urlPhoto(u);
  if (!url) throw new Error('lien de photo non pris en charge');
  const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(9000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) throw new Error('photo trop lourde');
  return traiterPhoto(buf); // échoue si ce n'est pas une image
}

export async function restantesPhotos() {
  const sql = await getDb();
  const [{ n }] = await sql`select count(*)::int n from members where photo is null and photo_url is not null and photo_tries < 3`;
  return n;
}
export async function recupererPhotos(max = 6) {
  const sql = await getDb();
  const lot = await sql`select id, photo_url from members where photo is null and photo_url is not null and photo_tries < 3 order by id limit ${max}`;
  let ok = 0, echecs = 0;
  for (const m of lot) {
    try {
      const photo = await telechargerPhoto(m.photo_url);
      await sql`update members set photo = ${photo}, pdf = null where id = ${m.id}`;
      ok++;
    } catch { await sql`update members set photo_tries = photo_tries + 1 where id = ${m.id}`; echecs++; }
  }
  return { ok, echecs, restantes: await restantesPhotos() };
}
