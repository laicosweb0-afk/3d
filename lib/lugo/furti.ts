// Il furto di veicoli, in un file solo.
//
// Chi si può prendere qui, cosa succede quando lo si prende, quanto scalda
// i Carabinieri, e gli agganci del collaudo. Sta tutto insieme apposta:
// così la modifica al Player resta di poche righe leggibili, e i tre furti
// — la bici al muro, l'auto in sosta, l'auto ferma in mezzo alla strada —
// si ritoccano da un posto solo invece che da tre rami di un useFrame.
//
// Nota che vale per tutto il file, e non è una nota di stile: qui non c'è
// nessuna serratura, nessun contatto, nessun attrezzo e nessuna tecnica.
// Si preme E e si è dentro, come si sale in ascensore. È finzione da
// videogioco, come in GTA, e non deve poter essere letta come altro.

import type { MondoLugo } from './loadMap';
import type { RuntimeGioco } from './runtime';
import { runtime } from './runtime';
import type { Modalita } from './store';
import { useLugo } from './store';
import { TINTE_AUTO } from './palette';
import { CARROZZERIE } from './carrozzerie';
import {
  infraGioco,
  posaAuto,
  prendiPosteggio,
  TINTE_PARCO,
  TRAFFICO,
} from './veicoli';
import { biciPiuVicina, biciRubabili, prendiBici } from './bici';
import { imperfezioni } from './imperfezioni';
import { scendiEScappa } from './npc';

export type TipoFurto = 'bici' | 'posteggio' | 'traffico';

export interface BersaglioFurto {
  tipo: TipoFurto;
  /** Indice dentro la lista di riferimento del suo tipo. */
  i: number;
  /** Distanza dal giocatore (m). */
  d: number;
  hint: string;
}

export interface EsitoFurto {
  mode: Modalita;
  /** Quanto scalda i Carabinieri (le soglie sono quelle del Player). */
  calore: number;
  /** Secondi tolti al raffreddamento: più alto, più a lungo resti caldo. */
  ritardo: number;
  avviso: string;
  contatore: 'bici' | 'auto';
  /** Il vestito del veicolo preso, o null per la bici. */
  veicolo: { colore: string; carrozzeria: number } | null;
}

/**
 * Quanto bisogna essere vicini per poter premere E su un mezzo.
 *
 * Sono distanze CORTE apposta: bisogna essere addosso al veicolo. Una
 * vetrina si apre da nove metri, e se il furto avesse un raggio simile
 * davanti al bar del Pavaglione la E ti farebbe rubare la bici di
 * qualcuno mentre volevi ordinare un caffè. Il costo dell'errore non è
 * simmetrico: un pannello aperto per sbaglio si chiude con un'altra E, un
 * reato per sbaglio no.
 */
export const DIST_FURTO: Record<TipoFurto, number> = {
  bici: 2.2,
  posteggio: 3.0,
  traffico: 3.2,
};

/**
 * Quanto costa ognuno dei tre furti.
 *
 * `calore` entra nella stessa scala che il Player usa già per la guida
 * spericolata (2 → una stella, 4 → due, 7 → tre): una bici vale una
 * stella, un'auto in sosta due, un'auto tolta a chi ci stava dentro due
 * piene. `ritardo` toglie secondi al raffreddamento — il calore cala di 2
 * ogni 20 secondi, quindi la bici torna pulita in una ventina di secondi,
 * l'auto in sosta scende a una stella dopo ventotto ed è pulita dopo
 * quarantotto, e la rapina resta a due stelle per una trentina.
 */
export const CALORE_FURTO: Record<TipoFurto, { calore: number; ritardo: number; avviso: string }> = {
  bici: { calore: 2, ritardo: 0, avviso: 'Ti sei preso una bici. Occhio.' },
  posteggio: { calore: 4, ritardo: 8, avviso: 'Auto rubata! I Carabinieri sono avvisati.' },
  traffico: { calore: 5, ritardo: 14, avviso: 'Gliel’hai portata via davanti agli occhi!' },
};

/**
 * true se qualcuno in divisa ha visto. Vale un aggravio di due punti di
 * calore, la stessa regola del pugno. La caserma conta anche da lontano:
 * portarsi via un'auto sotto le sue finestre è un'altra cosa.
 */
export function vistoDaiCarabinieri(mondo: MondoLugo, x: number, z: number): boolean {
  if (runtime.npcs) {
    for (const n of runtime.npcs) {
      if (n.tipo !== 'carabiniere') continue;
      if (Math.hypot(n.x - x, n.z - z) < 25) return true;
    }
  }
  const g = runtime.gazzella;
  if (g && Math.hypot(g.x - x, g.z - z) < 60) return true;
  const caserma = mondo.poi.get('caserma');
  if (caserma && Math.hypot(caserma.xm - x, caserma.zm - z) < 90) return true;
  return false;
}

/**
 * Il veicolo che si può prendere da qui, o null. Valuta i tre candidati e
 * restituisce UNO SOLO, il più vicino: per chi gioca «salire su un mezzo
 * che non è mio» è una sola azione, e la scelta fra una bici e l'auto di
 * fianco non deve dipendere dall'ordine in cui il codice le guarda.
 */
export function bersaglioFurto(mondo: MondoLugo, x: number, z: number): BersaglioFurto | null {
  const infra = infraGioco(mondo);
  let scelto: BersaglioFurto | null = null;
  const tieni = (c: BersaglioFurto) => {
    if (!scelto || c.d < scelto.d) scelto = c;
  };

  const iBici = biciPiuVicina(mondo, infra.fisica, x, z, DIST_FURTO.bici);
  if (iBici >= 0) {
    const o = imperfezioni(mondo, infra.fisica)[iBici];
    tieni({
      tipo: 'bici',
      i: iBici,
      d: Math.hypot(o.x - x, o.z - z),
      hint: 'Premi E per prendere la bici',
    });
  }

  infra.parcheggi.forEach((p, i) => {
    if (!p.presente) return;
    const d = Math.hypot(p.x - x, p.z - z);
    if (d < DIST_FURTO.posteggio) {
      tieni({ tipo: 'posteggio', i, d, hint: 'Premi E per prendere l’auto' });
    }
  });

  infra.traffico.forEach((a, i) => {
    // solo quelle FERME: un'auto in corsa non si prende al volo, e nessuno
    // deve provare a mettersi davanti a una che viaggia per fermarla col
    // corpo — per fermarla ci si para davanti e si aspetta che freni
    if (a.rubata || a.vAttuale >= TRAFFICO.vFerma) return;
    const d = Math.hypot(a.x - x, a.z - z);
    if (d < DIST_FURTO.traffico) {
      tieni({ tipo: 'traffico', i, d, hint: 'Premi E per prendere l’auto ferma' });
    }
  });

  return scelto;
}

/**
 * Lascia in sosta l'auto che si stava guidando, se non è già lì sotto.
 *
 * È il pezzo che rende il furto d'auto una scelta e non un peccato senza
 * conseguenze: la tua vecchia auto non svanisce, diventa un'auto in sosta
 * come le altre, con il suo collider e la sua tinta, esattamente dove
 * l'avevi lasciata. Chi vuole può tornare a riprendersela.
 */
function lasciaLaTua(mondo: MondoLugo, rt: RuntimeGioco, verso: { x: number; z: number }): void {
  if (Math.hypot(rt.auto.x - verso.x, rt.auto.z - verso.z) <= 6) return;
  const st = useLugo.getState();
  const rubata = st.veicoloRubato;
  // il vestito di quella che stavi guidando: se era già rubata è il suo,
  // se no è la scelta che il giocatore ha fatto allo start
  const tinta = rubata
    ? Math.max(0, TINTE_PARCO.indexOf(rubata.colore as (typeof TINTE_PARCO)[number]))
    : indiceTintaParco(TINTE_AUTO[st.tintaAuto % TINTE_AUTO.length].colore);
  const carrozzeria = rubata ? rubata.carrozzeria : st.modelloAuto;
  posaAuto(infraGioco(mondo), rt.auto.x, rt.auto.z, rt.auto.yaw, tinta, carrozzeria % CARROZZERIE.length);
}

/**
 * La tinta del parco auto più vicina a un colore del giocatore. Le auto in
 * sosta hanno una tavolozza di otto colori e non un colore libero, quindi
 * l'auto del giocatore lasciata lì si "veste" con la più somigliante: senza
 * questa conversione una macchina gialla tornava grigia, e chi la ritrovava
 * non la riconosceva più.
 */
function indiceTintaParco(hex: string): number {
  const leggi = (s: string) => [
    parseInt(s.slice(1, 3), 16),
    parseInt(s.slice(3, 5), 16),
    parseInt(s.slice(5, 7), 16),
  ];
  const [r, g, b] = leggi(hex);
  let migliore = 0;
  let dMin = Infinity;
  TINTE_PARCO.forEach((c, i) => {
    const [r2, g2, b2] = leggi(c);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d < dMin) {
      dMin = d;
      migliore = i;
    }
  });
  return migliore;
}

/**
 * Compie il furto. Restituisce cosa deve cambiare fuori (modalità, calore,
 * avviso, contatore, vestito del veicolo) e lascia al Player il compito di
 * scriverlo nello store: qui dentro si tocca il MONDO, là fuori l'HUD.
 */
export function compiFurto(b: BersaglioFurto, mondo: MondoLugo, rt: RuntimeGioco): EsitoFurto | null {
  const infra = infraGioco(mondo);

  if (b.tipo === 'bici') {
    if (!prendiBici(mondo, infra.fisica, b.i)) return null;
    return { mode: 'bici', veicolo: null, contatore: 'bici', ...CALORE_FURTO.bici };
  }

  if (b.tipo === 'posteggio') {
    const p = infra.parcheggi[b.i];
    if (!p || !p.presente) return null;
    const colore = TINTE_PARCO[p.tinta % TINTE_PARCO.length];
    const carrozzeria = p.carrozzeria;
    const x = p.x;
    const z = p.z;
    const yaw = p.yaw;
    lasciaLaTua(mondo, rt, p);
    if (!prendiPosteggio(infra, b.i)) return null;
    rt.auto.x = x;
    rt.auto.z = z;
    rt.auto.yaw = yaw;
    rt.auto.vx = 0;
    rt.auto.vz = 0;
    rt.auto.sterzo = 0;
    return { mode: 'auto', veicolo: { colore, carrozzeria }, contatore: 'auto', ...CALORE_FURTO.posteggio };
  }

  const a = infra.traffico[b.i];
  if (!a || a.rubata) return null;
  lasciaLaTua(mondo, rt, a);
  if (runtime.npcs) scendiEScappa(runtime.npcs, a.x, a.z, a.yaw, rt.persona.x, rt.persona.z);
  a.rubata = true;
  a.rientro = TRAFFICO.rientro;
  a.attesa = 0;
  a.vAttuale = 0;
  rt.auto.x = a.x;
  rt.auto.z = a.z;
  rt.auto.yaw = a.yaw;
  rt.auto.vx = 0;
  rt.auto.vz = 0;
  rt.auto.sterzo = 0;
  return {
    mode: 'auto',
    veicolo: { colore: a.colore, carrozzeria: a.carrozzeria },
    contatore: 'auto',
    ...CALORE_FURTO.traffico,
  };
}

/**
 * Gli agganci del collaudo, da fondere in window.__LUGO__. Stanno qui e non
 * nel Player perché non chiudono su nessun ref locale: sono pure letture
 * del mondo, e tenerle vicino alla logica che descrivono vuol dire che chi
 * cambia il furto vede subito cosa il collaudo si aspetta.
 */
export function hookFurti(mondo: MondoLugo, rt: RuntimeGioco): Record<string, unknown> {
  const infra = () => infraGioco(mondo);
  return {
    bici: () => {
      const i = infra();
      const lista = imperfezioni(mondo, i.fisica);
      const tutte = lista.filter((o) => o.t === 'bici');
      return {
        totali: tutte.length,
        libere: biciRubabili(mondo, i.fisica).length,
        inSella: runtime.biciInSella,
        rastrelliere: lista.filter((o) => o.t === 'rastrelliera').length,
      };
    },
    // cerca su TUTTA la città, non solo attorno al giocatore: al collaudo
    // serve un bersaglio dove teletrasportarsi, non uno già a portata
    biciVicina: () => {
      const i = infra();
      const lista = imperfezioni(mondo, i.fisica);
      const qui = runtime.rt ?? rt;
      let scelta = -1;
      let dMin = Infinity;
      for (const k of biciRubabili(mondo, i.fisica)) {
        const d = Math.hypot(lista[k].x - qui.persona.x, lista[k].z - qui.persona.z);
        if (d < dMin) {
          dMin = d;
          scelta = k;
        }
      }
      return scelta < 0 ? null : { i: scelta, x: lista[scelta].x, z: lista[scelta].z, d: dMin };
    },
    parcheggi: () => {
      const p = infra().parcheggi;
      return { totali: p.length, presenti: p.filter((q) => q.presente).length };
    },
    // l'auto in sosta più vicina, con un punto già validato dove metterti a
    // fianco: senza, il collaudo si teletrasportava dentro l'auto stessa e
    // la fisica lo sparava dall'altra parte della strada
    postoAuto: () => {
      const i = infra();
      const qui = runtime.rt ?? rt;
      let scelto = -1;
      let dMin = Infinity;
      i.parcheggi.forEach((p, k) => {
        if (!p.presente) return;
        const d = Math.hypot(p.x - qui.persona.x, p.z - qui.persona.z);
        if (d < dMin) {
          dMin = d;
          scelto = k;
        }
      });
      if (scelto < 0) return null;
      const p = i.parcheggi[scelto];
      const c = Math.cos(p.yaw);
      const s = Math.sin(p.yaw);
      let lato: [number, number] = [p.x - s * 1.55, p.z + c * 1.55];
      for (const [ox, oz] of [
        [-s * 1.55, c * 1.55],
        [s * 1.55, -c * 1.55],
        [c * 2.4, s * 2.4],
        [-c * 2.4, -s * 2.4],
      ]) {
        if (i.fisica.cerchioLibero(p.x + ox, p.z + oz, 0.4)) {
          lato = [p.x + ox, p.z + oz];
          break;
        }
      }
      return { i: scelto, x: p.x, z: p.z, yaw: p.yaw, tinta: TINTE_PARCO[p.tinta % TINTE_PARCO.length], lato };
    },
    traffico: () =>
      infra().traffico.map((a) => ({
        x: a.x,
        z: a.z,
        yaw: a.yaw,
        v: a.vAttuale,
        attesa: a.attesa,
        rubata: a.rubata,
      })),
    // un punto sulla corsia, sette metri davanti a un'auto che sta
    // viaggiando: è lì che ci si para per farla frenare
    davantiATraffico: () => {
      const i = infra();
      for (let k = 0; k < i.traffico.length; k++) {
        const a = i.traffico[k];
        if (a.rubata) continue;
        const x = a.x + Math.cos(a.yaw) * 7;
        const z = a.z + Math.sin(a.yaw) * 7;
        // se il primo candidato è dentro un muro si passa a quello dopo
        if (!i.fisica.cerchioLibero(x, z, 0.45)) continue;
        // e si scarta anche il tratto con un'auto in SOSTA lì accanto: da
        // quel punto la E prenderebbe quella, che è più vicina, e la prova
        // fallirebbe raccontando una cosa che non c'entra
        if (i.parcheggi.some((p) => p.presente && Math.hypot(p.x - x, p.z - z) < 6)) continue;
        return { i: k, x, z };
      }
      return null;
    },
    libero: (x: number, z: number, r: number) => infra().fisica.cerchioLibero(x, z, r),
    furtoQui: () => {
      const qui = runtime.rt ?? rt;
      return bersaglioFurto(mondo, qui.persona.x, qui.persona.z);
    },
    furti: () => useLugo.getState().furti,
    /** Il colore dell'auto che si sta guidando ADESSO. */
    tintaViva: () => {
      const st = useLugo.getState();
      return st.veicoloRubato
        ? st.veicoloRubato.colore
        : TINTE_AUTO[st.tintaAuto % TINTE_AUTO.length].colore;
    },
  };
}
