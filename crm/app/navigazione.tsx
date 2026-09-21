'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

// Due navigazioni per due modi di lavorare: in alto quando il CRM è aperto
// sul computer del negozio, in fondo quando il titolare lo apre col pollice.

const VOCI = [
  { href: '/', testo: 'Oggi', segno: 'oggi' },
  { href: '/pipeline', testo: 'Pipeline', segno: 'pipeline' },
  { href: '/contatti', testo: 'Contatti', segno: 'contatti' },
  { href: '/campagne', testo: 'Campagne', segno: 'campagne' },
  { href: '/attenzioni', testo: 'Attenzioni', segno: 'attenzioni' },
  { href: '/analisi', testo: 'Analisi', segno: 'analisi' },
  { href: '/ingressi', testo: 'Ingressi', segno: 'ingressi' },
] as const;

// In fondo allo schermo ci stanno cinque voci, non sette: si tengono quelle
// che si toccano in negozio, il resto resta in alto sul computer.
const NASCOSTE_IN_BASSO = ['ingressi', 'analisi'];
const VOCI_BASSE = VOCI.filter((v) => !NASCOSTE_IN_BASSO.includes(v.segno));

function Icona({ segno }: { segno: string }) {
  switch (segno) {
    case 'oggi':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /><path d="M4 9h16M9 4v3M15 4v3" /><path d="m9 14 2 2 4-4" /></svg>;
    case 'pipeline':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M6 10h12M9 15h6M11 20h2" /></svg>;
    case 'contatti':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" /></svg>;
    case 'campagne':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5 15 5v14L4 14.5Z" /><path d="M7 15v4.5h3V16" /><path d="M18 10.5a2.6 2.6 0 0 1 0 3" /></svg>;
    case 'attenzioni':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5 3.6 19h16.8L12 4.5Z" /><path d="M12 10v4M12 16.6v.4" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>;
  }
}

export function Navigazione({ urgenti, attenzioni }: { urgenti: number; attenzioni: number }) {
  const percorso = usePathname();
  const [menuAperto, setMenuAperto] = useState(false);

  // Cambiando pagina il menu si chiude da sé: nessuno vuole chiuderlo a mano.
  useEffect(() => { setMenuAperto(false); }, [percorso]);

  if (percorso.startsWith('/login')) return null;

  const attiva = (href: string) => (href === '/' ? percorso === '/' : percorso.startsWith(href));
  const conta = (segno: string) => (segno === 'oggi' ? urgenti : segno === 'attenzioni' ? attenzioni : 0);

  return (
    <>
      <header className="barra">
        <div className="barra-dentro">
          <Link href="/" className="marchio">
            <span className="tessere" aria-hidden="true"><i /><i /><i /><i /></span>
            <span>Rama<small>CRM</small></span>
          </Link>
          <nav className="voci">
            {VOCI.map((v) => (
              <Link key={v.href} href={v.href} className={attiva(v.href) ? 'voce attiva' : 'voce'}>
                {v.testo}
                {conta(v.segno) > 0 && <span className="conta">{conta(v.segno)}</span>}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <nav className="barra-bassa" aria-label="Navigazione">
        {VOCI_BASSE.map((v) => (
          <Link key={v.href} href={v.href} className={attiva(v.href) ? 'voce-bassa attiva' : 'voce-bassa'}>
            <Icona segno={v.segno} />
            {v.testo}
            {conta(v.segno) > 0 && <span className="pallino" aria-hidden="true" />}
          </Link>
        ))}
      </nav>

      {/* Il "+": da qui nasce tutto quello che si crea a mano. */}
      <button
        type="button"
        className="piu"
        aria-expanded={menuAperto}
        aria-label={menuAperto ? 'Chiudi le scorciatoie' : 'Aggiungi'}
        onClick={() => setMenuAperto((v) => !v)}
      >
        {menuAperto ? '×' : '+'}
      </button>

      {menuAperto && (
        <div
          style={{
            position: 'fixed', right: 16, bottom: 'calc(var(--barra-mobile) + 80px)', zIndex: 31,
            background: 'var(--carta-2)', border: '1px solid var(--linea-forte)',
            borderRadius: 14, padding: 8, minWidth: 210, boxShadow: '0 16px 40px rgba(0,0,0,.5)',
          }}
          role="menu"
        >
          <Link className="voce" style={{ display: 'flex' }} href="/contatti/nuovo" role="menuitem">Nuovo contatto</Link>
          <Link className="voce" style={{ display: 'flex' }} href="/contatti?scegli=attivita" role="menuitem">Nuova attività</Link>
          <Link className="voce" style={{ display: 'flex' }} href="/contatti?scegli=preventivo" role="menuitem">Nuovo preventivo</Link>
          <Link className="voce" style={{ display: 'flex' }} href="/contatti?scegli=nota" role="menuitem">Nuova nota</Link>
        </div>
      )}
    </>
  );
}
