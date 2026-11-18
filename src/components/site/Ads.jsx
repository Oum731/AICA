'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const CLE = 'aica_consent';
const lire = () => { try { return localStorage.getItem(CLE); } catch { return null; } };

// Charge le script Google AdSense seulement après le choix du visiteur (bandeau ci-dessous).
// Jamais sur les pages de formulaire / carte / vérification / admin.
export function AdsLoader({ client }) {
  const [choix, setChoix] = useState(undefined);
  const chemin = usePathname() || '';
  useEffect(() => {
    setChoix(lire());
    const f = () => setChoix(lire());
    window.addEventListener('aica-consent', f);
    return () => window.removeEventListener('aica-consent', f);
  }, []);
  useEffect(() => {
    if (!client || !choix || document.getElementById('adsense-js')) return;
    window.adsbygoogle = window.adsbygoogle || [];
    if (choix === 'limited') window.adsbygoogle.requestNonPersonalizedAds = 1; // annonces non personnalisées
    const s = document.createElement('script');
    s.id = 'adsense-js'; s.async = true; s.crossOrigin = 'anonymous';
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    document.head.appendChild(s);
  }, [client, choix]);
  const sansPub = /^\/(adhesion|carte|verification|admin)/.test(chemin);
  if (!client || choix !== null || sansPub) return null;
  const decider = (v) => { try { localStorage.setItem(CLE, v); } catch {} window.dispatchEvent(new Event('aica-consent')); setChoix(v); };
  return (
    <div className="cookiebar" role="dialog" aria-label="Publicités et cookies">
      <p>Ce site affiche des publicités Google, qui utilisent des cookies. Vos données de membre ne sont <b>jamais</b> transmises à Google. <a href="/confidentialite#cookies">En savoir plus</a></p>
      <div><button className="btn small" onClick={() => decider('all')}>Accepter</button> <button className="btn small ghost" onClick={() => decider('limited')}>Annonces non personnalisées</button></div>
    </div>
  );
}

// Emplacement publicitaire : n'affiche rien tant qu'AdSense n'est pas configuré.
export function AdSlot({ client, slot }) {
  const chemin = usePathname() || '';
  const [choix, setChoix] = useState(null);
  useEffect(() => {
    setChoix(lire());
    const f = () => setChoix(lire());
    window.addEventListener('aica-consent', f);
    return () => window.removeEventListener('aica-consent', f);
  }, []);
  useEffect(() => {
    if (!client || !slot || !choix) return;
    const t = setTimeout(() => { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {} }, 300);
    return () => clearTimeout(t);
  }, [client, slot, choix, chemin]);
  if (!client || !slot || !choix) return null;
  return (
    <aside className="adslot" aria-label="Publicité">
      <small>Publicité</small>
      <ins key={chemin} className="adsbygoogle" style={{ display: 'block' }} data-ad-client={client} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
