'use client';

// Il regista del QUARTIERE (capitolo 3): UN componente per TUTTI e tre gli
// incontri — Otello che torna, il maranza pentito, il custode del Rossini.
// È il pattern del primo incontro GENERALIZZATO: invece di tre copie di
// PrimoIncontro.tsx c'è una tabella di scene (etichette, dialoghi, fabbrica
// della missione) e una sola macchina a stati che la percorre per ogni
// personaggio. Questo componente non disegna nulla: i passi li fa stepNpcs
// (stati 'avvicina'/'chiede' dei pedoni fissi), i pixel li fanno Npcs.tsx e
// Maranza.tsx (fumetti), le scelte arrivano dal ponte di quartiere.ts — il
// DOM scrive, il frame legge, e la scena ha un padrone solo.
//
// Otello è LO STESSO NPC fisso della m00: PrimoIncontro.tsx lo rilascia a
// missione chiusa (fisso = false), e qui lo si RIPRENDE in carico — torna
// fisso al suo spiazzo, come chiede il capitolo («dopo la m00 resta al suo
// posto»). La presa aspetta che il rilascio sia avvenuto: due registi sullo
// stesso pedone nello stesso frame sono il modo sicuro per vederlo
// camminare in due direzioni insieme.
//
// Le missioni in corso non si salvano (convenzione di tutto il gioco: solo
// missioniFatte): chi ricarica a metà spesa riparte dal dialogo. Quel che
// non riparte mai è la missione chiusa — 'q01'/'q02'/'q03' stanno in
// missioniFatte e i personaggi passano alla fase 'finita'.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco } from '@/lib/lugo/veicoli';
import { missioneById, registraDinamica, type Missione } from '@/lib/lugo/missions';
import {
  CHI_QUARTIERE,
  MISSIONE_DI,
  creaMissioneLuci,
  creaMissioneScuse,
  creaMissioneSpesa,
  meteQuartiere,
  ponteQuartiere,
  sbloccoQuartiere,
  type ChiQuartiere,
} from '@/lib/lugo/quartiere';
import { GRUPPI, oraGioco } from '@/lib/lugo/maranza';
import { ANCORA_PRIMO_INCONTRO, type Npc } from '@/lib/lugo/npc';
import { livelloDaRep } from '@/lib/lugo/progressione';
import { runtime } from '@/lib/lugo/runtime';
import { suonaEvento, parla } from '@/lib/lugo/audio';
import { useLugo, type Dialogo } from '@/lib/lugo/store';
import { QA } from '@/lib/lugo/qa';

type LugoState = ReturnType<typeof useLugo.getState>;

type FaseScena =
  | 'dormiente' // solo Otello: la m00 non è ancora chiusa, il pedone è di PrimoIncontro
  | 'attesa' // fermo al suo posto, pronto alla E
  | 'dialogo' // pannello aperto, si aspettano le scelte
  | 'inCorso' // la sua missione è attiva
  | 'arrivo' // missione completata: battuta finale
  | 'coda' // solo pentito accompagnato: la battuta in più dopo il titolare
  | 'finita'; // storia chiusa: resta lì, faccia del quartiere

// Gli scostamenti nel gruppo 'quartiere' dell'atlante (lib/lugo/maranza.ts):
// contratto append-only, questi indici non possono slittare.
const FRASE_Q = {
  riconosce: 0,
  grazieOtello: 1,
  aggancioPentito: 2,
  seguimi: 3,
  arrivoPentito: 4,
  aggancioCustode: 5,
  arrivoCustode: 6,
} as const;

interface Scena {
  fase: FaseScena;
  indice: number;
  ancora: { x: number; z: number } | null;
  /** Il nodo del dialogo aperto ('saluto', 'proposta'…). */
  nodo: string;
  /** Riposo dopo un «Magari dopo» o un pannello evaporato. */
  cooldown: number;
  cooldownFumetto: number;
  /** Respiro fra la scheda MISSIONE COMPLETATA e la battuta finale. */
  timerArrivo: number;
  missione: Missione | null;
  /** Solo pentito: la q02 è nella forma «ti accompagno». */
  accompagnato: boolean;
}

const scenaNuova = (fase: FaseScena): Scena => ({
  fase,
  indice: -1,
  ancora: null,
  nodo: '',
  cooldown: 0,
  cooldownFumetto: 0,
  timerArrivo: 0,
  missione: null,
  accompagnato: false,
});

/** La tabella delle scene: quello che cambia da personaggio a personaggio. */
const SCHEDA: Record<
  ChiQuartiere,
  { etichetta: string; voce: string; aggancio: number; finale: number }
> = {
  otello: { etichetta: 'Otello, il signore del pacchetto', voce: 'anziano', aggancio: FRASE_Q.riconosce, finale: FRASE_Q.grazieOtello },
  pentito: { etichetta: 'Un maranza pentito', voce: 'maranza', aggancio: FRASE_Q.aggancioPentito, finale: FRASE_Q.arrivoPentito },
  custode: { etichetta: 'Il custode del Rossini', voce: 'anziano', aggancio: FRASE_Q.aggancioCustode, finale: FRASE_Q.arrivoCustode },
};

export function Quartiere() {
  const mondo = useMondo();
  const fisica = useMemo(() => infraGioco(mondo).fisica, [mondo]);

  const scene = useRef<Record<ChiQuartiere, Scena>>({
    otello: scenaNuova('dormiente'),
    pentito: scenaNuova('attesa'),
    custode: scenaNuova('attesa'),
  });
  const risolti = useRef(false);
  const forzaChi = useRef<ChiQuartiere | null>(null);
  // il piccolo festeggiamento quando la terza storia si chiude: armato al
  // momento giusto, detto DOPO che la scheda MISSIONE COMPLETATA ha finito
  const festa = useRef({ armata: false, t: 0, detta: false });

  // Le mete si risolvono subito, come la missione della m00: i dialoghi
  // nominano supermercato, bar e botteghe prima che una missione esista.
  useEffect(() => {
    meteQuartiere(mondo, (x, z, r) => fisica.cerchioLibero(x, z, r));
  }, [mondo, fisica]);

  // ── hook di collaudo ──────────────────────────────────────────────────
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    const statoDi = (chi: ChiQuartiere) => {
      const st = useLugo.getState();
      const s = scene.current[chi];
      const p = ponteQuartiere.personaggi[chi];
      return {
        fase: s.fase,
        x: p.x,
        z: p.z,
        disponibile: p.disponibile,
        sbloccata: sbloccoQuartiere(chi, st.missioniFatte, livelloDaRep(st.punteggio).n),
        fatta: st.missioniFatte.includes(MISSIONE_DI[chi]),
        missione: MISSIONE_DI[chi],
        cooldown: Math.max(0, s.cooldown),
      };
    };
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      quartiere: () => ({
        fatte: useLugo
          .getState()
          .missioniFatte.filter((id) => id === 'q01' || id === 'q02' || id === 'q03'),
        otello: statoDi('otello'),
        pentito: { ...statoDi('pentito'), segue: ponteQuartiere.segue },
        custode: statoDi('custode'),
      }),
      // porta il personaggio a due metri dal giocatore e apre il pannello:
      // in headless nessuno può camminare fino al Pavaglione a ogni prova.
      // Se la storia è bloccata (sblocchi in quartiere.ts) NON succede
      // niente: è la stessa cosa che vedrebbe il giocatore con la E.
      forzaDialogoQuartiere: (chi: ChiQuartiere) => {
        if (!CHI_QUARTIERE.includes(chi)) return false;
        forzaChi.current = chi;
        return true;
      },
    };
  }, []);

  // mette una battuta del gruppo 'quartiere' sopra la testa: stessi campi
  // dei fumetti dei maranza, li disegna Maranza.tsx senza sapere di chi è
  const di = (n: Npc, scostamento: number, durata: number) => {
    n.frase = GRUPPI.quartiere[0] + scostamento;
    n.fraseDa = oraGioco();
    n.fraseFino = oraGioco() + durata;
  };

  // un punto libero accanto a (x,z): per riposizionare un personaggio senza
  // murarlo dentro un tavolino o un'auto in sosta
  const puntoLibero = (x: number, z: number): { x: number; z: number } => {
    for (const [dx, dz] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2], [1.7, 1.7], [-1.7, -1.7]]) {
      if (fisica.cerchioLibero(x + dx, z + dz, 0.3)) return { x: x + dx, z: z + dz };
    }
    return { x, z };
  };

  // ── i dialoghi: una tabella di nodi per personaggio ───────────────────
  // Ogni nodo restituisce il pannello già pronto; le transizioni stanno in
  // `gestisciScelta`. Gli id sono namespace 'q01-'/'q02-'/'q03-': è la
  // firma che Hud.rispondi usa per instradare la scelta sul ponte.
  const dialogoDi = (chi: ChiQuartiere, nodo: string): Dialogo | null => {
    const mete = meteQuartiere(mondo);
    const dopo = { id: 'dopo', label: 'Magari dopo' };
    if (chi === 'otello') {
      if (nodo === 'saluto') {
        return {
          id: 'q01-saluto',
          chi: SCHEDA.otello.etichetta,
          testo: '“Ah! Il ragazzo del pacchetto! Lo sapevo che ripassavi.”',
          opzioni: [{ id: 'avanti', label: '“Mi si riconosce facile.”' }, dopo],
        };
      }
      if (nodo === 'favore') {
        return {
          id: 'q01-favore',
          chi: SCHEDA.otello.etichetta,
          testo: `“Senti: la mia spesa è pronta al ${mete.spesa.nome}, già pagata. Me la riporti qui? Con le mie gambe, capisci…”`,
          opzioni: [{ id: 'volentieri', label: '“Volentieri.”' }, dopo],
        };
      }
      return {
        id: 'q01-arrivo',
        chi: SCHEDA.otello.etichetta,
        testo: '“La spesa! Grazie, stasera si mangia. …Sei sempre tu quello del pacchetto, eh.”',
        opzioni: [{ id: 'ok', label: '“Sempre io.”' }],
      };
    }
    if (chi === 'pentito') {
      if (nodo === 'saluto') {
        return {
          id: 'q02-saluto',
          chi: SCHEDA.pentito.etichetta,
          testo: '“Oh… ehi. Tu giri tanto, no? Mi serve una mano per una figuraccia.”',
          opzioni: [{ id: 'avanti', label: '“Sentiamo.”' }, dopo],
        };
      }
      if (nodo === 'proposta') {
        return {
          id: 'q02-proposta',
          chi: SCHEDA.pentito.etichetta,
          testo: `“Ieri al ${mete.bar.nome} ho fatto cadere un vassoio intero. Vorrei far arrivare due scuse e un pacchetto di paste. Ci pensi tu?”`,
          opzioni: [
            { id: 'convincilo', label: '“Vieni anche tu: scusarsi di persona vale doppio.”' },
            { id: 'portoio', label: '“Va bene: porto io le paste.”' },
            dopo,
          ],
        };
      }
      if (nodo === 'convinci') {
        return {
          id: 'q02-convinci',
          chi: SCHEDA.pentito.etichetta,
          testo: '“Vacci tu, che figura ci faccio io?”',
          opzioni: [
            { id: 'insieme', label: '“Appunto: la TUA figura. Dai, ti accompagno.”' },
            { id: 'portoio', label: '“Ok, ok: porto io le paste.”' },
            dopo,
          ],
        };
      }
      if (nodo === 'arrivo') {
        // il titolare è un personaggio di FANTASIA: del bar vero si usa
        // solo il nome, come per il barista della m00
        return {
          id: 'q02-arrivo',
          chi: 'Il titolare del bar',
          testo: '“Paste e scuse? …Va bene, digli che è acqua passata.”',
          opzioni: [{ id: 'ok', label: '“Riferisco.”' }],
        };
      }
      // la battuta in più della forma accompagnata: lui c'era, e l'ha sentita
      return {
        id: 'q02-coda',
        chi: SCHEDA.pentito.etichetta,
        testo: '“Hai sentito? ‘Acqua passata’. Le paste, prima o poi, le offro io.”',
        opzioni: [{ id: 'ok', label: '“Segno sul calendario.”' }],
      };
    }
    // custode
    if (nodo === 'saluto') {
      return {
        id: 'q03-saluto',
        chi: SCHEDA.custode.etichetta,
        testo: '“Giovane! Stasera il Rossini si accende e a me mancano tre cose. Hai gambe buone?”',
        opzioni: [{ id: 'avanti', label: '“Abbastanza. Cosa serve?”' }, dopo],
      };
    }
    if (nodo === 'lista') {
      return {
        id: 'q03-lista',
        chi: SCHEDA.custode.etichetta,
        // niente «dalla farmacia …» prima del nome: molte farmacie di OSM
        // si chiamano già «Farmacia Tal dei Tali», e la categoria ripetuta
        // suonava come una balbuzie del pannello
        testo: `“Una cosa da ${mete.farmacia.nome}, una da ${mete.tabacchi.nome}, una da ${mete.negozio.nome}. Poi torna qui, che si prova il giro luci.”`,
        opzioni: [{ id: 'volentieri', label: '“Volentieri.”' }, dopo],
      };
    }
    return {
      id: 'q03-arrivo',
      chi: SCHEDA.custode.etichetta,
      testo: '“C’è tutto: si va in scena. Stasera il Rossini brilla — e un po’ è merito tuo.”',
      opzioni: [{ id: 'ok', label: '“In bocca al lupo per la serata.”' }],
    };
  };

  const apriNodo = (chi: ChiQuartiere, s: Scena, n: Npc, st: LugoState, nodo: string) => {
    const d = dialogoDi(chi, nodo);
    if (!d) return;
    s.fase = 'dialogo';
    s.nodo = nodo;
    n.stato = 'chiede';
    n.fermoDa = 0;
    st.setDialogo(d);
    suonaEvento('tappa');
    parla(SCHEDA[chi].voce);
  };

  // l'avvio della missione: identico schema di accetta() del primo
  // incontro — la macchina delle missioni vede l'avvio «da fuori» e prende
  // in mano tutto il resto (tappe, premio, guardia del pagamento)
  const accetta = (chi: ChiQuartiere, s: Scena, n: Npc, st: LugoState, accompagnato: boolean) => {
    const libero = (x: number, z: number, r: number) => fisica.cerchioLibero(x, z, r);
    const m =
      chi === 'otello'
        ? creaMissioneSpesa(mondo, libero)
        : chi === 'pentito'
          ? creaMissioneScuse(mondo, accompagnato, libero)
          : creaMissioneLuci(mondo, libero);
    s.missione = m;
    s.accompagnato = accompagnato;
    st.setMissione(m.id, 'attiva', 0);
    st.setTempoResiduo(null);
    st.setIntro({
      etichetta: 'NUOVA MISSIONE',
      titolo: m.titolo,
      frase: m.frase,
      obiettivo: m.tappe[0].titolo,
    });
    suonaEvento('tappa');
    if (chi === 'pentito' && accompagnato) di(n, FRASE_Q.seguimi, 3);
    s.fase = 'inCorso';
  };

  const rifiuta = (s: Scena) => {
    // il «no» non è mai un vicolo cieco: si resta lì e ci si può riprovare
    s.cooldown = 10;
    s.fase = 'attesa';
  };

  // le scelte dei pannelli, nodo per nodo: è l'unico posto che conosce il
  // grafo dei dialoghi, così aggiungerci un ramo domani è un caso in più qui
  const gestisciScelta = (
    chi: ChiQuartiere,
    s: Scena,
    n: Npc,
    st: LugoState,
    scelta: string,
  ) => {
    if (scelta === 'dopo') {
      rifiuta(s);
      return;
    }
    if (chi === 'otello') {
      if (s.nodo === 'saluto' && scelta === 'avanti') apriNodo(chi, s, n, st, 'favore');
      else if (s.nodo === 'favore' && scelta === 'volentieri') accetta(chi, s, n, st, false);
      return;
    }
    if (chi === 'pentito') {
      if (s.nodo === 'saluto' && scelta === 'avanti') apriNodo(chi, s, n, st, 'proposta');
      else if (s.nodo === 'proposta' && scelta === 'convincilo') apriNodo(chi, s, n, st, 'convinci');
      else if (scelta === 'portoio') accetta(chi, s, n, st, false);
      else if (s.nodo === 'convinci' && scelta === 'insieme') accetta(chi, s, n, st, true);
      return;
    }
    if (s.nodo === 'saluto' && scelta === 'avanti') apriNodo(chi, s, n, st, 'lista');
    else if (s.nodo === 'lista' && scelta === 'volentieri') accetta(chi, s, n, st, false);
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useLugo.getState();
    const rt = runtime.rt;
    const npcs = runtime.npcs;
    if (st.fase !== 'gioco' || !rt || !npcs) return;

    // ── la risoluzione degli indici, una volta ──────────────────────────
    if (!risolti.current) {
      // Otello è il fisso SENZA ruolo (npc.ts): al primo frame è ancora
      // fisso anche a m00 chiusa, perché questo componente è montato prima
      // di PrimoIncontro e gira prima del suo rilascio. Il ripiego —
      // l'anziano più vicino all'ancora — copre l'ordine opposto, se un
      // giorno il montaggio cambiasse.
      let iOtello = npcs.findIndex((q) => q.fisso && !q.ruolo && q.tipo === 'anziano');
      if (iOtello < 0) {
        let dMin = 12;
        npcs.forEach((q, i) => {
          if (q.tipo !== 'anziano' || q.ruolo) return;
          const d = Math.hypot(q.x - ANCORA_PRIMO_INCONTRO.x, q.z - ANCORA_PRIMO_INCONTRO.z);
          if (d < dMin) {
            dMin = d;
            iOtello = i;
          }
        });
      }
      const iPentito = npcs.findIndex((q) => q.ruolo === 'pentito');
      const iCustode = npcs.findIndex((q) => q.ruolo === 'custode');
      if (iPentito < 0 || iCustode < 0) return; // mondo non ancora popolato
      scene.current.otello.indice = iOtello;
      scene.current.pentito.indice = iPentito;
      scene.current.custode.indice = iCustode;
      for (const chi of CHI_QUARTIERE) {
        const s = scene.current[chi];
        const n = npcs[s.indice];
        if (n) s.ancora = { x: n.x, z: n.z };
      }
      // storie già chiuse al caricamento: personaggi in fase 'finita', e il
      // pentito sta VICINO AL BAR — è lì che la sua storia l'ha lasciato,
      // e ricaricare la pagina non deve riportarlo alla figuraccia
      const fatteOra = st.missioniFatte;
      if (fatteOra.includes('q01')) scene.current.otello.fase = 'finita';
      if (fatteOra.includes('q03')) scene.current.custode.fase = 'finita';
      if (fatteOra.includes('q02')) {
        const s = scene.current.pentito;
        const n = npcs[s.indice];
        const bar = meteQuartiere(mondo).bar;
        const p = puntoLibero(bar.x, bar.z);
        if (n) {
          n.x = p.x;
          n.z = p.z;
        }
        s.ancora = p;
        s.fase = 'finita';
      }
      risolti.current = true;
    }

    // ── il ponte si consuma UNA volta a inizio giro ─────────────────────
    // (la lezione del primo incontro: una scelta o una E lasciate appese
    // scatterebbero in un momento a caso)
    const parlaCon = ponteQuartiere.parla;
    ponteQuartiere.parla = null;
    const scelta = ponteQuartiere.scelta;
    ponteQuartiere.scelta = null;
    const forza = forzaChi.current;
    forzaChi.current = null;

    const livello = livelloDaRep(st.punteggio).n;
    const pannelloAperto = st.dialogo || st.vetrina || st.bacheca || st.diario || st.guardaroba;

    // il festeggiamento del quartiere completo, dopo la scheda di esito
    if (festa.current.armata) {
      festa.current.t -= dt;
      if (festa.current.t <= 0) {
        festa.current.armata = false;
        festa.current.detta = true;
        st.setAvviso('Il quartiere ormai ti conosce.');
      }
    }

    for (const chi of CHI_QUARTIERE) {
      const s = scene.current[chi];
      const n = npcs[s.indice];
      const ponte = ponteQuartiere.personaggi[chi];
      if (!n || !s.ancora) continue;

      ponte.x = n.x;
      ponte.z = n.z;
      s.cooldown -= dt;
      s.cooldownFumetto -= dt;

      // «ti sta seguendo» è un derivato, non un secondo stato da tenere
      // allineato: vero solo mentre la q02 accompagnata è in scena
      if (chi === 'pentito') {
        ponteQuartiere.segue = s.accompagnato && (s.fase === 'inCorso' || s.fase === 'arrivo');
      }

      const qId = MISSIONE_DI[chi];
      const fatta = st.missioniFatte.includes(qId);
      const sbloccata = sbloccoQuartiere(chi, st.missioniFatte, livello);
      const qAttiva = st.missioneId === qId && st.statoMissione === 'attiva';
      const qCompletata = st.missioneId === qId && st.statoMissione === 'completata';
      const dG = Math.hypot(n.x - rt.persona.x, n.z - rt.persona.z);

      // ── Otello: la presa in carico dopo la m00 ────────────────────────
      if (chi === 'otello' && s.fase === 'dormiente') {
        ponte.disponibile = false;
        // si aspetta il RILASCIO di PrimoIncontro (fisso = false): finché
        // il pacco è in scena il pedone ha già un regista, ed è lui
        if (st.missioniFatte.includes('m00') && !n.fisso) {
          n.fisso = true;
          n.stato = 'fermo';
          n.timer = 5;
          s.fase = fatta ? 'finita' : 'attesa';
        }
        continue;
      }

      // la dinamica attiva non deve evaporare dal registro LRU: questo
      // componente è montato prima di <Missioni /> apposta (dentro Npcs)
      if (qAttiva && s.missione && !missioneById(qId)) registraDinamica(s.missione);

      ponte.disponibile =
        s.fase === 'attesa' && sbloccata && !fatta && !qAttiva && s.cooldown <= 0;

      // ── missione completata: la battuta finale ────────────────────────
      if ((s.fase === 'inCorso' || s.fase === 'attesa') && qCompletata) {
        s.timerArrivo = 4.8;
        di(n, SCHEDA[chi].finale, 3.2);
        if (!st.dialogo && st.mode === 'piedi') {
          apriNodo(chi, s, n, st, 'arrivo');
          s.fase = 'arrivo'; // apriNodo l'ha messa a 'dialogo': qui comanda l'arrivo
        } else if (st.mode !== 'piedi') {
          // arrivato col mezzo: nessun pannello in guida, la battuta si
          // riduce a un avviso — stessa cortesia dell'arrivo della m00
          st.setAvviso(chi === 'pentito' ? '“Digli che è acqua passata.”' : '“Grazie! Sei d’oro.”');
          s.fase = 'arrivo';
        } else {
          s.fase = 'arrivo';
        }
        // l'ultima storia chiusa arma il festeggiamento (una volta sola)
        const fatteDopo = st.missioniFatte;
        if (
          !festa.current.detta &&
          fatteDopo.includes('q01') &&
          fatteDopo.includes('q02') &&
          fatteDopo.includes('q03')
        ) {
          festa.current.armata = true;
          festa.current.t = 5.4;
        }
        continue;
      }

      if (s.fase === 'arrivo') {
        s.timerArrivo -= dt;
        // il pentito accompagnato compie il suo pezzo di scena: cammina
        // fino al bar e quello diventa il suo posto nuovo
        if (chi === 'pentito' && s.accompagnato) {
          const bar = meteQuartiere(mondo).bar;
          const dBar = Math.hypot(n.x - bar.x, n.z - bar.z);
          if (dBar > 1.6) {
            n.stato = 'avvicina';
            n.targetX = bar.x;
            n.targetZ = bar.z;
          } else {
            n.stato = 'fermo';
            s.ancora = { x: n.x, z: n.z };
          }
          // la battuta in più: quando il titolare ha detto la sua e lui è
          // arrivato (o il tempo è scaduto: mai una scena incastrata)
          if (!st.dialogo && (dBar < 3 || s.timerArrivo < -6) && st.mode === 'piedi') {
            apriNodo(chi, s, n, st, 'coda');
            s.fase = 'coda';
          } else if (s.timerArrivo < -20) {
            // il giocatore è ripartito col mezzo e la coda non può aprirsi:
            // la scena si chiude lo stesso, col pentito al suo posto nuovo
            s.ancora = { x: n.x, z: n.z };
            s.fase = 'finita';
          }
          continue;
        }
        if (!st.dialogo && s.timerArrivo <= 0) s.fase = 'finita';
        continue;
      }

      if (s.fase === 'coda') {
        // si aspetta solo che il pannello della coda si chiuda (la scelta
        // 'ok' o una chiusura qualsiasi): poi la storia è finita davvero
        if (!st.dialogo) {
          s.fase = 'finita';
          s.ancora = { x: n.x, z: n.z };
        }
        continue;
      }

      if (s.fase === 'finita') {
        ponte.disponibile = false;
        // faccia del quartiere: resta al suo posto (il pugno di un passante
        // o una spinta possono averlo mosso: rientra da solo)
        const dA = Math.hypot(n.x - s.ancora.x, n.z - s.ancora.z);
        if (dA > 1.5) {
          n.stato = 'avvicina';
          n.targetX = s.ancora.x;
          n.targetZ = s.ancora.z;
        } else if (n.stato !== 'fermo') {
          n.stato = 'fermo';
          n.timer = 5;
        }
        continue;
      }

      // ── missione in corso ─────────────────────────────────────────────
      if (s.fase === 'inCorso') {
        ponte.disponibile = false;
        if (!qAttiva && !qCompletata) {
          // la missione è stata scavalcata (una consegna accettata in
          // bacheca la sostituisce, come per tutte) o è evaporata: si
          // torna in attesa, riprovabile — mai un personaggio incastrato
          ponteQuartiere.segue = chi === 'pentito' ? false : ponteQuartiere.segue;
          s.accompagnato = false;
          s.cooldown = 6;
          s.fase = 'attesa';
          continue;
        }
        if (chi === 'pentito' && s.accompagnato) {
          // ti segue a piedi: è lo schema del gregario dei carabinieri
          // (una meta riscritta ogni frame), fatto con lo stato 'avvicina'
          // dei fissi. Da vicino passa a 'chiede': tiene la distanza e ti
          // guarda — sta ripassando le scuse, mica ti pedina.
          if (dG > 120) {
            // seminato con un teleport o un'auto: lo si riporta accanto,
            // com'è giusto per una scena e non per una maratona
            const p = puntoLibero(rt.persona.x + 1.5, rt.persona.z + 1.5);
            n.x = p.x;
            n.z = p.z;
          } else if (dG > 2.6) {
            n.stato = 'avvicina';
            n.targetX = rt.persona.x;
            n.targetZ = rt.persona.z;
          } else {
            n.stato = 'chiede';
          }
        } else {
          // chi NON ti segue torna al suo posto e lì ti aspetta: il
          // forzaDialogo del collaudo può averlo teletrasportato accanto al
          // giocatore, e la tappa del ritorno punta all'ANCORA — senza il
          // rientro la missione direbbe «riporta la spesa a Otello» con
          // Otello da tutt'altra parte
          const dCasa = Math.hypot(n.x - s.ancora.x, n.z - s.ancora.z);
          if (dCasa > 1.5) {
            n.stato = 'avvicina';
            n.targetX = s.ancora.x;
            n.targetZ = s.ancora.z;
          } else if (n.stato === 'avvicina' || n.stato === 'chiede') {
            n.stato = 'fermo';
            n.timer = 5;
          }
          if (dG < 8 && s.cooldownFumetto <= 0) {
            // ripassi di lì con la commissione in tasca: un promemoria
            s.cooldownFumetto = 20;
            di(n, SCHEDA[chi].aggancio, 2.6);
          }
        }
        continue;
      }

      // ── dialogo aperto ────────────────────────────────────────────────
      if (s.fase === 'dialogo') {
        n.stato = 'chiede';
        // sei salito su un mezzo o te ne sei andato: la scena si chiude da
        // sola invece di inseguirti a schermo
        if (st.mode !== 'piedi' || dG > 12) {
          if (st.dialogo?.id.startsWith(qId + '-')) st.setDialogo(null);
          s.cooldown = 8;
          s.fase = 'attesa';
          continue;
        }
        if (scelta && st.dialogo === null) {
          // la scelta è arrivata via Hud.rispondi (che chiude il pannello)
          gestisciScelta(chi, s, n, st, scelta);
          continue;
        }
        // pannello sparito senza scelta (chiudiPannelli del collaudo, o un
        // altro sistema): non è un rifiuto, si riprova presto
        if (!st.dialogo) {
          s.cooldown = 4;
          s.fase = 'attesa';
        }
        continue;
      }

      // ── fase 'attesa' ─────────────────────────────────────────────────
      // rientro all'ancora se qualcosa l'ha spostato (un pugno, un balzo
      // richiesto a mano): un volto fisso che deriva per la piazza è un
      // appuntamento che nessuno trova più
      const dA = Math.hypot(n.x - s.ancora.x, n.z - s.ancora.z);
      if (dA > 1.5) {
        n.stato = 'avvicina';
        n.targetX = s.ancora.x;
        n.targetZ = s.ancora.z;
      } else if (n.stato === 'avvicina') {
        n.stato = 'fermo';
        n.timer = 5;
      }

      // da vicino ti segue con lo sguardo (da fermo stepNpcs non ruota)
      if (dG < 12) {
        let dy = Math.atan2(rt.persona.z - n.z, rt.persona.x - n.x) - n.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        n.yaw += dy * Math.min(1, dt * 4);
      }

      // l'invito col fumetto: MAI in QA, stessa disciplina del primo
      // incontro — un fumetto a sorpresa sporcherebbe le prove dei
      // fumetti dell'incontro sigaretta, che confrontano testi alla lettera
      if (!QA && ponte.disponibile && dG < 9 && s.cooldownFumetto <= 0 && st.mode === 'piedi') {
        s.cooldownFumetto = 14;
        di(n, SCHEDA[chi].aggancio, 3);
      }

      // l'apertura forzata del collaudo: un punto libero a due metri,
      // davanti al giocatore, così il pannello descrive uno che c'è
      if (forza === chi && ponte.disponibile) {
        for (const giroAng of [0, 0.6, -0.6, 1.2, -1.2, 2, -2, Math.PI]) {
          const a = rt.persona.yaw + giroAng;
          const x = rt.persona.x + Math.cos(a) * 2.1;
          const z = rt.persona.z + Math.sin(a) * 2.1;
          if (!fisica.cerchioLibero(x, z, 0.3)) continue;
          n.x = x;
          n.z = z;
          break;
        }
        apriNodo(chi, s, n, st, 'saluto');
        continue;
      }

      // la E del Player: si apre solo senza altri pannelli di mezzo
      if (parlaCon === chi && ponte.disponibile && st.mode === 'piedi' && dG < 3.6 && !pannelloAperto) {
        apriNodo(chi, s, n, st, 'saluto');
      }
    }
  });

  return null;
}
