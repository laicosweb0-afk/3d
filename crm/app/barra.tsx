'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { esci } from './azioni';

const VOCI = [
  { href: '/', testo: 'Oggi' },
  { href: '/contatti', testo: 'Contatti' },
  { href: '/codice', testo: 'Codice' },
];

export function Barra() {
  const percorso = usePathname();
  // Sulla pagina di accesso non c'è niente da navigare.
  if (percorso.startsWith('/login')) return null;

  return (
    <header className="barra">
      <div className="barra-dentro">
        <Link href="/" className="marchio" aria-label="CRM Rama Ceramiche">
          <span className="tessere" aria-hidden="true"><i /><i /><i /><i /></span>
          Rama
        </Link>
        <nav className="voci">
          {VOCI.map((voce) => {
            const attiva = voce.href === '/' ? percorso === '/' : percorso.startsWith(voce.href);
            return (
              <Link key={voce.href} href={voce.href} className={attiva ? 'voce attiva' : 'voce'}>
                {voce.testo}
              </Link>
            );
          })}
          <form action={esci}>
            <button type="submit" className="voce" style={{ background: 'transparent', border: 0, color: 'inherit' }}>
              Esci
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
