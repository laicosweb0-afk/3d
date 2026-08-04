'use client';

// Il compositore dell'ordine — una carta sola, come «Oggi al banco».
//
// Quattro zone divise da fili: la ricerca, la lista con lo stepper a
// chili, il ritiro con le finestre del titolare, l'invio. Il pulsante
// finale non manda niente a nessun server: apre WhatsApp col messaggio
// già scritto, e l'ordine diventa una conversazione col banco — che è
// l'unico posto dove può essere confermato davvero.
//
// Le finestre di prenotazione sono INFORMAZIONE, non cancello (decisione
// dell'utente, 04/08: «inserirla delicatamente nella box, come le luci
// della disponibilità»). Il visitatore ordina quando vuole; se le
// prenotazioni sono chiuse, il messaggio lo dice al posto suo e il banco
// risponde col primo giorno possibile. Un modulo che si blocca fuori
// orario è un cliente perso ad ogni ora sbagliata.
//
// Tutto ciò che dipende dall'orologio vive DOPO il montaggio: la pagina è
// prerenderizzata al build, e un'ora calcolata lì sarebbe l'ora del
// build, non quella del visitatore — oltre che un errore di idratazione.

import { useEffect, useMemo, useState } from 'react';
import { company } from '@/content/bufala/company';
import {
  ordinabili,
  finestre,
  statoFinestre,
  minutoRoma,
  PASSO_KG,
  type Finestra,
} from '@/content/bufala/ordina';

/** Minuscole e niente accenti: «friarielli all'olio» si trova anche
 *  scrivendo «olio» o «FRIARIELLI» — e l'apostrofo (dritto o tipografico)
 *  diventa uno spazio, sennò «all’olio» resta una parola sola. L'intervallo è quello dei segni
 *  diacritici combinanti che NFD stacca dalle lettere. */
function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, ' ');
}

/** Una parola risponde a un termine se una delle due è prefisso
 *  dell'altra, o se condividono le prime cinque lettere: così «formaggi»
 *  trova «formaggio», «salume» trova «salumi», e «mozz» basta. */
function risponde(parola: string, termine: string): boolean {
  return (
    parola.startsWith(termine) ||
    termine.startsWith(parola) ||
    (parola.length >= 5 && termine.length >= 5 && parola.slice(0, 5) === termine.slice(0, 5))
  );
}

function cerca(query: string) {
  const termini = normalizza(query).split(/\s+/).filter(Boolean);
  if (termini.length === 0) return ordinabili;
  return ordinabili.filter((p) => {
    const parole = normalizza([p.nome, p.categoria, p.produttore ?? ''].join(' '))
      .split(/\s+/)
      .filter(Boolean);
    return termini.every((t) => parole.some((w) => risponde(w, t)));
  });
}

const kgTesto = (kg: number) => `${kg.toLocaleString('it-IT')} kg`;

/** Il glifo di WhatsApp (marchio Meta, tracciato pubblico), monocromo
 *  come tutto il sistema: dentro al bottone d'ottone vive nel colore del
 *  testo, non nel verde del marchio — è un'icona, non una pubblicità.
 *  Vettoriale invece che PNG: stesso disegno, zero pixel, zero peso. */
const IconaWhatsApp = (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

export function Ordina() {
  const [query, setQuery] = useState('');
  /** I chili scelti, per nome di prodotto. Assente = non nell'ordine. */
  const [kg, setKg] = useState<Record<string, number>>({});
  /** I prodotti scritti a mano: il catalogo è parziale, l'ordine no. */
  const [extra, setExtra] = useState<{ nome: string; kg: number }[]>([]);
  /** Il ritiro scelto fra le finestre aperte. */
  const [ritiro, setRitiro] = useState<string | null>(null);
  /** Lo stato delle finestre: solo dopo il montaggio (vedi testata). */
  const [adesso, setAdesso] = useState<{ aperte: Finestra[]; prossima: Finestra } | null>(null);

  useEffect(() => {
    const stato = statoFinestre(minutoRoma());
    setAdesso(stato);
    if (stato.aperte.length > 0) setRitiro(stato.aperte[0].ritiro);
  }, []);

  const trovati = useMemo(() => cerca(query), [query]);

  const cambia = (nome: string, minKg: number, verso: 1 | -1) => {
    setKg((prima) => {
      const attuale = prima[nome] ?? 0;
      const nuovo = attuale === 0 ? (verso === 1 ? minKg : 0) : attuale + verso * PASSO_KG;
      const prossimo = { ...prima };
      if (nuovo < minKg) delete prossimo[nome];
      else prossimo[nome] = nuovo;
      return prossimo;
    });
  };

  const cambiaExtra = (nome: string, verso: 1 | -1) => {
    setExtra((prima) =>
      prima
        .map((v) => (v.nome === nome ? { ...v, kg: v.kg + verso * PASSO_KG } : v))
        .filter((v) => v.kg >= 1),
    );
  };

  const pulita = query.trim();
  const giaPresente =
    trovati.some((p) => normalizza(p.nome) === normalizza(pulita)) ||
    extra.some((v) => normalizza(v.nome) === normalizza(pulita));

  const aggiungiExtra = () => {
    if (!pulita || giaPresente) return;
    setExtra((prima) => [...prima, { nome: pulita, kg: 1 }]);
    setQuery('');
  };

  const scelti = ordinabili.filter((p) => (kg[p.nome] ?? 0) > 0);
  const voci = scelti.length + extra.length;
  const totaleKg =
    scelti.reduce((somma, p) => somma + kg[p.nome], 0) + extra.reduce((s, v) => s + v.kg, 0);

  /** Il messaggio: righe corte, dati e basta — dev'essere comodo da
   *  leggere sul telefono del banco, non elegante. */
  const messaggio = [
    `Ordine — ${company.brand}`,
    '',
    ...scelti.map((p) => `• ${p.nome} — ${kgTesto(kg[p.nome])}`),
    ...extra.map((v) => `• ${v.nome} — ${kgTesto(v.kg)}`),
    '',
    ritiro
      ? `Ritiro: ${ritiro}`
      : `Ritiro: da concordare (prenotazioni chiuse al momento dell’invio${
          adesso ? `, riaprono ${adesso.prossima.apreTesto}` : ''
        })`,
  ].join('\n');

  const invia = `https://wa.me/${company.whatsapp}?text=${encodeURIComponent(messaggio)}`;

  return (
    <div className="visita-carta ordina-carta">
      {/* Zona 1 · la ricerca */}
      <p className="micro carta-etichetta">Il tuo ordine</p>
      <input
        className="ordina-cerca"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cerca: mozzarella, formaggi, salumi…"
        aria-label="Cerca un prodotto da ordinare"
        autoComplete="off"
      />
      {/* Chiaro e tondo (parole dell'utente): la regola del titolare in
          quattro parole, non in una frase. */}
      <p className="micro ordina-regola">Ordine minimo: 1 kg.</p>

      {/* Zona 2 · la lista. Ogni riga: nome e categoria a sinistra, a
          destra «Aggiungi» che diventa uno stepper. Il meno sotto il
          minimo toglie il prodotto: il minimo non si aggira, si spiega. */}
      <div className="ordine-lista">
        {trovati.map((p) => {
          const q = kg[p.nome] ?? 0;
          return (
            <div className="ordine-riga" key={p.nome}>
              <div>
                <span className="ordine-nome">{p.nome}</span>
                <span className="ordine-dettaglio">
                  {[p.categoria, p.produttore].filter(Boolean).join(' · ')}
                </span>
              </div>
              {q === 0 ? (
                <button
                  type="button"
                  className="ordine-aggiungi"
                  onClick={() => cambia(p.nome, p.minKg, 1)}
                >
                  Aggiungi
                </button>
              ) : (
                <div className="ordine-passo">
                  <button
                    type="button"
                    className="passo-tasto"
                    onClick={() => cambia(p.nome, p.minKg, -1)}
                    aria-label={`Riduci ${p.nome}`}
                  >
                    −
                  </button>
                  <span className="passo-kg">{kgTesto(q)}</span>
                  <button
                    type="button"
                    className="passo-tasto"
                    onClick={() => cambia(p.nome, p.minKg, 1)}
                    aria-label={`Aumenta ${p.nome}`}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {extra.map((v) => (
          <div className="ordine-riga" key={v.nome}>
            <div>
              <span className="ordine-nome">{v.nome}</span>
              <span className="ordine-dettaglio">Aggiunto da te</span>
            </div>
            <div className="ordine-passo">
              <button
                type="button"
                className="passo-tasto"
                onClick={() => cambiaExtra(v.nome, -1)}
                aria-label={`Riduci ${v.nome}`}
              >
                −
              </button>
              <span className="passo-kg">{kgTesto(v.kg)}</span>
              <button
                type="button"
                className="passo-tasto"
                onClick={() => cambiaExtra(v.nome, 1)}
                aria-label={`Aumenta ${v.nome}`}
              >
                +
              </button>
            </div>
          </div>
        ))}

        {/* Il catalogo è parziale (blocco 10): quello che manca dalla
            lista non deve mancare dall'ordine. */}
        {pulita && !giaPresente && (
          <div className="ordine-riga">
            <div>
              <span className="ordine-nome">«{pulita}»</span>
              <span className="ordine-dettaglio">Non è ancora in lista — chiedilo al banco</span>
            </div>
            <button type="button" className="ordine-aggiungi" onClick={aggiungiExtra}>
              Aggiungi
            </button>
          </div>
        )}
      </div>

      <hr className="carta-filo" />

      {/* Zona 3 · il ritiro. Le finestre del titolare come informazione
          quieta — la stessa grammatica degli orari — e i giorni ordinabili
          adesso come chip da scegliere. */}
      <p className="micro carta-etichetta">Il ritiro</p>

      {adesso && adesso.aperte.length > 1 && (
        <div className="ritiro-chips" role="group" aria-label="Scegli il giorno di ritiro">
          {adesso.aperte.map((f) => (
            <button
              type="button"
              key={f.ritiro}
              className={`ritiro-chip${f.ritiro === ritiro ? ' ritiro-chip--attivo' : ''}`}
              onClick={() => setRitiro(f.ritiro)}
            >
              {f.ritiro}
            </button>
          ))}
        </div>
      )}

      {/* Due colonne dichiarate — il giorno del ritiro, la finestra in cui
          si ordina — nella stessa grammatica degli orari (brief 04/08:
          strutturato, non raccontato). La finestra aperta ADESSO si accende
          col punto verde; le altre sussurrano. La riga non cambia mai
          altezza quando lo stato arriva: solo colore e punto. */}
      {/* «Giorno», non «Ritiro»: l'etichetta della zona lo dice già, e
          una parola ripetuta a tre righe di distanza è rumore. */}
      <div className="ritiro-testata" aria-hidden="true">
        <span className="micro">Giorno</span>
        <span className="micro">Si ordina</span>
      </div>
      <dl className="carta-orari ritiro-righe">
        {finestre.map((f) => {
          const aperta = adesso?.aperte.some((a) => a.ritiro === f.ritiro) ?? false;
          return (
            <div className="orario-riga" key={f.ritiro}>
              <dt className="orario-giorno">{f.ritiro}</dt>
              <dd className={`ritiro-quando${aperta ? ' ritiro-quando--aperta' : ''}`}>
                {aperta && <span className="oggi-punto oggi-punto--verde" aria-hidden="true" />}
                {f.quando}
              </dd>
            </div>
          );
        })}
      </dl>

      {adesso && (
        <p className="ordina-sintesi">
          {adesso.aperte.length > 0
            ? `Ordinando adesso ritiri ${ritiro}.`
            : `Le prenotazioni riaprono ${adesso.prossima.apreTesto}, per il ritiro di ${adesso.prossima.ritiro}. Puoi comunque mandare l’ordine: ti rispondiamo noi.`}
        </p>
      )}

      <hr className="carta-filo" />

      {/* Zona 4 · l'invio. */}
      {voci > 0 && (
        <p className="ordina-totale">
          {voci === 1 ? 'Un prodotto' : `${voci} prodotti`} · {kgTesto(totaleKg)}
        </p>
      )}
      <div className="carta-azioni">
        {voci > 0 ? (
          <a className="bottone bottone--pieno" href={invia} target="_blank" rel="noreferrer">
            {IconaWhatsApp}
            Invia l’ordine su WhatsApp
          </a>
        ) : (
          <span className="bottone bottone--pieno bottone--spento" aria-disabled="true">
            {IconaWhatsApp}
            Invia l’ordine su WhatsApp
          </span>
        )}
      </div>
      <p className="micro ordina-nota">
        Si apre WhatsApp col messaggio già scritto. L’ordine vale quando ti rispondiamo.
      </p>
    </div>
  );
}
