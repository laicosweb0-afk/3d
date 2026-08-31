'use client';

// Il popolo di Lugo, renderizzato a instanze: un InstancedMesh per parte
// del corpo, più bici e monopattino, e il conto resta una manciata di draw
// call per TUTTI i pedoni. Le matrici si ricompongono ogni frame dal ciclo
// di camminata; i colori si scrivono una volta sola. Le ruotine del
// monopattino sono le ruote della bici scalate per istanza: ciclisti e
// maranza non condividono mai lo stesso indice, quindi lo slot c'è già.
// In coda, la gazzella dei Carabinieri che pattuglia i viali.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco } from '@/lib/lugo/veicoli';
import {
  creaNpcs,
  stepNpcs,
  creaGazzella,
  stepGazzella,
  registroOstacoli,
  type Npc,
} from '@/lib/lugo/npc';
import { geometriaMonopattino, MONOPATTINO } from '@/lib/lugo/monopattino';
import { runtime, posGiocatore } from '@/lib/lugo/runtime';
import {
  stepIncontro,
  incontroInCorso,
  provocaIncontro,
  protestaOstacolo,
  statisticheMaranza,
  descrizioneMaranza,
  frasiDi,
  particelle,
  FUMO,
  FRASI_ATLANTE,
  oraGioco,
  type ContestoIncontro,
} from '@/lib/lugo/maranza';
import { useLugo } from '@/lib/lugo/store';
import { suonaEvento, parla } from '@/lib/lugo/audio';
import { QA } from '@/lib/lugo/qa';

const N_NPC = QA ? 30 : 130;

// Palette per tipo e variante. Gli incarnati sono otto e coprono tutta la
// scala, e si leggono da n.pelle e non più da n.variante: fra il colore
// della pelle e il vestito non c'è nessuna correlazione, e due maranza
// vicini non sono mai la stessa persona. Le tute sono sei e i cappellini
// cinque, così il gruppetto si distingue anche di spalle.
const PELLI = ['#F0CDA8', '#E8C09A', '#D9A67C', '#C89066', '#B87A4E', '#9A6038', '#7A4A2C', '#5C3720'];
const TUTE_MARANZA = ['#1A1A20', '#E8E8EC', '#22366E', '#3A3A42', '#7A2233', '#2E5E4A'];
const CAPPELLI_MARANZA = ['#16161C', '#E8E8EC', '#B03A2E', '#2E4E8E', '#D9A62E'];
const CAPELLI = ['#1A1512', '#2E2620', '#4A3E30', '#6B4A2F', '#141014'];
const GIACCHE_ANZIANO = ['#6B655B', '#4E5A66', '#7A6A58', '#55584E'];
const FELPE_STUDENTE = ['#C0503F', '#2F6F8A', '#D9A62E', '#4A7A48'];
const MAGLIE_CICLISTA = ['#E8E4DC', '#3E6FB0', '#D9603F', '#2E3540'];
const DIVISA = '#1A2238';
const ROSSO_BANDA = '#B02A26';

interface Parti {
  torso: THREE.InstancedMesh;
  testa: THREE.InstancedMesh;
  copricapo: THREE.InstancedMesh;
  braccioD: THREE.InstancedMesh;
  braccioS: THREE.InstancedMesh;
  gambaD: THREE.InstancedMesh;
  gambaS: THREE.InstancedMesh;
  marsupio: THREE.InstancedMesh;
  bastone: THREE.InstancedMesh;
  bandaD: THREE.InstancedMesh;
  bandaS: THREE.InstancedMesh;
  biciTelaio: THREE.InstancedMesh;
  biciRuotaA: THREE.InstancedMesh;
  biciRuotaP: THREE.InstancedMesh;
  monopattino: THREE.InstancedMesh;
}

// Il contesto dell'incontro è un literal riusato: allocarne uno nuovo a
// ogni fotogramma per dire le stesse otto cose sarebbe stato spazzatura
// generata sessanta volte al secondo.
const ctxIncontro: ContestoIncontro = {
  x: 0, z: 0, v: 0, aPiedi: true, pannelloAperto: false, wanted: 0, missioneATempo: false, dt: 0,
};

const _m = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _r = new THREE.Matrix4();
const _s = new THREE.Matrix4();
const _e = new THREE.Euler();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function setParte(
  mesh: THREE.InstancedMesh,
  i: number,
  base: THREE.Matrix4,
  px: number, py: number, pz: number,
  rx: number, rz: number,
  ox: number, oy: number, oz: number,
  sx = 1, sy = 1, sz = 1,
) {
  _m.copy(base);
  _t.makeTranslation(px, py, pz);
  _m.multiply(_t);
  if (rx !== 0 || rz !== 0) {
    _e.set(rx, 0, rz);
    _r.makeRotationFromEuler(_e);
    _m.multiply(_r);
  }
  _t.makeTranslation(ox, oy, oz);
  _m.multiply(_t);
  if (sx !== 1 || sy !== 1 || sz !== 1) {
    _s.makeScale(sx, sy, sz);
    _m.multiply(_s);
  }
  mesh.setMatrixAt(i, _m);
}

function coloreTorso(n: Npc): string {
  if (n.tipo === 'carabiniere') return DIVISA;
  if (n.tipo === 'maranza') return TUTE_MARANZA[n.variante % TUTE_MARANZA.length];
  if (n.tipo === 'studente') return FELPE_STUDENTE[n.variante % FELPE_STUDENTE.length];
  if (n.tipo === 'ciclista') return MAGLIE_CICLISTA[n.variante % MAGLIE_CICLISTA.length];
  return GIACCHE_ANZIANO[n.variante % GIACCHE_ANZIANO.length];
}

function coloreCopricapo(n: Npc): string {
  if (n.tipo === 'carabiniere') return DIVISA;
  // chi non porta il cappellino usa la STESSA istanza per i capelli: una
  // lastra più bassa e larga, colore capelli. Costa zero chiamate di
  // disegno in più, e nel gruppetto si capisce subito chi è chi.
  if (n.tipo === 'maranza') {
    return n.senzaCappello
      ? CAPELLI[n.cappello % CAPELLI.length]
      : CAPPELLI_MARANZA[n.cappello % CAPPELLI_MARANZA.length];
  }
  if (n.tipo === 'ciclista') return '#E8E4DC'; // il casco
  if (n.tipo === 'studente') return n.variante % 2 ? '#2E2620' : '#4A3E30';
  return '#3A342C';
}

export function Npcs() {
  const mondo = useMondo();
  const fisica = useMemo(() => infraGioco(mondo).fisica, [mondo]);
  const npcs = useMemo(() => creaNpcs(mondo, N_NPC), [mondo]);
  const gazzella = useMemo(() => creaGazzella(mondo), [mondo]);
  const parti = useRef<Partial<Parti>>({});
  const gruppoGazzella = useRef<THREE.Group>(null);
  const ultimaFrase = useRef(0);

  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    const rt = () => runtime.rt;
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      npcCount: () => npcs.length,
      // il ritratto dei maranza: dimostra che non sono quattro fotocopie
      maranza: () => statisticheMaranza(npcs),
      // Come il pannello li chiama, accanto a quello che hanno DAVVERO in
      // testa. Serve al collaudo per tenere insieme le due cose: la riga
      // del dialogo è l'unico appiglio che il giocatore ha per riconoscere
      // chi gli sta parlando, e prometteva cappellini a gente a testa nuda
      // perché la deduceva dal colore della tuta.
      descrizioni: () =>
        npcs
          .filter((n) => n.tipo === 'maranza')
          .map((n) => ({
            testo: descrizioneMaranza(n),
            cappello: !n.senzaCappello,
            monopattino: n.monopattino,
          })),
      incontro: () => incontroInCorso(),
      // Il collaudo non può aspettare che un maranza si decida: questo hook
      // forza l'aggancio (e accende la sigaretta sul bersaglio), poi da lì
      // in avanti è la macchina a stati vera a fare tutto. Con `true` si
      // pretende uno in monopattino, per la prova del pannello che nomina
      // il mezzo.
      provocaIncontro: (soloMonopattino?: boolean) => {
        const r = rt();
        if (!r) return -1;
        return provocaIncontro(
          npcs,
          r.persona.x,
          r.persona.z,
          r.persona.yaw,
          fisica,
          soloMonopattino === true,
        );
      },
      // i maranza su due ruote, con velocità e stato: la prova dell'andatura
      // ha bisogno di uno in marcia, non del primo che passa
      monopattini: () => {
        const lista: { i: number; x: number; z: number; v: number; passo: number; stato: string }[] = [];
        npcs.forEach((n, i) => {
          if (n.tipo === 'maranza' && n.monopattino) {
            lista.push({ i, x: n.x, z: n.z, v: n.v, passo: n.passo, stato: n.stato });
          }
        });
        return lista;
      },
      // il registro degli ostacoli (frenate da contatto e passi ceduti) e
      // l'elenco nudo dei pedoni: servono alle prove di auto e camminata
      ostacoli: () => ({ ...registroOstacoli }),
      pedoni: () =>
        npcs.map((n, i) => ({
          i,
          tipo: n.tipo,
          x: n.x,
          z: n.z,
          yaw: n.yaw,
          stato: n.stato,
          v: n.v,
          monopattino: n.monopattino,
        })),
      // il pannello del dialogo com'è davvero nello store: il collaudo
      // confronta il suo `chi` con quello che si vede in strada
      dialogo: () => useLugo.getState().dialogo,
      fumo: () => ({ vivi: particelle.filter((q) => q.viva).length, max: FUMO.max }),
      fumetti: () => {
        const ora = oraGioco();
        const testi = npcs
          .filter((n) => n.frase >= 0 && n.fraseFino > ora)
          .map((n) => FRASI_ATLANTE[n.frase]);
        return { vivi: testi.length, testi };
      },
      frasi: (g: 'aggancio' | 'insistenza' | 'si' | 'pugno' | 'fuga' | 'gruppo') => frasiDi(g),
      // un pedone qualunque, per provare che picchiare chi non ti ha fatto
      // niente costa reputazione
      npcVicino: () => {
        const r = rt();
        if (!r) return null;
        let scelto: Npc | null = null;
        let dMin = Infinity;
        npcs.forEach((n) => {
          if (n.tipo === 'maranza' || n.tipo === 'carabiniere') return;
          const d = Math.hypot(n.x - r.persona.x, n.z - r.persona.z);
          if (d < dMin) {
            dMin = d;
            scelto = n;
          }
        });
        const q = scelto as Npc | null;
        return q ? { tipo: q.tipo, x: q.x, z: q.z } : null;
      },
    };
  }, [npcs, fisica]);

  // colori per instanza: una volta sola
  useEffect(() => {
    const p = parti.current as Parti;
    if (!p.torso) return;
    const c = new THREE.Color();
    npcs.forEach((n, i) => {
      p.torso.setColorAt(i, c.set(coloreTorso(n)));
      p.testa.setColorAt(i, c.set(PELLI[n.pelle % PELLI.length]));
      p.copricapo.setColorAt(i, c.set(coloreCopricapo(n)));
      const braccia = n.tipo === 'anziano' ? coloreTorso(n) : n.tipo === 'carabiniere' ? DIVISA : coloreTorso(n);
      p.braccioD.setColorAt(i, c.set(braccia));
      p.braccioS.setColorAt(i, c.set(braccia));
      const gambe =
        n.tipo === 'maranza'
          ? coloreTorso(n)
          : n.tipo === 'carabiniere'
            ? DIVISA
            : n.tipo === 'ciclista'
              ? '#2A2E36'
              : n.tipo === 'studente'
                ? '#3A4356'
                : '#3E3B36';
      p.gambaD.setColorAt(i, c.set(gambe));
      p.gambaS.setColorAt(i, c.set(gambe));
      p.marsupio.setColorAt(i, c.set('#101014'));
      p.bastone.setColorAt(i, c.set('#6E5537'));
      p.bandaD.setColorAt(i, c.set(ROSSO_BANDA));
      p.bandaS.setColorAt(i, c.set(ROSSO_BANDA));
      const telaio = ['#2E3540', '#7A2E2E', '#2E5A46', '#B0AAA0'][n.variante % 4];
      p.biciTelaio.setColorAt(i, c.set(telaio));
      p.biciRuotaA.setColorAt(i, c.set('#22222A'));
      p.biciRuotaP.setColorAt(i, c.set('#22222A'));
      // due livree da sharing, CHIARE apposta: metà tute sono quasi nere e
      // un mezzo scuro sotto una tuta scura spariva del tutto — il telaio
      // si deve leggere anche in controluce, come quelli veri in strada
      p.monopattino.setColorAt(i, c.set(n.variante % 2 ? '#A8AEB8' : '#7A2E2E'));
    });
    // Il count della mesh del monopattino si ferma all'ULTIMO maranza su
    // due ruote: i maranza nascono nei primi posti dell'array, quindi le
    // istanze oltre quell'indice non si pagano, e con zero monopattini il
    // count resta 0 e three salta l'intera chiamata di disegno — lo stesso
    // patto dei due mesh di Maranza.tsx.
    let ultimoMono = -1;
    npcs.forEach((n, i) => {
      if (n.tipo === 'maranza' && n.monopattino) ultimoMono = i;
    });
    p.monopattino.count = ultimoMono + 1;
    for (const mesh of Object.values(p)) {
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }, [npcs]);

  useFrame((frame, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useLugo.getState();
    const rt = runtime.rt;
    const p = parti.current as Parti;
    if (!rt || !p.torso) return;

    if (st.fase === 'gioco') {
      const esito = stepNpcs(npcs, dt, mondo, fisica, rt, st.mode);
      if (esito.frase && frame.clock.elapsedTime - ultimaFrase.current > 9) {
        ultimaFrase.current = frame.clock.elapsedTime;
        st.setAvviso(esito.frase);
      }
      // chi ha ceduto il passo borbotta la sua nel fumetto: la battuta la
      // sceglie maranza.ts, che è il proprietario dell'atlante delle frasi
      if (esito.cede) protestaOstacolo(esito.cede);

      // ── l'incontro col maranza ────────────────────────────────────────
      // Gira DOPO stepNpcs, cioè quando le posizioni del fotogramma sono
      // già aggiornate, e qui e non altrove perché Npcs.tsx è già l'unico
      // posto che legge e scrive lo store dentro il ciclo dei pedoni:
      // l'incontro non aggiunge un secondo padrone dello stato.
      ctxIncontro.x = rt.persona.x;
      ctxIncontro.z = rt.persona.z;
      ctxIncontro.v = rt.vPersona;
      ctxIncontro.dt = dt;
      ctxIncontro.aPiedi = st.mode === 'piedi';
      ctxIncontro.pannelloAperto = Boolean(
        st.dialogo || st.vetrina || st.bacheca || st.diario || st.guardaroba,
      );
      ctxIncontro.wanted = st.wanted;
      ctxIncontro.missioneATempo = st.tempoResiduo !== null;
      const inc = stepIncontro(npcs, ctxIncontro, fisica, mondo);
      if (inc.apriDialogo) st.setDialogo(inc.apriDialogo);
      // si chiude SOLO il pannello dell'incontro: azzerare il dialogo a
      // scatola chiusa vorrebbe dire spegnere conversazioni di altri
      else if (inc.chiudiDialogo && st.dialogo?.id.startsWith('sigaretta')) st.setDialogo(null);
      if (inc.rep) st.addPunti(inc.rep);
      if (inc.avviso) st.setAvviso(inc.avviso);
      if (inc.suono) suonaEvento(inc.suono);
      if (inc.voce) parla('maranza');
    }
    // i pedoni vivi, a disposizione del Player per i dialoghi
    runtime.npcs = npcs;

    const base = new THREE.Matrix4();
    const baseTerra = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    npcs.forEach((n, i) => {
      const vNorm = Math.min(1, n.v / Math.max(0.4, n.passo));
      const inSella = n.tipo === 'ciclista';
      const inMono = n.tipo === 'maranza' && n.monopattino;
      // in monopattino NIENTE rimbalzo del passo: si sta fermi in piedi
      // sulla pedana, e un corpo che saltella a ruote ferme è la prima cosa
      // che smaschera un ciclo di camminata rimasto acceso per sbaglio
      const bob = inMono ? 0 : Math.abs(Math.sin(n.fase)) * 0.045 * vNorm;
      // bici e monopattino restano a terra, chi li guida sopra: due basi,
      // stessa rotazione
      baseTerra.makeTranslation(n.x, 0, n.z);
      rot.makeRotationY(-n.yaw);
      baseTerra.multiply(rot);
      const alzo = bob + (inSella ? 0.5 : inMono ? MONOPATTINO.altezzaPedana : 0);
      base.makeTranslation(n.x, alzo, n.z);
      base.multiply(rot);
      // il maranza ciondola: rollio lento del busto. Sul monopattino il
      // ciondolio resta (sono maranza anche lì sopra) ma cresce con la
      // marcia: è l'ondeggiamento di chi si dondola sul mezzo, non un tic
      // da fermo davanti al semaforo.
      const rollio =
        n.tipo === 'maranza'
          ? Math.sin(n.fase * 0.5) * (inMono ? 0.05 + 0.07 * vNorm : 0.1)
          : 0;
      const curva =
        n.tipo === 'anziano' ? 0.32 : n.tipo === 'maranza' ? -0.06 : inSella ? 0.42 : 0;
      const avantiTesta = Math.sin(curva) * 0.42;

      const oscG =
        Math.sin(inSella ? n.fase * 1.8 : n.fase) *
        (n.tipo === 'anziano' ? 0.3 : n.tipo === 'maranza' ? 0.6 : inSella ? 0.75 : 0.45) *
        vNorm;
      const oscB = Math.sin(n.fase + Math.PI) * (n.tipo === 'maranza' ? 0.5 : 0.35) * vNorm;
      // ── il braccio della sigaretta ────────────────────────────────────
      // Chi fuma non sventola la mano camminando: il braccio destro resta
      // quasi fermo, e si alza verso la faccia solo per la tirata (n.tiro
      // fra 0 e −durataTiro). La curva sale e ridiscende con un seno, così
      // la mano non torna giù di scatto.
      const fumatore = n.tipo === 'maranza' && n.fuma;
      let oscD = oscB;
      // in monopattino le braccia stanno protese al manubrio, con una
      // punta di dondolio in fase col rollio; la tirata della sigaretta
      // VINCE sul manubrio (l'override sta dopo apposta): si guida con una
      // mano sola, che è esattamente la scena che ci si aspetta da lui
      if (inMono) oscD = MONOPATTINO.braccioAlManubrio + Math.sin(n.fase * 0.5) * 0.04;
      if (fumatore) {
        const tiro = n.tiro > -FUMO.durataTiro && n.tiro < 0 ? Math.sin((-n.tiro / FUMO.durataTiro) * Math.PI) : 0;
        oscD = tiro > 0 ? 0.35 + (1.45 - 0.35) * tiro : 0.35 + oscB * 0.15;
      }
      const oscS = inMono
        ? MONOPATTINO.braccioAlManubrio + Math.sin(n.fase * 0.5 + 1.9) * 0.04
        : -oscB * (n.tipo === 'anziano' ? 0.4 : 1);

      setParte(p.torso, i, base, 0, 1.06, 0, curva, rollio, 0, 0, 0, 1, n.tipo === 'anziano' ? 0.92 : 1, 1);
      setParte(p.testa, i, base, avantiTesta, n.tipo === 'anziano' ? 1.34 : 1.42, 0, 0, 0, 0, 0, 0);
      // a testa nuda la stessa scatola diventa una capigliatura: più bassa,
      // più larga e calata di tre centimetri. Con la scala del cappellino
      // un maranza senza cappello sembrava pettinato a caschetto quadrato.
      const senzaCap = n.tipo === 'maranza' && n.senzaCappello;
      setParte(p.copricapo, i, base, avantiTesta + (n.tipo === 'maranza' && !senzaCap ? 0.03 : 0),
        (n.tipo === 'anziano' ? 1.34 : 1.42) + (senzaCap ? 0.11 : 0.14), 0, 0, 0, 0, 0, 0,
        senzaCap ? 1.05 : n.tipo === 'anziano' ? 1.25 : 1,
        senzaCap ? 0.55 : n.tipo === 'carabiniere' ? 1.4 : 1,
        senzaCap ? 1.05 : n.tipo === 'anziano' ? 1.25 : 1);
      setParte(p.braccioD, i, base, avantiTesta * 0.7, 1.3, 0.24, 0, oscD, 0, -0.2, 0);
      if (fumatore) {
        // La punta della sigaretta si misura QUI, dov'è appena stata
        // costruita la matrice del braccio, con la convenzione di assi del
        // resto del gioco (modello verso +X, rotation.y = −yaw). Chi
        // cambierà l'animazione del braccio deve aggiornare queste tre
        // righe: sono l'unico punto in cui la mano ha una posizione, e il
        // fumo la legge invece di ricalcolarla.
        const lx = avantiTesta * 0.7 + 0.44 * Math.sin(oscD);
        const ly = 1.3 - 0.44 * Math.cos(oscD) + alzo;
        const lz = 0.24;
        const cy = Math.cos(n.yaw);
        const sy = Math.sin(n.yaw);
        n.manoX = n.x + lx * cy - lz * sy;
        n.manoY = ly;
        n.manoZ = n.z + lx * sy + lz * cy;
      }
      setParte(p.braccioS, i, base, avantiTesta * 0.7, 1.3, -0.24, 0, oscS, 0, -0.2, 0);
      // sul monopattino le gambe NON pedalano e non camminano: quasi
      // dritte, una un filo avanti all'altra come si sta davvero in pedana
      setParte(p.gambaD, i, base, inMono ? 0.1 : 0, 0.85, 0.09, 0, inMono ? 0.16 : oscG, 0, -0.38, 0);
      setParte(p.gambaS, i, base, inMono ? -0.06 : 0, 0.85, -0.09, 0, inMono ? -0.05 : -oscG, 0, -0.38, 0);

      if (n.tipo === 'maranza') setParte(p.marsupio, i, base, 0.17, 1.0, 0, 0, -0.35, 0, 0, 0);
      else p.marsupio.setMatrixAt(i, ZERO);
      if (n.tipo === 'anziano') setParte(p.bastone, i, base, 0.15, 1.05, -0.26, 0.08, -oscB * 0.4 - 0.12, 0, -0.4, 0);
      else p.bastone.setMatrixAt(i, ZERO);
      if (inSella) {
        setParte(p.biciTelaio, i, baseTerra, 0, 0.62, 0, 0, 0.15, 0, 0, 0);
        setParte(p.biciRuotaA, i, baseTerra, 0.62, 0.34, 0, Math.PI / 2, 0, 0, 0, 0);
        setParte(p.biciRuotaP, i, baseTerra, -0.62, 0.34, 0, Math.PI / 2, 0, 0, 0, 0);
        p.monopattino.setMatrixAt(i, ZERO);
      } else if (inMono) {
        // le ruotine SONO le ruote della bici, rimpicciolite dalla scala
        // per istanza: il ciclista e il maranza non condividono mai lo
        // stesso indice, quindi lo slot in queste due mesh è già suo e il
        // monopattino intero costa UNA sola chiamata di disegno in più
        p.biciTelaio.setMatrixAt(i, ZERO);
        setParte(p.biciRuotaA, i, baseTerra, MONOPATTINO.ruotaAvanti, MONOPATTINO.quotaRuota, 0,
          Math.PI / 2, 0, 0, 0, 0, MONOPATTINO.scalaRuota, MONOPATTINO.spessoreRuota, MONOPATTINO.scalaRuota);
        setParte(p.biciRuotaP, i, baseTerra, MONOPATTINO.ruotaDietro, MONOPATTINO.quotaRuota, 0,
          Math.PI / 2, 0, 0, 0, 0, MONOPATTINO.scalaRuota, MONOPATTINO.spessoreRuota, MONOPATTINO.scalaRuota);
        setParte(p.monopattino, i, baseTerra, 0, 0, 0, 0, 0, 0, 0, 0);
      } else {
        p.biciTelaio.setMatrixAt(i, ZERO);
        p.biciRuotaA.setMatrixAt(i, ZERO);
        p.biciRuotaP.setMatrixAt(i, ZERO);
        p.monopattino.setMatrixAt(i, ZERO);
      }
      if (n.tipo === 'carabiniere') {
        setParte(p.bandaD, i, base, 0, 0.85, 0.152, 0, oscG, 0, -0.38, 0);
        setParte(p.bandaS, i, base, 0, 0.85, -0.152, 0, -oscG, 0, -0.38, 0);
      } else {
        p.bandaD.setMatrixAt(i, ZERO);
        p.bandaS.setMatrixAt(i, ZERO);
      }
    });
    for (const mesh of Object.values(p)) {
      mesh.instanceMatrix.needsUpdate = true;
    }

    // gazzella di pattuglia (o d'inseguimento, se sei ricercato)
    if (gazzella && gruppoGazzella.current) {
      if (st.fase === 'gioco') {
        // La gazzella insegue CHIUNQUE sia ricercato, non solo chi è in
        // auto: rubata una bici e scappati a piedi, prima i Carabinieri non
        // partivano mai e la stella restava accesa senza che succedesse
        // niente. Il fermo, col suo controllo di velocità, sta nel Player.
        const g = posGiocatore(st.mode);
        const bersaglio = runtime.caccia ? { x: g.x, z: g.z } : undefined;
        stepGazzella(gazzella, dt, bersaglio);
      }
      gruppoGazzella.current.position.set(gazzella.x, 0, gazzella.z);
      gruppoGazzella.current.rotation.y = -gazzella.yaw;
      runtime.gazzella = { x: gazzella.x, z: gazzella.z, yaw: gazzella.yaw };
    }
  });

  const ref = (nome: keyof Parti) => (m: THREE.InstancedMesh | null) => {
    if (m) parti.current[nome] = m;
  };

  return (
    <group name="npc">
      {/* una geometria unitaria per parte; forma e taglia vivono nelle matrici */}
      <instancedMesh ref={ref('torso')} args={[undefined, undefined, N_NPC]} frustumCulled={false} castShadow>
        <boxGeometry args={[0.3, 0.5, 0.42]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('testa')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.2, 0.22, 0.2]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('copricapo')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.24, 0.08, 0.24]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('braccioD')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.09, 0.44, 0.09]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('braccioS')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.09, 0.44, 0.09]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('gambaD')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.13, 0.78, 0.12]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('gambaS')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.13, 0.78, 0.12]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('marsupio')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.12, 0.11, 0.3]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('bastone')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <cylinderGeometry args={[0.02, 0.025, 0.85, 6]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('bandaD')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.02, 0.76, 0.03]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('biciTelaio')} args={[undefined, undefined, N_NPC]} frustumCulled={false} castShadow>
        <boxGeometry args={[1.25, 0.09, 0.07]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('biciRuotaA')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <cylinderGeometry args={[0.34, 0.34, 0.05, 10]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('biciRuotaP')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <cylinderGeometry args={[0.34, 0.34, 0.05, 10]} />
        <meshLambertMaterial />
      </instancedMesh>
      {/* pedana+piantone+manubrio fusi in UNA geometria (cache di modulo in
          monopattino.ts): un solo InstancedMesh per tutti i monopattini.
          Il count lo scrive l'effetto dei colori e si ferma all'ultimo
          maranza su due ruote (0 se non ce n'è): NON è un prop, perché un
          re-render qualsiasi lo riporterebbe al valore scritto qui e i
          monopattini sparirebbero senza un errore da nessuna parte. */}
      <instancedMesh
        ref={ref('monopattino')}
        args={[geometriaMonopattino(), undefined, N_NPC]}
        frustumCulled={false}
        castShadow
      >
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={ref('bandaS')} args={[undefined, undefined, N_NPC]} frustumCulled={false}>
        <boxGeometry args={[0.02, 0.76, 0.03]} />
        <meshLambertMaterial />
      </instancedMesh>

      {gazzella && (
        <group ref={gruppoGazzella}>
          <GazzellaMesh lampeggia />
        </group>
      )}
    </group>
  );
}

/** La gazzella dei Carabinieri: blu scurissimo, banda bianco-rossa, barra lampeggianti. */
export function GazzellaMesh({ lampeggia = false }: { lampeggia?: boolean }) {
  const materialeLampeggianti = useRef<THREE.MeshLambertMaterial>(null);
  useFrame((frame) => {
    if (!lampeggia || !materialeLampeggianti.current) return;
    const blink = Math.sin(frame.clock.elapsedTime * 6) > 0;
    materialeLampeggianti.current.emissiveIntensity = blink ? 2.2 : 0.4;
  });
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[4.2, 0.55, 1.7]} />
        <meshLambertMaterial color="#101A36" />
      </mesh>
      <mesh position={[-0.2, 1.15, 0]} castShadow>
        <boxGeometry args={[2.3, 0.6, 1.6]} />
        <meshLambertMaterial color="#101A36" />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[4.24, 0.13, 1.72]} />
        <meshLambertMaterial color="#E8E8EC" />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[4.22, 0.06, 1.71]} />
        <meshLambertMaterial color={ROSSO_BANDA} />
      </mesh>
      <mesh position={[-0.2, 1.5, 0]}>
        <boxGeometry args={[0.5, 0.12, 1.2]} />
        <meshLambertMaterial
          ref={materialeLampeggianti}
          color="#2244AA"
          emissive="#3366FF"
          emissiveIntensity={lampeggia ? 1 : 0.15}
        />
      </mesh>
      <mesh position={[2.12, 0.6, 0.5]}>
        <boxGeometry args={[0.06, 0.14, 0.26]} />
        <meshLambertMaterial color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[2.12, 0.6, -0.5]}>
        <boxGeometry args={[0.06, 0.14, 0.26]} />
        <meshLambertMaterial color="#FFF3C8" emissive="#FFE9A8" emissiveIntensity={1.4} />
      </mesh>
      {[[1.35, 0.85], [1.35, -0.85], [-1.35, 0.85], [-1.35, -0.85]].map(([x, z]) => (
        <mesh key={x + ':' + z} position={[x, 0.32, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.24, 10]} />
          <meshLambertMaterial color="#1E1C22" />
        </mesh>
      ))}
    </group>
  );
}
