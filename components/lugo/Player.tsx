'use client';

// L'orchestratore del giocatore: legge l'input, fa girare la fisica di auto
// e personaggio, gestisce salita/discesa (E) e il raddrizza (R), muove i
// modelli e la chase camera, ed espone gli hook di verifica su __LUGO__.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMondo } from '@/lib/lugo/loadMap';
import { infraGioco, respingiDaAuto } from '@/lib/lugo/veicoli';
import { stepAuto, puntoStradaVicino, viaVicina } from '@/lib/lugo/car';
import { stepPersona, PERSONA } from '@/lib/lugo/character';
import { BICI, lasciaBici, stepBici } from '@/lib/lugo/bici';
import { bersaglioFurto, compiFurto, hookFurti, vistoDaiCarabinieri } from '@/lib/lugo/furti';
import { fuocoSuComando, type StatoInput } from '@/lib/lugo/input';
import { conStick } from '@/lib/lugo/stick';
import { attivitaVicina, registroAttivita } from '@/lib/lugo/attivita';
import { bachecaVicina, offerteBacheca } from '@/lib/lugo/bacheche';
import { poiDaScoprire, puntiInteresse } from '@/lib/lugo/poi';
import { DISTINTIVI, distintiviRaggiunti } from '@/lib/lugo/distintivi';
import {
  avviaIncontroDaE,
  incontroInCorso,
  subisciPugno,
} from '@/lib/lugo/maranza';
import type { Npc } from '@/lib/lugo/npc';
import { runtime, type RuntimeGioco } from '@/lib/lugo/runtime';
import { updateAudio, suonaEvento, updateAmbiente, parla, campanello } from '@/lib/lugo/audio';
import { cieloOra, tempo } from '@/lib/lugo/tempo';
import { useLugo } from '@/lib/lugo/store';
import { Bici } from './Bici';
import { Car } from './Car';
import { Character, DURATA_PUGNO } from './Character';
import { QUOTA_CALPESTIO } from '@/lib/lugo/citygen';

export type { RuntimeGioco };

const RAGGIO_RUOTA = 0.3;
const DIST_SALITA = 2.6;

/**
 * Le stelle che ti sei guadagnato, dato il calore.
 *
 * La tabella era copiata tre volte in questo file — urto, pugno,
 * raffreddamento — e col furto sarebbe diventata quattro. Quattro copie
 * della stessa regola in un file solo sono il modo classico per ritrovarsi,
 * un giorno, con una soglia leggermente diversa da tutte le altre e nessuno
 * che sa quale sia quella giusta.
 */
function wantedDa(calore: number): number {
  return calore >= 7 ? 3 : calore >= 4 ? 2 : calore >= 2 ? 1 : 0;
}

function ChaseCamera({ rt }: { rt: RuntimeGioco }) {
  const mondo = useMondo();
  const fisica = useMemo(() => infraGioco(mondo).fisica, [mondo]);
  const desiderata = useMemo(() => new THREE.Vector3(), []);
  const mira = useMemo(() => new THREE.Vector3(), []);
  const avviata = useRef(false);
  const scossa = useRef(0);
  // quanto è arretrata la camera adesso: nei vicoli si accorcia da sola
  const distanzaViva = useRef(0);

  useFrame(({ camera, clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const override = runtime.cameraOverride;
    if (override) {
      if (performance.now() < override.fino) {
        camera.position.set(override.x, override.y, override.z);
        mira.set(override.tx, override.ty, override.tz);
        camera.lookAt(mira);
        return;
      }
      runtime.cameraOverride = null;
    }
    const mode = useLugo.getState().mode;
    const t = mode === 'auto' ? rt.auto : rt.persona;

    // ── l'orientamento della camera è STATO, non una misura della
    // posizione: se lo si ricavasse dal vettore camera→giocatore si
    // creerebbe un anello di retroazione (i comandi muovono il giocatore,
    // il giocatore ruota la camera, la camera ruota i comandi) e le
    // direzioni si invertirebbero. Qui invece:
    //   • in auto segue il muso della macchina;
    //   • a piedi resta ferma, e si riallinea DOLCEMENTE dietro le spalle
    //     solo mentre si cammina in avanti. Andando indietro o di lato non
    //     si muove: la direzione dei tasti resta quella che vedi.
    if (mode === 'auto') {
      let avantiAuto = rt.auto.yaw;
      if (rt.vAuto < -0.5) avantiAuto += Math.PI;
      rt.cameraYaw = avantiAuto;
    } else {
      // la camera si rimette dietro le spalle SOLO mentre cammini dritto
      // in avanti. Se lo facesse anche di lato ruoterebbe il riferimento
      // dei comandi mentre li stai usando (diagonali storte), e se lo
      // facesse andando indietro inseguirebbe chi le cammina incontro,
      // ribaltando la direzione: sono i due modi in cui il movimento si
      // invertiva. Andando dritti facing e camera coincidono già, quindi
      // qui non c'è nessuna deriva: solo una correzione che converge.
      if (runtime.assi.az > 0.35 && Math.abs(runtime.assi.ax) < 0.3) {
        let scarto = rt.persona.yaw - rt.cameraYaw;
        while (scarto > Math.PI) scarto -= Math.PI * 2;
        while (scarto < -Math.PI) scarto += Math.PI * 2;
        rt.cameraYaw += scarto * (1 - Math.exp(-1.8 * dt));
      }
    }
    // In sella si sterza col MANUBRIO, non con la camera: se il riferimento
    // restasse quello dei piedi (che si riallinea solo camminando dritti),
    // dopo due curve si finirebbe a comandare la bici con la direzione di
    // dieci secondi fa. Segue il muso, ma con una costante di tempo di 7 e
    // non agganciato di colpo, o ogni colpo di sterzo è una frustata.
    if (mode === 'bici') {
      let scarto = rt.persona.yaw - rt.cameraYaw;
      while (scarto > Math.PI) scarto -= Math.PI * 2;
      while (scarto < -Math.PI) scarto += Math.PI * 2;
      rt.cameraYaw += scarto * (1 - Math.exp(-7 * dt));
    }
    const dirX = Math.cos(rt.cameraYaw);
    const dirZ = Math.sin(rt.cameraYaw);

    const dist = mode === 'auto' ? 8.5 : mode === 'bici' ? 6.0 : 4.2;
    const alt = mode === 'auto' ? 3.4 : mode === 'bici' ? 2.7 : 2.1;

    // La camera non attraversa i muri. Nelle vie strette di Lugo, e appena
    // ci si accosta a una facciata, il punto dietro le spalle finiva DENTRO
    // un edificio e si vedeva l'interno delle case. Qui si prova ad
    // arretrare quanto si vorrebbe e, se là dietro c'è un muro, ci si
    // avvicina finché non si trova aria.
    let libera = dist;
    for (const f of [1, 0.82, 0.66, 0.5, 0.36, 0.24]) {
      const px = t.x - dirX * dist * f;
      const pz = t.z - dirZ * dist * f;
      if (fisica.cerchioLibero(px, pz, 0.45)) {
        libera = dist * f;
        break;
      }
      libera = dist * f;
    }
    // rientra subito (o si vede il muro), torna indietro con calma
    if (!avviata.current) distanzaViva.current = libera;
    else if (libera < distanzaViva.current) distanzaViva.current = libera;
    else distanzaViva.current += (libera - distanzaViva.current) * (1 - Math.exp(-2.2 * dt));

    const d = distanzaViva.current;
    // avvicinandosi si abbassa anche lo sguardo, o si finisce sui tetti
    const altViva = alt * (0.55 + 0.45 * (d / dist));
    desiderata.set(t.x - dirX * d, altViva, t.z - dirZ * d);

    if (!avviata.current) {
      camera.position.copy(desiderata);
      avviata.current = true;
    } else {
      const k = 1 - Math.exp(-(mode === 'auto' ? 3.4 : mode === 'bici' ? 4.5 : 5.5) * dt);
      camera.position.lerp(desiderata, k);
    }

    const avantiMira = mode === 'auto' ? 5 : mode === 'bici' ? 2.6 : 1.2;
    mira.set(t.x + dirX * avantiMira, 1.4, t.z + dirZ * avantiMira);
    camera.lookAt(mira);

    // FOV dinamico: in velocità il campo si allarga, piano piano
    const cam = camera as THREE.PerspectiveCamera;
    const fovTarget =
      mode === 'auto'
        ? 55 + Math.min(12, Math.abs(rt.vAuto) * 0.5)
        : mode === 'bici'
          ? 55 + Math.min(6, rt.vPersona * 0.4)
          : 55;
    if (Math.abs(cam.fov - fovTarget) > 0.05) {
      cam.fov += (fovTarget - cam.fov) * Math.min(1, dt * 2.5);
      cam.updateProjectionMatrix();
    }

    // scossone leggerissimo agli urti, che si spegne da solo
    if (rt.urto > 3) scossa.current = Math.min(0.4, rt.urto * 0.035);
    if (scossa.current > 0.004) {
      const t2 = clock.elapsedTime;
      camera.position.x += Math.sin(t2 * 53) * scossa.current;
      camera.position.y += Math.cos(t2 * 47) * scossa.current * 0.6;
      scossa.current *= Math.exp(-dt * 6);
    }
  });
  return null;
}

export function Player() {
  const mondo = useMondo();
  const infra = useMemo(() => infraGioco(mondo), [mondo]);
  const fisica = infra.fisica;

  const rt = useMemo<RuntimeGioco>(() => {
    const rocca = mondo.poi.get('rocca');
    const spawn = puntoStradaVicino(mondo, rocca ? rocca.xm : 0, rocca ? rocca.zm : 0);
    const creato: RuntimeGioco = {
      auto: { x: spawn.x, z: spawn.z, yaw: spawn.yaw, vx: 0, vz: 0, sterzo: 0 },
      persona: { x: spawn.x + 2, z: spawn.z + 2, yaw: 0, vx: 0, vz: 0, fase: 0 },
      vAuto: 0,
      vPersona: 0,
      faseRuote: 0,
      cameraYaw: spawn.yaw,
      urto: 0,
      sella: 0,
      piega: 0,
    };
    runtime.rt = creato;
    return creato;
  }, [mondo]);

  const gruppoAuto = useRef<THREE.Group>(null);
  const gruppoPersona = useRef<THREE.Group>(null);
  const gruppoBici = useRef<THREE.Group>(null);
  const [, getInput] = useKeyboardControls();
  const interagiscePrima = useRef(false);
  const resetPrima = useRef(false);
  const hudAcc = useRef(0);
  // Il ref di deduplica tiene la COPPIA (testo, allerta): confrontando la
  // sola stringa, un testo identico con l'allerta diversa non sarebbe mai
  // arrivato allo store, e il rosso sarebbe rimasto acceso (o spento) per
  // sempre sul suggerimento sbagliato.
  const hintPrima = useRef<string | null>(null);
  const allertaPrima = useRef(false);
  const viaAcc = useRef(0);
  const viaPrima = useRef<string | null>(null);
  // polizia: "calore" per guida spericolata, con decadimento
  const calore = useRef(0);
  const cooldownUrto = useRef(0);
  const decadimento = useRef(0);
  const cooldownDialogo = useRef(0);
  const colpiscePrima = useRef(false);
  // l'esplorazione si controlla due volte al secondo, non a ogni frame
  const scansione = useRef(0);
  // i metri percorsi in attesa di essere sommati, e l'ultimo punto visto
  const strada = useRef(0);
  const ultimoPunto = useRef<[number, number]>([0, 0]);
  const orologioIncarichi = useRef(5);
  // quante volte è già stata aperta una bacheca: fa cambiare le proposte
  const giroBacheca = useRef(0);
  const scopertaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownPugno = useRef(0);
  const ambienteAcc = useRef(0);
  const vocaAcc = useRef(0);

  // hook di verifica/debug
  useEffect(() => {
    const w = window as unknown as { __LUGO__?: Record<string, unknown> };
    const attivo = () => (useLugo.getState().mode === 'auto' ? rt.auto : rt.persona);
    const registroAttivitaHook = () =>
      registroAttivita(mondo).slice(0, 40).map((a) => ({ nome: a.nome, x: a.x, z: a.z, cat: a.categoria }));
    w.__LUGO__ = {
      ...(w.__LUGO__ ?? {}),
      // gli agganci del furto stanno nel loro modulo: sono pure letture del
      // mondo, e chi cambia il furto vede subito cosa il collaudo si aspetta
      ...hookFurti(mondo, rt),
      // questi due invece DEVONO stare qui: chiudono su ref locali del
      // Player, che non esistono da nessun'altra parte
      ricercato: () => ({
        wanted: useLugo.getState().wanted,
        calore: calore.current,
        decadimento: decadimento.current,
      }),
      // far passare venti secondi di raffreddamento senza aspettarli
      // davvero: il collaudo non può stare fermo mezzo minuto per volta
      invecchia: (s: number) => {
        decadimento.current += s;
      },
      pos: () => [attivo().x, attivo().z],
      // diagnosi del movimento: riferimento camera, direzione guardata e velocità
      direzione: () => ({
        camYaw: rt.cameraYaw,
        yaw: rt.persona.yaw,
        vx: rt.persona.vx,
        vz: rt.persona.vz,
        v: Math.hypot(rt.persona.vx, rt.persona.vz),
      }),
      attivita: () => registroAttivitaHook(),
      // guardia sulle regole commerciali: senza autorizzazione scritta
      // nessuna attività può risultare partner né mostrare promo o logo
      autorizzazioni: () => {
        const tutte = registroAttivita(mondo);
        return {
          partner: tutte.filter((a) => a.partner).length,
          promo: tutte.filter((a) => a.promo).length,
          logo: tutte.filter((a) => a.logo).length,
          // nessun livello di presenza può salire sopra NESSUNO senza
          // l'autorizzazione dell'esercente
          livelli: tutte.filter((a) => a.livelloPartner !== 'NESSUNO').length,
        };
      },
      mode: () => useLugo.getState().mode,
      wanted: () => useLugo.getState().wanted,
      // il pugno visto da fuori: `t` racconta che l'ANIMAZIONE è partita
      // davvero, non solo che l'effetto logico è stato applicato
      pugno: () => ({
        t: runtime.pugno.t,
        bersaglio: runtime.pugno.bersaglio,
        molesto: runtime.pugno.molesto,
        compagni: runtime.pugno.compagni,
      }),
      // `insieme` è vero per tutti i chiamanti di sempre e va lasciato
      // così: l'altro mezzo segue, o dopo un teletrasporto non si potrebbe
      // più salire e scendere. Si passa false solo quando la prova ha
      // bisogno che l'auto RESTI dov'era — per esempio per vedere se,
      // portandone via un'altra, quella vecchia rimane parcheggiata lì.
      teleport: (x: number, z: number, yaw?: number, insieme = true) => {
        const a = attivo();
        a.x = x;
        a.z = z;
        if (typeof yaw === 'number') a.yaw = yaw;
        if ('vx' in a) {
          a.vx = 0;
          a.vz = 0;
        }
        if (!insieme) return;
        const altro = useLugo.getState().mode === 'auto' ? rt.persona : rt.auto;
        altro.x = x + 3;
        altro.z = z + 3;
      },
      fotocamera: (x: number, y: number, z: number, tx: number, ty: number, tz: number, durataMs = 3000) => {
        runtime.cameraOverride = { x, y, z, tx, ty, tz, fino: performance.now() + durataMs };
      },
      muro: () => {
        const edificio = mondo.buildings.find(
          (b) => b.collider.tipo === 'obb' && b.collider.hw > 3 && b.collider.hw < 40,
        );
        if (!edificio) return false;
        const c = edificio.collider;
        const salvato = { ...rt.auto };
        const ax = c.cos;
        const az = c.sin;
        rt.auto.x = c.cx + ax * (c.hw + 6);
        rt.auto.z = c.cz + az * (c.hw + 6);
        rt.auto.yaw = Math.atan2(-az, -ax);
        rt.auto.vx = 0;
        rt.auto.vz = 0;
        const input: StatoInput = {
          ax: 0, az: 1,
          avanti: true, indietro: false, sinistra: false, destra: false,
          corri: false, freno: false, interagisci: false, reset: false, colpisci: false,
        };
        for (let i = 0; i < 150; i++) stepAuto(rt.auto, input, 1 / 60, fisica, mondo.bounds);
        const dx = rt.auto.x - c.cx;
        const dz = rt.auto.z - c.cz;
        const lx = dx * c.cos + dz * c.sin;
        const lz = -dx * c.sin + dz * c.cos;
        const dentro = Math.abs(lx) < c.hw && Math.abs(lz) < c.hd;
        Object.assign(rt.auto, salvato);
        return dentro;
      },
    };
  }, [rt, mondo, fisica]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const st = useLugo.getState();
    const fermo: StatoInput = {
      avanti: false, indietro: false, sinistra: false, destra: false,
      corri: false, freno: false, interagisci: false, reset: false, colpisci: false, ax: 0, az: 0,
    };
    // tastiera + joystick virtuale, fusi in un unico punto
    const input = st.fase === 'gioco' ? conStick(getInput() as unknown as StatoInput) : fermo;
    runtime.assi.ax = input.ax;
    runtime.assi.az = input.az;

    // Il riposo fra due chiacchiere scorre SEMPRE, in tutte e tre le
    // modalità. Stava dentro il ramo a piedi, cioè si fermava appena
    // salivi in macchina: chi parlava con un maranza, saliva in auto e
    // faceva mezza Lugo tornava giù con lo stesso conto alla rovescia di
    // quarantacinque secondi ancora intero, e la E non gli apriva più
    // nessuna conversazione senza che niente a schermo spiegasse perché.
    cooldownDialogo.current -= dt;

    if (st.mode === 'auto') {
      const esito = stepAuto(rt.auto, input, dt, fisica, mondo.bounds);
      rt.vAuto = esito.v;
      rt.urto = esito.urto;
      rt.faseRuote += (esito.v * dt) / RAGGIO_RUOTA;
      runtime.frenata = input.freno || (input.indietro && esito.v > 0.5);

      // i veicoli in movimento sono solidi: gazzella e traffico civile
      let urtoMobile = false;
      const mobili: { x: number; z: number }[] = [...infra.traffico];
      if (runtime.gazzella) mobili.push(runtime.gazzella);
      for (const g of mobili) {
        const dx = rt.auto.x - g.x;
        const dz = rt.auto.z - g.z;
        const d = Math.hypot(dx, dz);
        const minD = 2.6;
        if (d > 0.001 && d < minD) {
          const nx = dx / d;
          const nz = dz / d;
          rt.auto.x += nx * (minD - d);
          rt.auto.z += nz * (minD - d);
          const vn = rt.auto.vx * nx + rt.auto.vz * nz;
          if (vn < 0) {
            rt.auto.vx -= nx * vn * 1.4;
            rt.auto.vz -= nz * vn * 1.4;
            rt.auto.vx *= 0.8;
            rt.auto.vz *= 0.8;
            rt.urto = Math.max(rt.urto, -vn);
            if (-vn > 2) urtoMobile = true;
          }
        }
      }

      // ── polizia: la guida spericolata scalda gli animi ────────────────
      cooldownUrto.current -= dt;
      if ((urtoMobile || rt.urto > 7) && cooldownUrto.current <= 0) {
        cooldownUrto.current = 1.5;
        calore.current += 1;
        decadimento.current = 0;
        const wanted = wantedDa(calore.current);
        if (wanted !== st.wanted) {
          st.setWanted(wanted);
          if (wanted > st.wanted || (wanted === 1 && st.wanted === 0)) {
            st.setAvviso('I Carabinieri ti hanno notato!');
            suonaEvento('fallita');
          }
        }
      }
      if (input.reset && !resetPrima.current) {
        const p = puntoStradaVicino(mondo, rt.auto.x, rt.auto.z);
        rt.auto.x = p.x;
        rt.auto.z = p.z;
        rt.auto.yaw = p.yaw;
        rt.auto.vx = 0;
        rt.auto.vz = 0;
      }

      // Discesa: solo quasi da fermi, in un punto libero a lato.
      //
      // Il `!fuocoSuComando()` non è una copia per simmetria, è la toppa a
      // un buco vero: la stessa guardia stava sul ramo a piedi e su quello
      // in sella, ma NON qui, dove il commento più sotto la descriveva.
      // Invio è insieme «interagisci» nel gioco e «premi il bottone» nel
      // browser, e i tre bottoni in alto a destra — audio, diario,
      // guardaroba — restano a schermo anche in guida: bastava cliccare
      // l'altoparlante per silenziare la città e poi premere Invio per
      // ritrovarsi in mezzo alla carreggiata, a motore acceso, senza aver
      // mai chiesto di scendere.
      if (
        input.interagisci &&
        !interagiscePrima.current &&
        Math.abs(esito.v) < 3 &&
        !fuocoSuComando()
      ) {
        const latoX = -Math.sin(rt.auto.yaw);
        const latoZ = Math.cos(rt.auto.yaw);
        for (const lato of [1.7, -1.7, 0]) {
          const px = rt.auto.x + latoX * lato - Math.cos(rt.auto.yaw) * (lato === 0 ? 2.6 : 0);
          const pz = rt.auto.z + latoZ * lato - Math.sin(rt.auto.yaw) * (lato === 0 ? 2.6 : 0);
          if (fisica.cerchioLibero(px, pz, PERSONA.raggio + 0.1)) {
            rt.persona.x = px;
            rt.persona.z = pz;
            rt.persona.vx = 0;
            rt.persona.vz = 0;
            rt.persona.yaw = rt.auto.yaw;
            rt.auto.vx = 0;
            rt.auto.vz = 0;
            st.setMode('piedi');
            suonaEvento('salita');
            break;
          }
        }
      }
    } else if (st.mode === 'bici') {
      // ── in sella ───────────────────────────────────────────────────────
      const esito = stepBici(rt.persona, input, dt, fisica, mondo.bounds);
      rt.vPersona = Math.abs(esito.v);
      rt.urto = esito.urto;
      // la piega non è la piega voluta: ci arriva, ma smorzata, se no in
      // curva la bici scatterebbe da una parte all'altra a ogni fotogramma
      rt.piega += (esito.piega - rt.piega) * (1 - Math.exp(-9 * dt));
      runtime.frenata = input.freno || (input.indietro && esito.v > 0.5);

      // Le auto civili FERME sono solide anche per chi pedala: ci si
      // appoggia, non ci si passa dentro. Quelle in corsa no, e la soglia
      // di 1,5 m/s è la parte importante: sopra, la spinta sbatterebbe il
      // ciclista contro una facciata, perché questa non passa dalla fisica
      // dei muri e non sa che dietro c'è un edificio.
      for (const a of infra.traffico) {
        if (a.rubata || a.vAttuale > 1.5) continue;
        const spinta = respingiDaAuto(rt.persona.x, rt.persona.z, BICI.raggio, a);
        if (spinta) {
          rt.persona.x = spinta[0];
          rt.persona.z = spinta[1];
        }
      }

      // R raddrizza anche in bici: capita di finire in un cortile
      if (input.reset && !resetPrima.current) {
        const p = puntoStradaVicino(mondo, rt.persona.x, rt.persona.z);
        rt.persona.x = p.x;
        rt.persona.z = p.z;
        rt.persona.yaw = p.yaw;
        rt.persona.vx = 0;
        rt.persona.vz = 0;
      }

      // E scende, e solo quasi da fermi come dall'auto. La bici resta
      // esattamente dove l'hai lasciata: è la stessa bici, e chi ripassa
      // di lì la ritrova al muro.
      if (
        input.interagisci &&
        !interagiscePrima.current &&
        rt.vPersona < 1.5 &&
        !fuocoSuComando()
      ) {
        lasciaBici(mondo, fisica, rt.persona.x, rt.persona.z, rt.persona.yaw);
        st.setMode('piedi');
        suonaEvento('salita');
      }
    } else {
      rt.vPersona = stepPersona(rt.persona, input, dt, fisica, rt.cameraYaw);
      runtime.frenata = false;

      // salita: vicino all'auto. Altrimenti, E parla col maranza vicino.
      const dAuto = Math.hypot(rt.persona.x - rt.auto.x, rt.persona.z - rt.auto.z);
      // Invio è insieme «interagisci» nel gioco e «premi il bottone» nel
      // browser: con il fuoco su un tasto dello schermo faceva tutte e due
      // le cose, e si scendeva dall'auto accettando un lavoro.
      if (input.interagisci && !interagiscePrima.current && !fuocoSuComando()) {
        // Con un pannello aperto la E era muta: si restava davanti alla
        // vetrina o alla bacheca senza poterle chiudere da tastiera. Ora la
        // stessa E che le apre le richiude.
        const daChiudere = Boolean(st.vetrina || st.bacheca);
        if (daChiudere) {
          st.setVetrina(null);
          st.setBacheca(null);
        }
        const occupato = daChiudere || st.dialogo;
        const bottega = occupato ? null : attivitaVicina(mondo, rt.persona.x, rt.persona.z, 9);
        const banco = occupato ? null : bachecaVicina(mondo, rt.persona.x, rt.persona.z);
        // Sotto il Pavaglione ci sono sia i bar sia la bacheca: vince chi è
        // più vicino. Con la sola precedenza fissa, davanti alla vetrina di
        // un bar del centro si apriva l'elenco dei lavori.
        const dBottega = bottega ? Math.hypot(bottega.x - rt.persona.x, bottega.z - rt.persona.z) : Infinity;
        const dBanco = banco ? Math.hypot(banco.x - rt.persona.x, banco.z - rt.persona.z) : Infinity;
        // Il veicolo che si può prendere da qui: uno solo, il più vicino
        // fra bici, auto in sosta e auto ferma. Dentro il gradino decide
        // la distanza — per chi gioca «salire su un mezzo che non è mio» è
        // una sola azione — ma il gradino intero sta SOTTO l'auto propria
        // e SOPRA i pannelli solo se è strettamente più vicino di tutti e
        // due (vedi sotto).
        const bers = occupato ? null : bersaglioFurto(mondo, rt.persona.x, rt.persona.z);
        if (daChiudere) {
          // la E ha già fatto il suo: ha chiuso il pannello
        } else if (dAuto < DIST_SALITA) {
          // La tua auto è un gradino a sé, sopra i furti e non in gara con
          // loro per distanza: la parcheggi quasi sempre accanto ad altre
          // auto in sosta, e se decidesse la distanza ti ritroveresti a
          // rubare quella del vicino mentre volevi risalire sulla tua.
          // NON si azzera veicoloRubato: rt.auto è l'auto che stai
          // usando, qualunque sia, e risalirci sopra dopo esserne sceso
          // non la ridipinge. Il vestito torna al tuo solo quando ne
          // prendi un'altra, o quando comincia una partita nuova.
          st.setMode('auto');
          suonaEvento('salita');
        } else if (bers && bers.d < dBanco && bers.d < dBottega) {
          // In un pareggio vince sempre il pannello, mai il furto: una bici
          // appoggiata alla porta di un bar non deve trasformare l'entrata
          // nel bar in un reato. È anche il motivo per cui i raggi del
          // furto sono corti (2,2–3,2 m) mentre una vetrina si apre da 9.
          const e = compiFurto(bers, mondo, rt);
          if (e) {
            st.setMode(e.mode);
            st.setVeicoloRubato(e.veicolo);
            st.contaFurto(e.contatore);
            calore.current +=
              e.calore + (vistoDaiCarabinieri(mondo, rt.persona.x, rt.persona.z) ? 2 : 0);
            // il ritardo è calore che non si raffredda: si parte da un
            // decadimento NEGATIVO, cioè da secondi che devono ancora
            // passare prima che il conto alla rovescia cominci
            decadimento.current = -e.ritardo;
            const w = wantedDa(calore.current);
            if (w !== st.wanted) st.setWanted(w);
            st.setAvviso(e.avviso);
            suonaEvento('salita');
          }
        } else if (banco && dBanco < dBottega) {
          const giro = giroBacheca.current++;
          st.setBacheca({
            id: banco.bacheca.id,
            nome: banco.bacheca.nome,
            sottotitolo: banco.bacheca.sottotitolo,
            offerte: offerteBacheca(mondo, banco.bacheca.id, st.livello, giro).map((m) => ({
              id: m.id,
              titolo: m.titolo,
              descrizione: m.descrizione,
              obiettivo: m.tappe[0].titolo,
              categoria: m.categoria ?? m.tipo,
              difficolta: m.difficolta ?? 'facile',
              ...(m.tempoLimite ? { tempoLimite: m.tempoLimite } : {}),
              rep: m.ricompensa,
              denaro: m.denaro,
            })),
          });
          suonaEvento('tappa');
        } else if (bottega) {
          st.setVetrina({
            id: bottega.id,
            nome: bottega.nome,
            categoria: bottega.categoria,
            descrizione: bottega.descrizione,
            partner: bottega.partner,
            livello: bottega.livelloPartner,
            promo: bottega.promo,
            articoli: bottega.articoli,
          });
          suonaEvento('tappa');
        } else if (!st.dialogo && cooldownDialogo.current <= 0 && runtime.npcs) {
          // ULTIMO gradino della precedenza della E, e ci sta apposta: è
          // l'unica interazione che sa avviarsi da sola, quindi qui la E è
          // una cortesia e non il canale principale.
          const vicini = runtime.npcs;
          for (let i = 0; i < vicini.length; i++) {
            const n = vicini[i];
            if (n.tipo !== 'maranza') continue;
            if (Math.hypot(n.x - rt.persona.x, n.z - rt.persona.z) < 3.4) {
              cooldownDialogo.current = 45;
              // Un solo ingresso per la scena, anche quando sei tu a
              // parlare per primo: così si vede il fumetto sopra la testa,
              // l'insistenza funziona uguale e non esistono due
              // conversazioni diverse per la stessa cosa.
              const inc = avviaIncontroDaE(vicini, i);
              if (inc.apriDialogo) st.setDialogo(inc.apriDialogo);
              if (inc.suono) suonaEvento(inc.suono);
              if (inc.voce) parla('maranza');
              break;
            }
          }
        }
      }
    }
    // ── beccato dai Carabinieri, in tutte e tre le modalità ────────────
    // Prima questo controllo stava dentro il ramo `auto`: rubata una bici e
    // scappati a piedi, la gazzella ti stava addosso all'infinito senza che
    // succedesse mai niente, e l'inseguimento non finiva più. A piedi si
    // corre a 5,2 m/s contro una soglia di 2,5: scappare funziona ancora,
    // fermarsi no.
    if (st.wanted > 0 && runtime.gazzella) {
      const qui = st.mode === 'auto' ? rt.auto : rt.persona;
      const vQui = st.mode === 'auto' ? Math.abs(rt.vAuto) : rt.vPersona;
      const dG = Math.hypot(qui.x - runtime.gazzella.x, qui.z - runtime.gazzella.z);
      if (dG < 4.2 && vQui < 2.5) {
        const multa = Math.min(st.denaro, 30 * st.wanted);
        st.addDenaro(-multa);
        calore.current = 0;
        st.setWanted(0);
        runtime.caccia = false;
        st.setAvviso(
          multa > 0
            ? `Fermato dai Carabinieri · Multa €${multa}`
            : 'Fermato dai Carabinieri · Solo un avvertimento',
        );
        suonaEvento('fallita');
      }
    }

    // ── il pugno: si arma col tasto, va a segno a metà animazione ──────
    // Prima il colpo andava a segno nell'istante del tasto, mentre il
    // braccio doveva ancora muoversi: si vedeva il maranza volare via e
    // solo dopo il pugno partire. Adesso F arma la finestra (0,42 s) e
    // l'impatto cade al 55% dell'animazione, cioè quando il braccio è
    // davvero disteso. La ricerca del bersaglio è la stessa di prima.
    cooldownPugno.current -= dt;
    const pugno = runtime.pugno;
    const inIncontro = incontroInCorso().attivo;
    if (
      st.mode === 'piedi' &&
      input.colpisci &&
      !colpiscePrima.current &&
      cooldownPugno.current <= 0 &&
      pugno.t <= 0 &&
      !st.vetrina &&
      !st.bacheca &&
      // col maranza che ti sta addosso il pannello è aperto ed è proprio
      // il momento in cui vuoi tirare il pugno: solo lì la F passa lo stesso
      (!st.dialogo || inIncontro) &&
      runtime.npcs
    ) {
      cooldownPugno.current = 0.7;
      pugno.t = DURATA_PUGNO;
      pugno.colpito = false;
      pugno.bersaglio = null;
      pugno.molesto = false;
      pugno.compagni = 0;
      suonaEvento('fallita');
    }
    // Un pugno cominciato a piedi non deve poter arrivare a segno da un
    // sellino o da dietro un volante. La finestra dura 0,42 s e l'impatto
    // cade a metà: fra la F e il colpo c'è tutto il tempo di premere E e
    // saltare su una bici, e il pedone si vedeva volare via colpito da un
    // ciclista con le mani sul manubrio. Salendo su un mezzo il colpo si
    // ANNULLA — braccio compreso, perché Character mescola la posa del
    // pugno solo finché `t` è vivo — invece di restare appeso.
    if (pugno.t > 0 && st.mode !== 'piedi') {
      pugno.t = 0;
      pugno.colpito = true;
    }
    if (pugno.t > 0) {
      pugno.t = Math.max(0, pugno.t - dt);
      if (!pugno.colpito && pugno.t <= DURATA_PUGNO * 0.45 && runtime.npcs) {
        pugno.colpito = true;
        const fx = Math.cos(rt.persona.yaw);
        const fz = Math.sin(rt.persona.yaw);
        let colpito: Npc | null = null;
        let dMin = 2.4;
        for (const n of runtime.npcs) {
          const dx = n.x - rt.persona.x;
          const dz = n.z - rt.persona.z;
          const d = Math.hypot(dx, dz);
          if (d > dMin || d < 0.01) continue;
          // deve stare davanti, non alle spalle
          if ((dx / d) * fx + (dz / d) * fz < 0.35) continue;
          dMin = d;
          colpito = n;
        }
        if (colpito) {
          const bersaglio: Npc = colpito;
          const dx = bersaglio.x - rt.persona.x;
          const dz = bersaglio.z - rt.persona.z;
          const d = Math.hypot(dx, dz) || 1;
          const reazione = subisciPugno(bersaglio, runtime.npcs, dx / d, dz / d);
          pugno.bersaglio = bersaglio.tipo;
          pugno.molesto = reazione.eraMolesto;
          pugno.compagni = reazione.compagni;
          st.setAvviso('“' + reazione.frase + '”');
          // Chi ti stava addosso a chiedere la sigaretta è un conto; un
          // passante che non ti ha fatto niente è un altro, e costa
          // reputazione. Prima il pugno era gratis su chiunque.
          if (!reazione.eraMolesto) {
            st.addPunti(-5);
            st.setAvviso('Non era il caso · −5 REP');
          }
          // i Carabinieri non gradiscono: se uno vede, sono guai
          let visto = bersaglio.tipo === 'carabiniere';
          if (!visto) {
            for (const n of runtime.npcs) {
              if (n.tipo !== 'carabiniere') continue;
              if (Math.hypot(n.x - rt.persona.x, n.z - rt.persona.z) < 22) {
                visto = true;
                break;
              }
            }
          }
          if (visto) {
            calore.current += 2;
            decadimento.current = 0;
            const w = Math.max(1, wantedDa(calore.current));
            if (w !== st.wanted) {
              st.setWanted(w);
              st.setAvviso('Ti hanno visto: arrivano i Carabinieri!');
            }
          }
        }
      }
    }
    colpiscePrima.current = input.colpisci;

    interagiscePrima.current = input.interagisci;
    resetPrima.current = input.reset;

    // il calore si raffredda comunque, anche mentre si scappa a piedi
    decadimento.current += dt;
    if (decadimento.current > 20 && calore.current > 0) {
      decadimento.current = 0;
      calore.current = Math.max(0, calore.current - 2);
      const wanted = wantedDa(calore.current);
      if (wanted !== st.wanted) {
        st.setWanted(wanted);
        if (wanted === 0) st.setAvviso('I Carabinieri ti hanno perso di vista.');
      }
    }
    runtime.caccia = useLugo.getState().wanted > 0;

    // I metri di Lugo che ti sei fatto: si sommano una volta al secondo,
    // così l'incarico dei chilometri non costa un aggiornamento a frame.
    // A ogni giro si controlla anche se è cambiato il giorno: a mezzanotte
    // gli incarichi si rinnovano da soli, anche a partita aperta.
    const quiOra = st.mode === 'auto' ? rt.auto : rt.persona;
    const passo = Math.hypot(quiOra.x - ultimoPunto.current[0], quiOra.z - ultimoPunto.current[1]);
    // un salto grosso non è strada percorsa: è il cambio auto/piedi, un
    // teletrasporto o il primo fotogramma. In un frame non si fanno 15 metri.
    if (passo < 15) strada.current += passo;
    ultimoPunto.current[0] = quiOra.x;
    ultimoPunto.current[1] = quiOra.z;
    orologioIncarichi.current -= dt;
    if (orologioIncarichi.current <= 0) {
      // ogni cinque secondi: i metri finiscono nei totali (e da lì nel
      // salvataggio) senza scrivere su disco una volta al secondo
      orologioIncarichi.current = 5;
      if (st.fase === 'gioco' && strada.current >= 1) {
        st.contaTotale('metri', Math.round(strada.current));
        strada.current = 0;
      }
      st.allineaIncarichi();
    }

    // l'esplorazione: si scopre camminando, mai passandoci davanti in auto
    scansione.current -= dt;
    if (st.fase === 'gioco' && st.mode === 'piedi' && !st.scoperta && scansione.current <= 0) {
      scansione.current = 0.35;
      const trovato = poiDaScoprire(mondo, rt.persona.x, rt.persona.z, st.poiVisitati);
      if (trovato && st.scopriPoi(trovato.id)) {
        const dopo = useLugo.getState();
        const elenco = puntiInteresse(mondo);
        const tipoDi = new Map(elenco.map((p) => [p.id, p.tipo]));
        const stato = {
          poiVisitati: dopo.poiVisitati,
          monumenti: dopo.poiVisitati.filter((id) => tipoDi.get(id) === 'monumento').length,
          botteghe: dopo.poiVisitati.filter((id) => tipoDi.get(id) === 'attivita').length,
          missioniFatte: dopo.missioniFatte,
          punteggio: dopo.punteggio,
          consegneFatte: dopo.consegneFatte,
        };
        const raggiunti = distintiviRaggiunti(stato);
        const nuovo = raggiunti.find((id) => !dopo.distintivi.includes(id));
        if (raggiunti.length !== dopo.distintivi.length) dopo.setDistintivi(raggiunti);
        st.setScoperta({
          nome: trovato.nome,
          cosa: trovato.cosa,
          tipo: trovato.tipo,
          distintivo: nuovo ? DISTINTIVI.find((d) => d.id === nuovo)?.nome : undefined,
        });
        st.addPunti(nuovo ? 25 : 5);
        suonaEvento('tappa');
        if (scopertaTimer.current) clearTimeout(scopertaTimer.current);
        // i monumenti meritano una scheda lunga, le botteghe un lampo:
        // camminando in centro se ne incontra una ogni pochi passi
        const durata = nuovo ? 5200 : trovato.tipo === 'attivita' ? 1900 : 4200;
        scopertaTimer.current = setTimeout(() => useLugo.getState().setScoperta(null), durata);
      }
    }

    // suggerimento contestuale sul tasto E
    let hint: string | null = null;
    // il rosso: il giocatore deve sapere PRIMA di premere che quella E gli
    // costa una stella. Dopo, la stella è già accesa
    let allerta = false;
    if (st.fase === 'gioco') {
      if (st.mode === 'auto' && Math.abs(rt.vAuto) < 0.5) hint = 'Premi E per scendere';
      else if (st.mode === 'bici') {
        if (rt.vPersona < 1.5) hint = 'Premi E per scendere';
      } else if (st.mode === 'piedi') {
        const d = Math.hypot(rt.persona.x - rt.auto.x, rt.persona.z - rt.auto.z);
        if (d < DIST_SALITA) hint = 'Premi E per salire in auto';
        else if (!st.vetrina && !st.dialogo && !st.bacheca) {
          const bottega = attivitaVicina(mondo, rt.persona.x, rt.persona.z, 9);
          const banco = bachecaVicina(mondo, rt.persona.x, rt.persona.z);
          const dB = bottega ? Math.hypot(bottega.x - rt.persona.x, bottega.z - rt.persona.z) : Infinity;
          const dK = banco ? Math.hypot(banco.x - rt.persona.x, banco.z - rt.persona.z) : Infinity;
          // la stessa precedenza della E, letta a schermo: se qui e là
          // raccontassero due regole diverse, il suggerimento sarebbe una
          // bugia proprio nel momento in cui serve
          const bers = bersaglioFurto(mondo, rt.persona.x, rt.persona.z);
          if (bers && bers.d < dK && bers.d < dB) {
            hint = bers.hint;
            allerta = true;
          } else if (banco && dK < dB) hint = `Premi E · lavori · ${banco.bacheca.nome}`;
          else if (bottega) hint = `Premi E · ${bottega.nome}`;
        }
        // col maranza addosso il suggerimento cambia: quello che serve
        // sapere non è più «puoi parlargli», è come uscirne
        if (incontroInCorso().attivo) hint = 'F · sganciagli un pugno · oppure corri via';
        else if (!hint && !st.dialogo && cooldownDialogo.current <= 0 && runtime.npcs) {
          for (const n of runtime.npcs) {
            if (n.tipo !== 'maranza') continue;
            if (Math.hypot(n.x - rt.persona.x, n.z - rt.persona.z) < 3.4) {
              hint = 'Premi E per parlare';
              break;
            }
          }
        }
      }
    }
    if (hint !== hintPrima.current || allerta !== allertaPrima.current) {
      hintPrima.current = hint;
      allertaPrima.current = allerta;
      st.setHint(hint, allerta);
    }

    // Il passaggio in sella non è uno scatto di un fotogramma: la posa si
    // MESCOLA. La coda asintotica va però tagliata, o il personaggio resta
    // per sempre a 0,997 di posa e nessuno capisce perché la gamba non
    // torna mai giù del tutto.
    const bersaglioSella = st.mode === 'bici' ? 1 : 0;
    rt.sella += (bersaglioSella - rt.sella) * (1 - Math.exp(-9 * dt));
    if (Math.abs(bersaglioSella - rt.sella) < 0.01) rt.sella = bersaglioSella;
    if (st.mode !== 'bici') rt.piega += (0 - rt.piega) * (1 - Math.exp(-9 * dt));

    // modelli
    if (gruppoAuto.current) {
      gruppoAuto.current.position.set(rt.auto.x, QUOTA_CALPESTIO, rt.auto.z);
      gruppoAuto.current.rotation.y = -rt.auto.yaw;
    }
    if (gruppoPersona.current) {
      // in bici il personaggio si vede eccome: si vede pedalare
      gruppoPersona.current.visible = st.mode !== 'auto';
      // il bacino sta a 0,94 m da terra; alzarlo di 16 cm è quanto basta
      // perché il piede esteso arrivi al pedale senza staccarsi dalla sella
      gruppoPersona.current.position.set(
        rt.persona.x,
        QUOTA_CALPESTIO + 0.16 * rt.sella,
        rt.persona.z,
      );
      gruppoPersona.current.rotation.y = -rt.persona.yaw;
    }
    if (gruppoBici.current) {
      // La sella dei pezzi della bici sta a x = −0,32 nel suo riferimento:
      // spostando la BICI avanti di 30 cm il sedile finisce esattamente
      // sotto il bacino del ciclista. Bici e ciclista pendono attorno alla
      // stessa linea a terra, quindi la stessa piega li tiene insieme.
      gruppoBici.current.visible = st.mode === 'bici';
      gruppoBici.current.position.set(
        rt.persona.x + Math.cos(rt.persona.yaw) * 0.3,
        QUOTA_CALPESTIO,
        rt.persona.z + Math.sin(rt.persona.yaw) * 0.3,
      );
      gruppoBici.current.rotation.y = -rt.persona.yaw;
      gruppoBici.current.rotation.x = rt.piega;
    }

    updateAudio(rt, st.mode, dt);

    // ── il suono della città: brusio, grilli, uccelli, voci e campanelli ──
    ambienteAcc.current += dt;
    if (ambienteAcc.current > 0.75) {
      ambienteAcc.current = 0;
      const g = st.mode === 'auto' ? rt.auto : rt.persona;
      let vicini = 0;
      let biciVicina = false;
      if (runtime.npcs) {
        for (const n of runtime.npcs) {
          const d = Math.hypot(n.x - g.x, n.z - g.z);
          if (d < 26) vicini++;
          if (n.tipo === 'ciclista' && d < 9) biciVicina = true;
        }
      }
      updateAmbiente(cieloOra().luci, vicini, tempo.ora);
      if (biciVicina && Math.random() < 0.35) campanello();
      // ogni tanto qualcuno dice la sua, ma solo a piedi e da vicino
      vocaAcc.current += 0.75;
      if (st.mode === 'piedi' && vocaAcc.current > 7 && runtime.npcs) {
        for (const n of runtime.npcs) {
          if (Math.hypot(n.x - g.x, n.z - g.z) < 6) {
            vocaAcc.current = 0;
            parla(n.tipo);
            break;
          }
        }
      }
    }

    // HUD a bassa frequenza
    hudAcc.current += dt;
    if (hudAcc.current > 0.2) {
      hudAcc.current = 0;
      const v = st.mode === 'auto' ? Math.abs(rt.vAuto) : rt.vPersona;
      st.setKmh(Math.round(v * 3.6));
    }

    // il nome della via, come nei giochi veri
    viaAcc.current += dt;
    if (viaAcc.current > 0.5) {
      viaAcc.current = 0;
      const t = st.mode === 'auto' ? rt.auto : rt.persona;
      const nome = viaVicina(mondo, t.x, t.z);
      if (nome !== viaPrima.current) {
        viaPrima.current = nome;
        st.setVia(nome);
      }
    }
  });

  return (
    <>
      <Car ref={gruppoAuto} rt={rt} />
      <Bici ref={gruppoBici} rt={rt} />
      <Character ref={gruppoPersona} rt={rt} />
      <ChaseCamera rt={rt} />
    </>
  );
}
