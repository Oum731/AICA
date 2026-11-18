import Link from 'next/link';
import ImportForm from './ImportForm';
import { restantesPhotos } from '@/lib/import';

export default async function Import() {
  const restantes = await restantesPhotos();
  return (
    <>
      <Link href="/admin/membres" className="back">← Membres</Link>
      <h1>Importer les anciennes cartes</h1>
      <p className="hint">Reprend l’historique des cartes de l’ancienne application (Google Sheet) dans la base. Les <b>numéros de carte existants sont conservés</b>, les doublons sont ignorés, et les nouvelles cartes continuent la numérotation sans collision.</p>
      <ImportForm restantes={restantes} />
    </>
  );
}
