'use client';
import { useActionState, useState } from 'react';
import { importerAction, photosAction } from '../../../actions';

function Liste({ titre, rows }) {
  if (!rows?.length) return null;
  return (
    <details open={rows.length < 8}><summary><b>{titre} ({rows.length})</b></summary>
      <div className="tablewrap"><table className="tbl"><tbody>{rows.map((r, i) => <tr key={i}><td>ligne {r.ligne}</td><td>{r.nom}</td><td>{r.motif}</td></tr>)}</tbody></table></div>
    </details>
  );
}

export default function ImportForm({ restantes: init }) {
  const [res, action, pending] = useActionState(importerAction, null);
  const [photos, setPhotos] = useState({ restantes: init });
  const [busy, setBusy] = useState(false);
  async function lotPhotos() { setBusy(true); setPhotos(await photosAction()); setBusy(false); }
  const reste = res && !res.simulation && !res.erreur ? Math.max(photos.restantes ?? 0, res.avecPhotoUrl) : photos.restantes;
  return (
    <>
      <form action={action} className="formcard">
        <h2>1. Source des données</h2>
        <label className="field"><span className="lbl">Lien du Google Sheet</span><input name="lien" placeholder="https://docs.google.com/spreadsheets/d/…" /><small>Le Sheet doit être partagé en « Toute personne disposant du lien : lecteur ». Sinon, utilisez le fichier CSV ci-dessous.</small></label>
        <label className="field"><span className="lbl">… ou fichier CSV</span><input type="file" name="fichier" accept=".csv,text/csv,text/plain" /><small>Dans Google Sheets : Fichier → Télécharger → Valeurs séparées par des virgules (.csv).</small></label>
        <h2>2. Vérifier puis importer</h2>
        <div className="quick">
          <button className="btn ghost" name="mode" value="simuler" disabled={pending}>{pending ? 'Analyse…' : 'Vérifier (rien n’est enregistré)'}</button>
          <button className="btn" name="mode" value="importer" disabled={pending}>Importer dans la base</button>
        </div>
        {res?.erreur && <p className="err banner">{res.erreur}</p>}
        {res && !res.erreur && (
          <div>
            <p className={'banner ' + (res.simulation ? 'warn' : 'ok')}>
              {res.simulation ? 'Simulation : ' : 'Terminé : '}<b>{res.importes}</b> carte(s) {res.simulation ? 'seraient importées' : 'importées'} sur {res.total} ligne(s)
              · {res.doublons.length} doublon(s) ignoré(s) · {res.erreurs.length} ligne(s) refusée(s).
            </p>
            <p className="hint">Colonnes reconnues : {res.colonnes.join(', ')}.{res.inconnues.length > 0 && <> Colonnes ignorées : {res.inconnues.join(', ')}.</>} {res.avecPhotoUrl} lien(s) de photo, {res.sansPhoto} sans photo.</p>
            <Liste titre="Refusées" rows={res.erreurs} />
            <Liste titre="Doublons ignorés" rows={res.doublons} />
          </div>
        )}
      </form>

      <div className="formcard" style={{ marginTop: 20 }}>
        <h2>3. Photos</h2>
        <p className="hint">Les photos sont récupérées par petits lots à partir des liens du Sheet (les liens Google Drive doivent être partagés « Toute personne disposant du lien »). Les cartes sans photo restent utilisables : vous pouvez ajouter la photo à la main depuis la fiche du membre.</p>
        <p><b>{reste ?? 0}</b> photo(s) à récupérer.</p>
        {photos.erreur && <p className="err">{photos.erreur}</p>}
        {photos.ok !== undefined && <p className="ok">Dernier lot : {photos.ok} récupérée(s), {photos.echecs} échec(s).</p>}
        <button type="button" className="btn" onClick={lotPhotos} disabled={busy || !(reste > 0)}>{busy ? 'Récupération…' : 'Récupérer le prochain lot de photos'}</button>
      </div>
    </>
  );
}
