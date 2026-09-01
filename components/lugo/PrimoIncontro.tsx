'use client';

// Il primo incontro di LUGO CITY: l'anziano col pacchetto che aspetta nel
// parcheggio dietro la Rocca e regala al giocatore la prima vera missione
// («Sei nuovo?», m00). Questo componente non disegna nulla: è il regista
// della scena — guida l'NPC fisso creato da creaNpcs (lib/lugo/npc.ts),
// apre i dialoghi, consegna il pacco e registra la missione dinamica.
//
// La divisione dei compiti è la stessa dell'incontro col maranza: la
// fisica e i passi li fa stepNpcs (stati 'avvicina'/'chiede'), i pixel li
// fanno Npcs.tsx e Maranza.tsx (fumetti), le scelte del pannello arrivano
// dal ponte di missions.ts (il DOM scrive, il frame legge). Qui vive SOLO
// la macchina a stati della scena, così c'è un padrone unico e il pannello
// non può mai raccontare una cosa diversa da quella che succede in strada.
//
// La missione in corso non si salva: chi ricarica a metà consegna riparte
// dal dialogo, col pacco di nuovo in mano all'anziano. È il comportamento
// di tutte le missioni del gioco (si salva solo missioniFatte), e per una
// scena da novanta secondi è il compromesso giusto. Quel che invece NON
// riparte mai è la missione già chiusa: 'm00' sta in missioniFatte, e al
// ricaricamento l'anziano torna un passante qualsiasi.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco } from '@/lib/lugo/veicoli';
import {
  creaMissionePrimoIncontro,
  missioneById,
  registraDinamica,
  pontePrimoIncontro,
  type Missione,
} from '@/lib/lugo/missions';
import { GRUPPI, oraGioco } from '@/lib/lugo/maranza';
import { ANCORA_PRIMO_INCONTRO, type Npc } from '@/lib/lugo/npc';
import { runtime } from '@/lib/lugo/runtime';
import { suonaEvento, parla } from '@/lib/lugo/audio';
import { useLugo } from '@/lib/lugo/store';
import { QA } from '@/lib/lugo/qa';

// lo stato dello store, senza esportare l'interfaccia da store.ts
type LugoState = ReturnType<typeof useLugo.getState>;

type FaseScena =
  | 'attesa' // fermo al suo posto, pacchetto fra le mani
  | 'avvicina' // ti ha visto a piedi e ti viene incontro
  | 'dialogo1' // «Oh! Sei nuovo, vero?»
  | 'dialogo2' // «Mi fai un favore?»
  | 'ritorno' // torna al suo posto (dopo un rifiuto, un sì o un abbandono)
  | 'arrivo' // il pacco è arrivato al bar: battuta finale e sblocco
  | 'finita'; // missione chiusa: l'anziano va per la sua strada

// Gli scostamenti dentro il gruppo 'missione' dell'atlante delle frasi
// (lib/lugo/maranza.ts). L'ordine del gruppo è un contratto append-only:
// questi indici non possono slittare.
const FRASE = { scendi: 0, aggancio: 1, grazie: 2, dopo: 3, fragile: 4 } as const;

export function PrimoIncontro() {
  const mondo = useMondo();
  const fisica = useMemo(() => infraGioco(mondo).fisica, [mondo]);

  const fase = useRef<FaseScena>('attesa');
  const indice = useRef(-1);
  // dove l'anziano DEVE stare: la posizione vera di nascita (l'ancora può
  // essere stata spinta di qualche centimetro dalla fisica in creaNpcs)
  const ancora = useRef<{ x: number; z: number } | null>(null);
  const missione = useRef<Missione | null>(null);
  // il riposo prima di riprovarci dopo un «Magari dopo» o un abbandono
  const cooldownRiprova = useRef(0);
  // quanto sei rimasto in auto vicino a lui (per il fumetto «Scendi!»)
  const sostaInAuto = useRef(0);
  const cooldownFumetto = useRef(0);
  const tAvvicina = useRef(0);
  // secondi fra la tappa chiusa e l'avviso di sblocco: fa respirare la
  // scheda MISSIONE COMPLETATA prima di parlare sopra di lei
  const timerSblocco = useRef(0);
  const forzaRichiesta = useRef(false);

  // La missione si costruisce e si registra SUBITO, non al «Volentieri»:
  // così l'hook avviaMissione('m00') del collaudo la trova dal primo
  // fotogramma, e il nome vero del bar è pronto per i dialoghi.
  useEffect(() => {
    missione.current = creaMissionePrimoIncontro(
      mondo,
      ANCORA_PRIMO_INCONTRO.x,
      ANCORA_PRIMO_INCONTRO.z,
      (x, z, raggio) => fisica.cerchioLibero(x, z, raggio),
    );
  }, [mondo, fisica]);

  // hook di collaudo: lo stato della scena e l'apertura forzata del dialogo
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      primoIncontro: {
        stato: () => ({
          fase: fase.current,
          x: pontePrimoIncontro.x,
          z: pontePrimoIncontro.z,
          disponibile: pontePrimoIncontro.disponibile,
          paccoGiocatore: pontePrimoIncontro.paccoGiocatore,
          paccoAnziano: pontePrimoIncontro.paccoAnziano,
          rifiutato: pontePrimoIncontro.rifiutato,
          nomeBar: pontePrimoIncontro.nomeBar,
          cooldown: Math.max(0, cooldownRiprova.current),
        }),
        // porta l'anziano a due metri dal giocatore e apre il pannello: in
        // headless nessuno può camminare fino al parcheggio per ogni prova
        forzaDialogo: () => {
          forzaRichiesta.current = true;
          return true;
        },
      },
    };
  }, []);

  // mette una battuta del gruppo 'missione' sopra la testa dell'anziano:
  // i campi sono gli stessi dei fumetti dei maranza, e Maranza.tsx li
  // disegna senza sapere di chi è la testa
  const di = (n: Npc, scostamento: number, durata: number) => {
    n.frase = GRUPPI.missione[0] + scostamento;
    n.fraseDa = oraGioco();
    n.fraseFino = oraGioco() + durata;
  };

  const apriSaluto = (n: Npc, st: LugoState) => {
    fase.current = 'dialogo1';
    n.stato = 'chiede';
    n.fermoDa = 0;
    st.setDialogo({
      id: 'm00-saluto',
      chi: 'Un signore col pacchetto',
      testo: '“Oh! Sei nuovo, vero?”',
      opzioni: [
        { id: 'si', label: '“Sì. Si vede tanto?”' },
        { id: 'no', label: '“No, sono di qui.”' },
        // ogni dialogo di questa scena ha la sua uscita: Esc non chiude i
        // pannelli di dialogo, e nessuno deve restare incastrato qui
        { id: 'dopo', label: 'Magari dopo' },
      ],
    });
    suonaEvento('tappa');
    parla('anziano');
  };

  const apriFavore = (n: Npc, st: LugoState, daNo: boolean) => {
    fase.current = 'dialogo2';
    const bar = pontePrimoIncontro.nomeBar;
    st.setDialogo({
      id: 'm00-favore',
      chi: 'Un signore col pacchetto',
      testo: daNo
        ? `“Sì, e io ho vent'anni. Senti: questo pacchetto va al ${bar}, qui a due passi. Mi fai un favore?”`
        : `“Si vede, si vede. Ma sei capitato nel posto giusto. Senti: questo pacchetto va al ${bar}, qui a due passi. Mi fai un favore?”`,
      opzioni: [
        { id: 'volentieri', label: '“Volentieri.”' },
        { id: 'dopo', label: 'Magari dopo' },
      ],
    });
    parla('anziano');
  };

  const accetta = (n: Npc, st: LugoState) => {
    const m =
      missione.current ??
      creaMissionePrimoIncontro(mondo, ANCORA_PRIMO_INCONTRO.x, ANCORA_PRIMO_INCONTRO.z, (x, z, r) =>
        fisica.cerchioLibero(x, z, r),
      );
    missione.current = m;
    // reinserita adesso: quaranta consegne di bacheca potrebbero averla
    // sfrattata dal registro LRU fra la nascita e questo momento
    registraDinamica(m);
    // stesso pattern di accetta() in Hud.tsx: la macchina delle missioni
    // (Missioni.tsx) vede l'avvio «da fuori» e prende in mano tutto il resto
    st.setMissione(m.id, 'attiva', 0);
    st.setTempoResiduo(null);
    st.setIntro({
      etichetta: 'NUOVA MISSIONE',
      titolo: m.titolo,
      frase: m.frase,
      obiettivo: m.tappe[0].titolo,
    });
    suonaEvento('tappa');
    pontePrimoIncontro.paccoGiocatore = true;
    pontePrimoIncontro.paccoAnziano = false;
    di(n, FRASE.grazie, 3.2);
    fase.current = 'ritorno';
  };

  const rifiuta = (n: Npc) => {
    // il «no» non è mai un vicolo cieco: l'anziano resta lì e ci si può
    // riprovare; intanto la catena in Missioni.tsx apre il paracadute
    pontePrimoIncontro.rifiutato = true;
    cooldownRiprova.current = 12;
    di(n, FRASE.dopo, 3);
    fase.current = 'ritorno';
  };

  const rilascia = (n: Npc) => {
    // il compito è finito: spegnere `fisso` lo riconsegna al vagabondaggio
    // di stepNpcs e da qui in poi è un passante come tutti gli altri
    n.fisso = false;
    n.stato = 'fermo';
    n.timer = 2.5;
  };

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useLugo.getState();
    const rt = runtime.rt;
    const npcs = runtime.npcs;
    if (st.fase !== 'gioco' || !rt || !npcs) return;
    if (indice.current < 0) {
      indice.current = npcs.findIndex((q) => q.fisso);
      if (indice.current < 0) return;
      ancora.current = { x: npcs[indice.current].x, z: npcs[indice.current].z };
    }
    const n = npcs[indice.current];
    if (!n || !ancora.current) return;

    pontePrimoIncontro.x = n.x;
    pontePrimoIncontro.z = n.z;
    cooldownRiprova.current -= dt;
    cooldownFumetto.current -= dt;

    // il ponte si consuma UNA volta a inizio giro, qualunque sia la fase:
    // una scelta o una E lasciate appese scatterebbero in un momento a caso
    const scelta = pontePrimoIncontro.scelta;
    pontePrimoIncontro.scelta = null;
    const vuoleParlare = pontePrimoIncontro.parla;
    pontePrimoIncontro.parla = false;

    const m00Attiva = st.missioneId === 'm00' && st.statoMissione === 'attiva';
    const m00Completata = st.missioneId === 'm00' && st.statoMissione === 'completata';

    // La dinamica attiva non deve mai evaporare dal registro LRU: se il
    // giro delle bacheche l'ha spinta fuori, si reinserisce prima che il
    // frame delle missioni la cerchi (questo componente è montato PRIMA di
    // <Missioni /> apposta).
    if (m00Attiva && missione.current && !missioneById('m00')) {
      registraDinamica(missione.current);
    }

    // ── l'arrivo al bar: battuta finale, poi lo sblocco della città ──────
    if (fase.current !== 'arrivo' && fase.current !== 'finita' && m00Completata) {
      pontePrimoIncontro.paccoGiocatore = false;
      pontePrimoIncontro.disponibile = false;
      if (!st.dialogo && st.mode === 'piedi') {
        // il barista è un personaggio di FANTASIA: del locale vero si usano
        // solo nome e categoria, come da regola del registro delle attività
        st.setDialogo({
          id: 'm00-arrivo',
          chi: 'Il barista',
          testo: '“Ah, il pacchetto! Grazie. …Sei nuovo, vero?”',
          opzioni: [{ id: 'sivede', label: '“…Si vede tanto?”' }],
        });
      } else if (st.mode !== 'piedi') {
        // arrivato col mezzo: nessun pannello in guida (il gioco non ne
        // apre mai), la battuta si riduce a un saluto d'avviso
        st.setAvviso('“Ah, il pacchetto! Grazie.”');
      }
      timerSblocco.current = 4.8;
      fase.current = 'arrivo';
      return;
    }

    if (fase.current === 'arrivo') {
      if (scelta === 'sivede') st.setAvviso('“Si vede.”');
      // l'avviso di sblocco aspetta che la scheda MISSIONE COMPLETATA
      // (4,6 s) abbia detto la sua: due messaggi insieme non se ne legge
      // nessuno dei due
      timerSblocco.current -= dt;
      if (timerSblocco.current <= 0) {
        st.setAvviso('Lugo è tua: esplora pure.');
        rilascia(n);
        fase.current = 'finita';
      }
      return;
    }

    if (fase.current === 'finita') {
      pontePrimoIncontro.disponibile = false;
      return;
    }

    // ricaricamento a missione già chiusa: 'm00' sta in missioniFatte (il
    // salvataggio la tiene), quindi niente pacco e niente scena — l'anziano
    // torna subito un passante qualsiasi
    if (st.missioniFatte.includes('m00')) {
      pontePrimoIncontro.disponibile = false;
      pontePrimoIncontro.paccoAnziano = false;
      rilascia(n);
      fase.current = 'finita';
      return;
    }

    // la E del Player vale in attesa, in avvicinamento e durante il rientro
    pontePrimoIncontro.disponibile =
      !m00Attiva &&
      (fase.current === 'attesa' || fase.current === 'ritorno' || fase.current === 'avvicina');

    // ── l'apertura forzata del collaudo ──────────────────────────────────
    if (forzaRichiesta.current) {
      forzaRichiesta.current = false;
      if (!m00Attiva && fase.current !== 'dialogo1' && fase.current !== 'dialogo2') {
        // come provocaIncontro dei maranza: un punto libero a due metri,
        // davanti al giocatore, così il pannello descrive uno che c'è
        for (const giroAng of [0, 0.6, -0.6, 1.2, -1.2, 2, -2, Math.PI]) {
          const a = rt.persona.yaw + giroAng;
          const x = rt.persona.x + Math.cos(a) * 2.1;
          const z = rt.persona.z + Math.sin(a) * 2.1;
          if (!fisica.cerchioLibero(x, z, 0.3)) continue;
          n.x = x;
          n.z = z;
          break;
        }
        apriSaluto(n, st);
        return;
      }
    }

    if (fase.current === 'dialogo1' || fase.current === 'dialogo2') {
      // lo stato 'chiede' tiene la distanza giusta e la faccia verso di te
      n.stato = 'chiede';
      const d = Math.hypot(n.x - rt.persona.x, n.z - rt.persona.z);
      // sei salito su un mezzo o te ne sei andato: la scena si chiude da
      // sola invece di inseguirti a schermo — il difetto peggiore che un
      // pannello possa avere
      if (st.mode !== 'piedi' || d > 12) {
        if (st.dialogo?.id.startsWith('m00-')) st.setDialogo(null);
        di(n, FRASE.dopo, 2.6);
        cooldownRiprova.current = 10;
        fase.current = 'ritorno';
        return;
      }
      if (scelta === 'dopo') {
        rifiuta(n);
        return;
      }
      if (fase.current === 'dialogo1' && (scelta === 'si' || scelta === 'no')) {
        apriFavore(n, st, scelta === 'no');
        return;
      }
      if (fase.current === 'dialogo2' && scelta === 'volentieri') {
        accetta(n, st);
        return;
      }
      // il pannello è sparito senza una scelta (chiudiPannelli del
      // collaudo, o un altro sistema): non è un rifiuto, si riprova presto
      if (!st.dialogo) {
        cooldownRiprova.current = 4;
        fase.current = 'ritorno';
      }
      return;
    }

    if (fase.current === 'avvicina') {
      const d = Math.hypot(n.x - rt.persona.x, n.z - rt.persona.z);
      tAvvicina.current += dt;
      // ti ha perso (mezzo, distanza, muro, troppo tempo): si arrende con
      // eleganza e torna al suo posto — mai un anziano che insegue un'auto
      if (st.mode !== 'piedi' || d > 14 || tAvvicina.current > 10 || n.fermoDa > 2) {
        cooldownRiprova.current = 6;
        fase.current = 'ritorno';
        return;
      }
      n.stato = 'avvicina';
      n.targetX = rt.persona.x;
      n.targetZ = rt.persona.z;
      // con un pannello aperto (vetrina, bacheca, diario…) il dialogo non
      // si apre SOTTO: l'anziano aspetta lì accanto che tu abbia finito
      const pannello = st.dialogo || st.vetrina || st.bacheca || st.diario || st.guardaroba;
      if ((vuoleParlare || d < 2.1) && !pannello) apriSaluto(n, st);
      return;
    }

    if (fase.current === 'ritorno') {
      const dA = Math.hypot(n.x - ancora.current.x, n.z - ancora.current.z);
      if (dA < 0.9) {
        n.stato = 'fermo';
        n.timer = 5;
        fase.current = 'attesa';
        return;
      }
      // lontanissimo (è successo solo con forzaDialogo) o incastrato: si
      // riporta a casa di peso — è un hook di collaudo, non una scena
      if (dA > 40 || n.fermoDa > 2.5) {
        n.x = ancora.current.x;
        n.z = ancora.current.z;
        n.fermoDa = 0;
        n.stato = 'fermo';
        fase.current = 'attesa';
        return;
      }
      n.stato = 'avvicina';
      n.targetX = ancora.current.x;
      n.targetZ = ancora.current.z;
      // la E vale anche mentre rientra: chi lo insegue per parlargli non
      // deve aspettare che arrivi fino al suo sasso
      if (vuoleParlare && !m00Attiva && st.mode === 'piedi') apriSaluto(n, st);
      return;
    }

    // ── fase 'attesa': fermo al suo posto, con gli inneschi ──────────────
    const g = st.mode === 'auto' ? rt.auto : rt.persona;
    const dG = Math.hypot(n.x - g.x, n.z - g.z);

    // da vicino ti segue con lo sguardo: da fermo stepNpcs non ruota, e un
    // uomo che ti chiama dandoti la nuca non si capisce
    if (dG < 12) {
      let dy = Math.atan2(g.z - n.z, g.x - n.x) - n.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      n.yaw += dy * Math.min(1, dt * 4);
    }

    // resti in auto lì davanti: dopo un attimo ti chiama giù col fumetto.
    // Funziona anche in QA (non apre pannelli, quindi non sporca le prove).
    if (st.mode === 'auto' && dG < 10 && !m00Attiva) {
      sostaInAuto.current += dt;
      if (sostaInAuto.current > 2.5 && cooldownFumetto.current <= 0) {
        cooldownFumetto.current = 9;
        di(n, FRASE.scendi, 3.2);
      }
    } else {
      sostaInAuto.current = 0;
    }

    // col pacco in viaggio si raccomanda, ogni tanto, se ripassi di lì
    if (m00Attiva && dG < 8 && cooldownFumetto.current <= 0) {
      cooldownFumetto.current = 20;
      di(n, FRASE.fragile, 3);
    }

    if (vuoleParlare && !m00Attiva && st.mode === 'piedi' && dG < 3.6) {
      apriSaluto(n, st);
      return;
    }

    // L'aggancio automatico a piedi — MAI in QA, stessa disciplina di
    // attesaInizioPartita dei maranza: un pannello aperto a sorpresa
    // spaccherebbe le prove che stanno misurando tutt'altro. In collaudo la
    // scena si apre con la E o con forzaDialogo().
    if (
      !QA &&
      !m00Attiva &&
      st.mode === 'piedi' &&
      dG < 9 &&
      cooldownRiprova.current <= 0 &&
      !st.dialogo &&
      !st.vetrina &&
      !st.bacheca &&
      !st.diario &&
      !st.guardaroba &&
      !st.intro
    ) {
      tAvvicina.current = 0;
      n.stato = 'avvicina';
      n.fermoDa = 0;
      di(n, FRASE.aggancio, 3);
      fase.current = 'avvicina';
    }
  });

  return null;
}
