'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import type { Fase } from '@/lib/dominio/tipi';
import { cambiaFase } from '../azioni';

// Il kanban. Trascinare una card non è un effetto: cambia la fase del
// contatto, scrive l'evento nella sua storia e, se non ne ha una, gli apre la
// prossima azione. Su telefono si trascina male, quindi ogni card ha anche un
// menu per spostarsi — stessa azione, stesso risultato.

export type Carta = {
  id: string;
  nome: string;
  fonte: string;
  coloreFonte: string;
  interesse: string | null;
  valore: string;
  ultimoTocco: string;
  prossima: string | null;
  scadenza: string | null;
  inRitardo: boolean;
  priorita: 'urgente' | 'da_fare' | 'normale';
};

export type Colonna = {
  fase: Fase;
  nome: string;
  valore: string;
  carte: Carta[];
};

export function Kanban({ colonne }: { colonne: Colonna[] }) {
  const [inCorso, avvia] = useTransition();
  const [bersaglio, setBersaglio] = useState<Fase | null>(null);
  const [inVolo, setInVolo] = useState<string | null>(null);

  // Mentre il server salva, la card è già nella colonna nuova: aspettare il
  // giro completo per vederla muovere farebbe sembrare il CRM rotto.
  const [viste, spostaSubito] = useOptimistic(
    colonne,
    (attuali: Colonna[], mossa: { id: string; verso: Fase }) => {
      let carta: Carta | undefined;
      const senza = attuali.map((c) => {
        const trovata = c.carte.find((x) => x.id === mossa.id);
        if (trovata) carta = trovata;
        return { ...c, carte: c.carte.filter((x) => x.id !== mossa.id) };
      });
      if (!carta) return attuali;
      return senza.map((c) => (c.fase === mossa.verso ? { ...c, carte: [carta!, ...c.carte] } : c));
    },
  );

  function sposta(id: string, verso: Fase) {
    avvia(async () => {
      spostaSubito({ id, verso });
      const dati = new FormData();
      dati.set('id', id);
      dati.set('fase', verso);
      await cambiaFase(dati);
    });
  }

  return (
    <div className="kanban" aria-busy={inCorso}>
      {viste.map((colonna) => (
        <section
          key={colonna.fase}
          className={`colonna${bersaglio === colonna.fase ? ' bersaglio' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setBersaglio(colonna.fase); }}
          onDragLeave={() => setBersaglio((b) => (b === colonna.fase ? null : b))}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            setBersaglio(null);
            setInVolo(null);
            if (id) sposta(id, colonna.fase);
          }}
          aria-label={`${colonna.nome}, ${colonna.carte.length} contatti`}
        >
          <header className="colonna-capo">
            <span className="nome">{colonna.nome}</span>
            <span className="conta">{colonna.carte.length}</span>
            {colonna.valore !== '—' && <span className="valore">{colonna.valore}</span>}
          </header>

          {colonna.carte.length === 0 && (
            <p className="nota-piede" style={{ padding: '6px 2px' }}>Vuota</p>
          )}

          {colonna.carte.map((carta) => (
            <article
              key={carta.id}
              className={`carta-kanban con-striscia ${carta.priorita}${inVolo === carta.id ? ' in-volo' : ''}`}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', carta.id); setInVolo(carta.id); }}
              onDragEnd={() => setInVolo(null)}
            >
              <Link href={`/contatti/${carta.id}`} className="nome">{carta.nome}</Link>
              <div className="meta">
                <span className="fonte">
                  <span className="punto" style={{ background: carta.coloreFonte }} aria-hidden="true" />
                  {carta.fonte}
                </span>
                {carta.interesse && <span>{carta.interesse}</span>}
                <span className="euro">{carta.valore}</span>
              </div>
              <div className="meta">Ultimo contatto: {carta.ultimoTocco}</div>

              <div className="prossima">
                {carta.prossima ? (
                  <>
                    {carta.prossima}
                    <br />
                    <span style={{ color: carta.inRitardo ? 'var(--urgente)' : 'var(--ink-3)' }}>
                      {carta.inRitardo ? 'in ritardo, ' : ''}{carta.scadenza}
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'var(--urgente)' }}>Nessuna prossima azione</span>
                )}
              </div>

              <div className="sposta">
                <label htmlFor={`sposta-${carta.id}`} style={{ marginBottom: 3 }}>Sposta in</label>
                <select
                  id={`sposta-${carta.id}`}
                  value={colonna.fase}
                  onChange={(e) => sposta(carta.id, e.target.value as Fase)}
                >
                  {viste.map((c) => (
                    <option key={c.fase} value={c.fase}>{c.nome}</option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
