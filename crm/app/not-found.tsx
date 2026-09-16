import Link from 'next/link';

export default function NonTrovato() {
  return (
    <main>
      <header className="intestazione">
        <h1>Questa pagina non c&apos;è</h1>
        <p className="lede">Forse il contatto è stato eliminato, o il link è vecchio.</p>
      </header>
      <p><Link href="/" className="bottone">Torna a Oggi</Link></p>
    </main>
  );
}
