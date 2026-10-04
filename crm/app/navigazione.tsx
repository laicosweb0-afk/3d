'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Foglio, FrecciaDestra } from './interattivi';

// Due navigazioni per due modi di lavorare: in alto quando il CRM è aperto
// sul computer del negozio, in fondo quando il titolare lo apre col pollice.

const VOCI = [
  { href: '/', testo: 'Oggi', segno: 'oggi' },
  { href: '/flusso', testo: 'Da dove arrivano', segno: 'flusso' },
  { href: '/pipeline', testo: 'A che punto', segno: 'pipeline' },
  { href: '/contatti', testo: 'Contatti', segno: 'contatti' },
  { href: '/preventivi', testo: 'Preventivi', segno: 'preventivi' },
  { href: '/campagne', testo: 'Pubblicità', segno: 'campagne' },
  { href: '/attivita', testo: 'Diario', segno: 'attivita' },
  { href: '/attenzioni', testo: 'Avvisi', segno: 'attenzioni' },
  { href: '/analisi', testo: 'Numeri', segno: 'analisi' },
  { href: '/ingressi', testo: 'Fonti', segno: 'ingressi' },
] as const;

// In fondo allo schermo ci stanno cinque voci, non sette: si tengono quelle
// che si toccano in negozio, il resto resta in alto sul computer.
const NASCOSTE_IN_BASSO = ['ingressi', 'analisi', 'campagne', 'attivita', 'flusso'];
const VOCI_BASSE = VOCI.filter((v) => !NASCOSTE_IN_BASSO.includes(v.segno));

function Icona({ segno }: { segno: string }) {
  switch (segno) {
    case 'oggi':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /><path d="M4 9h16M9 4v3M15 4v3" /><path d="m9 14 2 2 4-4" /></svg>;
    case 'pipeline':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16M6 10h12M9 15h6M11 20h2" /></svg>;
    case 'contatti':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" /></svg>;
    case 'preventivi':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" /><path d="M14 3v4h4" /><path d="M8.5 13h7M8.5 17h4" /></svg>;
    case 'attivita':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2.5-6 4 13 2.5-7h5" /></svg>;
    case 'flusso':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v5a3 3 0 0 0 3 3h10a3 3 0 0 1 3 3v5" /><path d="M4 20v-5a3 3 0 0 1 3-3" /><circle cx="4" cy="4" r="1.6" /><circle cx="4" cy="20" r="1.6" /><circle cx="20" cy="20" r="1.6" /></svg>;
    case 'campagne':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5 15 5v14L4 14.5Z" /><path d="M7 15v4.5h3V16" /><path d="M18 10.5a2.6 2.6 0 0 1 0 3" /></svg>;
    case 'attenzioni':
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5 3.6 19h16.8L12 4.5Z" /><path d="M12 10v4M12 16.6v.4" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></svg>;
  }
}

export function Navigazione({
  urgenti, attenzioni, demo = false, demoOnline = false, vetrina = false,
}: {
  urgenti: number;
  attenzioni: number;
  demo?: boolean;
  demoOnline?: boolean;
  /** Copia da far vedere: si guarda e basta, non scrive niente. */
  vetrina?: boolean;
}) {
  const percorso = usePathname();
  const [menuAperto, setMenuAperto] = useState(false);
  const [demoAperta, setDemoAperta] = useState(false);

  // Cambiando pagina il menu si chiude da sé: nessuno vuole chiuderlo a mano.
  useEffect(() => { setMenuAperto(false); }, [percorso]);

  if (percorso.startsWith('/login')) return null;

  const attiva = (href: string) => (href === '/' ? percorso === '/' : percorso.startsWith(href));
  // In alto, sul computer, i numeri stanno su entrambe le voci: c'è spazio.
  const conta = (segno: string) => (segno === 'oggi' ? urgenti : segno === 'attenzioni' ? attenzioni : 0);
  // In fondo, sul telefono, il pallino rosso sta su una tab sola — Attenzioni
  // — e dice quante cose ci sono. Un rosso su tre tab non segnala niente.
  const contaBassa = (segno: string) => (segno === 'attenzioni' ? attenzioni : 0);

  return (
    <>
      <header className="barra">
        <div className="barra-dentro">
          <Link href="/" className="marchio">
            <span className="tessere" aria-hidden="true"><i /><i /><i /><i /></span>
            <span>Rama<small>CRM</small></span>
          </Link>
          {/* La modalità dimostrativa non ruba più una fascia in cima alla
              pagina: è una pillola, e il messaggio completo — lo stesso di
              prima, parola per parola — sta dentro, a un tocco. */}
          {demo && (
            <button type="button" className="tasto-demo" onClick={() => setDemoAperta(true)}>
              <span className="pillola-demo">Demo</span>
            </button>
          )}
          {vetrina && <span className="pillola-vetrina">Solo da guardare</span>}
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
            {contaBassa(v.segno) > 0 && (
              <span className="conta-bassa" aria-label={`${contaBassa(v.segno)} da controllare`}>
                {contaBassa(v.segno)}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* In vetrina non si crea niente: il "+" non c'è proprio. */}
      {!vetrina && (
      <>
      {/* Il "+": da qui nasce tutto quello che si crea a mano. Si rimpicciolisce
          quando si scorre (lo fa il CSS) e le liste hanno lo spazio sotto, così
          non copre mai l'ultima riga. */}
      <button
        type="button"
        className="piu"
        aria-expanded={menuAperto}
        aria-label="Aggiungi"
        onClick={() => setMenuAperto(true)}
      >
        +
      </button>

      {/* Le stesse quattro voci di prima, in un foglio che sale da sotto. */}
      <Foglio aperto={menuAperto} chiudi={() => setMenuAperto(false)} titolo="Cosa vuoi aggiungere?">
        <div className="lista-ios">
          <Link className="voce-ios" href="/contatti/nuovo" onClick={() => setMenuAperto(false)}>
            Nuovo contatto<span style={{ marginLeft: 'auto' }}><FrecciaDestra /></span>
          </Link>
          <Link className="voce-ios" href="/contatti?scegli=attivita" onClick={() => setMenuAperto(false)}>
            Nuova attività<span style={{ marginLeft: 'auto' }}><FrecciaDestra /></span>
          </Link>
          <Link className="voce-ios" href="/campagne/nuova" onClick={() => setMenuAperto(false)}>
            Nuova campagna<span style={{ marginLeft: 'auto' }}><FrecciaDestra /></span>
          </Link>
          <Link className="voce-ios" href="/preventivi" onClick={() => setMenuAperto(false)}>
            Preventivi<span style={{ marginLeft: 'auto' }}><FrecciaDestra /></span>
          </Link>
        </div>
      </Foglio>

      </>
      )}

      {/* Il testo della demo: identico a quello che stava nella fascia. */}
      <Foglio aperto={demoAperta} chiudi={() => setDemoAperta(false)} titolo="Modalità dimostrativa">
        <p className="testo-demo">
          <strong>Modalità dimostrativa</strong> — dati di esempio, tutto funziona davvero ma niente è reale.
          Con le chiavi di Supabase il CRM passa ai dati veri da solo.
          {demoOnline && (
            <> <strong>Qui online</strong> le modifiche restano finché il server è sveglio: dopo qualche
              minuto di inattività i dati di esempio tornano come erano. Con Supabase collegato non succede.</>
          )}
        </p>
      </Foglio>
    </>
  );
}
