'use client';

// Quello che dell'incontro col maranza si VEDE: il fumetto sopra la testa
// con la battuta scritta dentro, la sigaretta accesa in mano e il fumo che
// sale. Il cervello sta in lib/lugo/maranza.ts; qui ci sono solo pixel.
//
// ── PERCHÉ DUE SOLI InstancedMesh, E PERCHÉ IL COUNT VA A ZERO ────────────
// Il budget di Lugo è di 170 chiamate di disegno e nel punto peggiore
// (piazza Baracca) ne spendiamo già 168: il margine è di DUE. Quindi qui non
// si aggiunge una mesh per cosa — se ne aggiungono due in tutto, e il loro
// `count` torna a ZERO appena non c'è niente da mostrare, perché in three la
// chiamata di disegno si salta solo con count === 0 (con una mesh vuota ma
// count > 0 la si paga lo stesso, ogni fotogramma, anche guardando la
// campagna). Sigarette e fumo condividono la stessa mesh apposta: sono tutti
// cubetti, e il colore viaggia per istanza. Erano tre chiamate, sono due, e
// a riposo sono zero.
//
// Il componente si monta DOPO <Npcs /> in World.tsx: a pari priorità
// l'ordine dei useFrame è l'ordine di montaggio, quindi fumo e fumetti
// leggono le posizioni dello STESSO fotogramma invece di rincorrerle di uno.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { runtime } from '@/lib/lugo/runtime';
import { useLugo } from '@/lib/lugo/store';
import { cieloOra } from '@/lib/lugo/tempo';
import { FRASI_ATLANTE, FUMO, oraGioco, particelle, stepFumo } from '@/lib/lugo/maranza';

/** Quanti fumetti si leggono davvero insieme: oltre è confusione. */
const MAX_FUMETTI = 6;
/** 48 particelle di fumo + due cubetti per sigaretta accesa a schermo. */
const MAX_ROBA = FUMO.max + 32;
/** Oltre questa distanza una battuta non si legge più: non si disegna. */
const RAGGIO_FUMETTO = 26;
/** Oltre questa distanza la sigaretta è mezzo pixel: non si disegna. */
const RAGGIO_SIGARETTA = 40;

const CELLA_W = 448;
const CELLA_H = 104;
const RIGHE = 15;

interface Cella {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** larghezza/altezza della bolla: dà al quad la forma giusta. */
  rapporto: number;
  /** true per le bolle a due righe: stanno un po' più in alto e più grandi. */
  alta: boolean;
}

interface Atlante {
  tessitura: THREE.CanvasTexture;
  celle: Cella[];
}

// La cache di modulo, non un useMemo: questo componente sta sotto Suspense e
// un useMemo sospeso viene buttato via col tentativo. È la stessa trappola
// già documentata in Insegne.tsx, e qui costerebbe la ricottura di otto
// megabyte di canvas a ogni ripresa.
let atlanteCache: Atlante | null | undefined;

/**
 * Cuoce tutte le 43 battute in un canvas solo: una bolla per cella, testo
 * compreso. È la stessa strategia delle insegne — un atlante e una chiamata
 * di disegno — ma molto più piccola.
 */
export function atlanteFrasi(): Atlante | null {
  if (atlanteCache !== undefined) return atlanteCache;
  if (typeof document === 'undefined') return null;
  const colonne = Math.ceil(FRASI_ATLANTE.length / RIGHE);
  const W = colonne * CELLA_W;
  const H = RIGHE * CELLA_H;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    atlanteCache = null;
    return null;
  }
  ctx.clearRect(0, 0, W, H);
  const celle: Cella[] = [];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const font = 'bold 25px ui-sans-serif, system-ui, sans-serif';

  FRASI_ATLANTE.forEach((frase, i) => {
    const ox = Math.floor(i / RIGHE) * CELLA_W;
    const oy = (i % RIGHE) * CELLA_H;
    ctx.font = font;
    // A capo su DUE righe al massimo: la prima si riempie finché ci sta,
    // tutto il resto va nella seconda. Tre righe in un fumetto sopra la
    // testa non si leggono mentre si cammina, e le battute sono corte
    // apposta perché non servano.
    let r1 = '';
    let r2 = '';
    for (const parola of frase.split(' ')) {
      if (r2) {
        r2 += ' ' + parola;
        continue;
      }
      const prova = r1 ? r1 + ' ' + parola : parola;
      if (!r1 || ctx.measureText(prova).width <= 400) r1 = prova;
      else r2 = parola;
    }
    const righe = r2 ? [r1, r2] : [r1];
    const due = righe.length > 1;
    let larghezzaTesto = 0;
    for (const r of righe) larghezzaTesto = Math.max(larghezzaTesto, ctx.measureText(r).width);
    const bw = Math.max(150, Math.min(CELLA_W - 24, larghezzaTesto + 34));
    const bh = due ? 86 : 62;
    const bx = ox + (CELLA_W - bw) / 2;
    // La bolla resta CENTRATA con almeno dodici pixel di margine
    // trasparente su tutti i lati: senza margine, dal quinto livello di
    // mipmap in poi le celle vicine si sbavano l'una nell'altra e sopra la
    // testa del maranza compaiono pezzi di un'altra battuta.
    const by = oy + (CELLA_H - bh) / 2 - 4;

    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 14);
    ctx.fillStyle = 'rgba(247, 244, 236, 0.96)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1A1B20';
    ctx.stroke();
    // la codina che indica la testa di chi parla
    const cx = bx + bw / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 11, by + bh - 1);
    ctx.lineTo(cx + 11, by + bh - 1);
    ctx.lineTo(cx, by + bh + 13);
    ctx.closePath();
    ctx.fillStyle = 'rgba(247, 244, 236, 0.96)';
    ctx.fill();
    ctx.stroke();
    // il tratto del bordo passa anche sotto la base della codina: si
    // ricopre col fondo, se no la bolla ha una riga nera in mezzo
    ctx.beginPath();
    ctx.moveTo(cx - 9, by + bh - 2.5);
    ctx.lineTo(cx + 9, by + bh - 2.5);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(247, 244, 236, 0.96)';
    ctx.stroke();

    ctx.fillStyle = '#15171D';
    ctx.font = font;
    if (due) {
      ctx.fillText(righe[0], cx, by + bh / 2 - 14, bw - 20);
      ctx.fillText(righe[1], cx, by + bh / 2 + 14, bw - 20);
    } else {
      ctx.fillText(righe[0], cx, by + bh / 2, bw - 20);
    }

    celle.push({
      u0: bx / W,
      u1: (bx + bw) / W,
      // in Y la tessitura è specchiata rispetto al canvas
      v0: 1 - (by + bh + 14) / H,
      v1: 1 - by / H,
      rapporto: bw / (bh + 14),
      alta: due,
    });
  });

  const tessitura = new THREE.CanvasTexture(canvas);
  tessitura.anisotropy = 4;
  // mipmap ACCESE: a venti metri la bolla copre novanta pixel contro 448, e
  // senza mipmap il testo sfarfalla a ogni passo.
  tessitura.generateMipmaps = true;
  tessitura.minFilter = THREE.LinearMipmapLinearFilter;
  tessitura.magFilter = THREE.LinearFilter;
  // NESSUNA conversione di spazio colore, né qui né nel fragment: questo
  // shader scrive dritto nel framebuffer, quindi i byte del canvas arrivano
  // a schermo identici a come sono stati disegnati. Con la tessitura
  // dichiarata sRGB la GPU li porterebbe in lineare in lettura e il fumetto
  // uscirebbe grigio sporco invece che bianco carta.
  tessitura.colorSpace = THREE.NoColorSpace;
  tessitura.needsUpdate = true;
  atlanteCache = { tessitura, celle };
  return atlanteCache;
}

const _m = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _r = new THREE.Matrix4();
const _s = new THREE.Matrix4();
const _avanti = new THREE.Vector3();

/** Ordina per distanza senza allocare: sei elementi, si ordina a mano. */
const candidati: { i: number; d: number }[] = Array.from({ length: MAX_FUMETTI }, () => ({ i: -1, d: 0 }));

export function Maranza() {
  const atlante = useMemo(() => atlanteFrasi(), []);
  const fumetti = useRef<THREE.InstancedMesh>(null);
  const roba = useRef<THREE.InstancedMesh>(null);

  // geometria del fumetto: un quadrato unitario, con due attributi per
  // istanza (la cella dell'atlante e la dissolvenza)
  const geoFumetto = useMemo(() => {
    const g = new THREE.PlaneGeometry(1, 1);
    g.setAttribute('aUv', new THREE.InstancedBufferAttribute(new Float32Array(MAX_FUMETTI * 4), 4));
    g.setAttribute('aFade', new THREE.InstancedBufferAttribute(new Float32Array(MAX_FUMETTI), 1));
    return g;
  }, []);

  const matFumetto = useMemo(() => {
    if (!atlante) return null;
    return new THREE.ShaderMaterial({
      uniforms: { atlante: { value: atlante.tessitura } },
      // Billboard in spazio vista: il fumetto guarda sempre la camera e
      // resta DRITTO, e non costa niente alla CPU perché le due dimensioni
      // viaggiano già dentro la scala della matrice d'istanza.
      vertexShader: `
        attribute vec4 aUv;
        attribute float aFade;
        varying vec2 vUv;
        varying float vFade;
        void main() {
          vUv = mix(aUv.xy, aUv.zw, uv);
          vFade = aFade;
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mv.xy += position.xy * vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
          gl_Position = projectionMatrix * mv;
        }
      `,
      // Niente tonemapping e niente conversione: il fumetto è un elemento di
      // LETTURA, il bianco deve restare bianco e il nero nero esattamente
      // com'erano sul canvas. È tutta qui la ragione dello ShaderMaterial.
      fragmentShader: `
        uniform sampler2D atlante;
        varying vec2 vUv;
        varying float vFade;
        void main() {
          vec4 c = texture2D(atlante, vUv);
          float a = c.a * vFade;
          if (a < 0.01) discard;
          gl_FragColor = vec4(c.rgb, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      // dietro un muro il fumetto sparisce: se non lo vedi non devi leggerlo
      depthTest: true,
      fog: false,
    });
  }, [atlante]);

  const geoRoba = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.setAttribute('aColore', new THREE.InstancedBufferAttribute(new Float32Array(MAX_ROBA * 3), 3));
    g.setAttribute('aOpacita', new THREE.InstancedBufferAttribute(new Float32Array(MAX_ROBA), 1));
    return g;
  }, []);

  const matRoba = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: `
          attribute vec3 aColore;
          attribute float aOpacita;
          varying vec3 vCol;
          varying float vOp;
          void main() {
            vCol = aColore;
            vOp = aOpacita;
            gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vCol;
          varying float vOp;
          void main() {
            if (vOp < 0.01) discard;
            gl_FragColor = vec4(vCol, vOp);
          }
        `,
        transparent: true,
        depthWrite: false,
        // solo le facce anteriori: quelle di un cubo convesso non si
        // sovrappongono mai in schermo, quindi ogni pixel viene miscelato
        // una volta sola e il fumo non lascia aloni scuri
        side: THREE.FrontSide,
        fog: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geoFumetto.dispose();
      geoRoba.dispose();
      matRoba.dispose();
      matFumetto?.dispose();
    };
  }, [geoFumetto, geoRoba, matRoba, matFumetto]);

  useFrame(({ camera }, dtRaw) => {
    const mFumetti = fumetti.current;
    const mRoba = roba.current;
    const rt = runtime.rt;
    const npcs = runtime.npcs;
    if (!rt || !npcs) {
      if (mFumetti) mFumetti.count = 0;
      if (mRoba) mRoba.count = 0;
      return;
    }
    const st = useLugo.getState();
    const inGioco = st.fase === 'gioco';
    const gx = st.mode === 'auto' ? rt.auto.x : rt.persona.x;
    const gz = st.mode === 'auto' ? rt.auto.z : rt.persona.z;
    const dt = Math.min(dtRaw, 0.05);

    // Il fumo si emette solo a piedi e solo mentre si gioca: dal finestrino
    // di un'auto in corsa nessuno guarda una sigaretta, e le particelle vive
    // si spengono comunque da sole in meno di due secondi e mezzo.
    stepFumo(npcs, dt, gx, gz, inGioco && st.mode === 'piedi');

    const ora = oraGioco();
    const buio = cieloOra().luci;
    // Dove guarda la camera. Quello che sta dietro le spalle non si
    // disegna: non è un dettaglio estetico, è l'unica cosa che tiene il
    // count a ZERO quando in inquadratura non fuma nessuno — e con count
    // zero three salta del tutto la chiamata di disegno. Il frustum non
    // basta: `frustumCulled` è spento (le istanze si muovono ogni frame e
    // il bounding sphere della mesh non le segue), quindi il taglio va
    // fatto qui, a mano, mentre si riempiono le istanze.
    camera.getWorldDirection(_avanti);
    const cx = camera.position.x;
    const cy = camera.position.y;
    const cz = camera.position.z;
    const davanti = (x: number, y: number, z: number) =>
      (x - cx) * _avanti.x + (y - cy) * _avanti.y + (z - cz) * _avanti.z > -0.3;

    // ── la roba: sigarette accese e fumo, tutto nella stessa mesh ────────
    if (!mRoba) return;
    let k = 0;
    const colori = geoRoba.getAttribute('aColore') as THREE.InstancedBufferAttribute;
    const opacita = geoRoba.getAttribute('aOpacita') as THREE.InstancedBufferAttribute;
    // di notte tutto si smorza, ma la brace resta la cosa più luminosa in
    // mano al maranza: costa zero, mentre una seconda mesh emissiva sarebbe
    // costata una chiamata di disegno intera
    const luce = 1 - 0.45 * buio;
    for (const n of npcs) {
      if (k + 2 > MAX_ROBA) break;
      if (n.tipo !== 'maranza' || !n.fuma) continue;
      if (Math.abs(n.x - gx) > RAGGIO_SIGARETTA || Math.abs(n.z - gz) > RAGGIO_SIGARETTA) continue;
      if (!davanti(n.manoX, n.manoY, n.manoZ)) continue;
      _t.makeTranslation(n.manoX, n.manoY, n.manoZ);
      _r.makeRotationY(-n.yaw);
      _t.multiply(_r);
      // la sigaretta punta avanti e un po' in giù, come la si tiene fra le dita
      _r.makeRotationZ(-0.35);
      _t.multiply(_r);
      // corpo
      _m.copy(_t);
      _s.makeScale(0.062, 0.01, 0.01);
      _m.multiply(_s);
      mRoba.setMatrixAt(k, _m);
      colori.setXYZ(k, 0.937 * luce, 0.914 * luce, 0.863 * luce);
      opacita.setX(k, 1);
      k++;
      // brace
      _m.copy(_t);
      _r.makeTranslation(0.036, 0, 0);
      _m.multiply(_r);
      _s.makeScale(0.011, 0.012, 0.012);
      _m.multiply(_s);
      mRoba.setMatrixAt(k, _m);
      // la brace non si smorza: di notte è l'unico punto acceso in mano
      colori.setXYZ(k, 1, 0.353, 0.118);
      opacita.setX(k, 1);
      k++;
    }
    // grigio fumo, spento del 55% di notte: al buio il fumo è un'ombra
    // chiara, non una macchia bianca in mezzo alla strada
    const fx = 0.91 * (1 - 0.55 * buio);
    const fy = 0.902 * (1 - 0.55 * buio);
    const fz = 0.878 * (1 - 0.55 * buio);
    for (const p of particelle) {
      if (!p.viva || k >= MAX_ROBA) continue;
      if (!davanti(p.x, p.y, p.z)) continue;
      _m.makeTranslation(p.x, p.y, p.z);
      _r.makeRotationY(p.yaw);
      _m.multiply(_r);
      _s.makeScale(p.dim, p.dim, p.dim);
      _m.multiply(_s);
      mRoba.setMatrixAt(k, _m);
      colori.setXYZ(k, fx, fy, fz);
      opacita.setX(k, p.alfa);
      k++;
    }
    // count a zero = nessuna chiamata di disegno: è l'unico modo in three
    mRoba.count = k;
    if (k > 0) {
      mRoba.instanceMatrix.needsUpdate = true;
      colori.needsUpdate = true;
      opacita.needsUpdate = true;
    }

    // ── i fumetti ────────────────────────────────────────────────────────
    if (!mFumetti) return;
    let q = 0;
    if (atlante) {
      for (let i = 0; i < npcs.length; i++) {
        const n = npcs[i];
        if (n.frase < 0 || n.fraseFino <= ora) continue;
        const d = Math.hypot(n.x - camera.position.x, n.z - camera.position.z);
        if (d > RAGGIO_FUMETTO) continue;
        // i più vicini per primi: se ne parlano sette insieme, si leggono
        // quelli che si hanno davvero davanti
        let posto = q < MAX_FUMETTI ? q++ : -1;
        if (posto < 0) {
          let peggiore = 0;
          for (let j = 1; j < MAX_FUMETTI; j++) if (candidati[j].d > candidati[peggiore].d) peggiore = j;
          if (candidati[peggiore].d <= d) continue;
          posto = peggiore;
        }
        candidati[posto].i = i;
        candidati[posto].d = d;
      }
      const uvs = geoFumetto.getAttribute('aUv') as THREE.InstancedBufferAttribute;
      const fade = geoFumetto.getAttribute('aFade') as THREE.InstancedBufferAttribute;
      for (let j = 0; j < q; j++) {
        const n = npcs[candidati[j].i];
        const cella = atlante.celle[n.frase];
        const dissolvenza =
          Math.min(1, (ora - n.fraseDa) / 0.18) * Math.min(1, (n.fraseFino - ora) / 0.35);
        // un piccolo «pop» d'ingresso nei primi decimi di secondo
        const pop = Math.min(1, 0.6 + (ora - n.fraseDa) / 0.16 * 0.4);
        const h = (cella.alta ? 0.6 : 0.46) * pop;
        const w = h * cella.rapporto;
        // NON si somma il rimbalzo del passo: un fumetto che sobbalza è
        // illeggibile, ed è la prima cosa che si nota camminando di fianco
        _m.makeTranslation(n.x, 2.18 + h / 2, n.z);
        _s.makeScale(w, h, 1);
        _m.multiply(_s);
        mFumetti.setMatrixAt(j, _m);
        uvs.setXYZW(j, cella.u0, cella.v0, cella.u1, cella.v1);
        fade.setX(j, Math.max(0, dissolvenza));
      }
      mFumetti.count = q;
      if (q > 0) {
        mFumetti.instanceMatrix.needsUpdate = true;
        uvs.needsUpdate = true;
        fade.needsUpdate = true;
      }
    } else {
      mFumetti.count = 0;
    }
  });

  return (
    <group name="maranza">
      <instancedMesh
        ref={roba}
        args={[geoRoba, matRoba, MAX_ROBA]}
        frustumCulled={false}
        count={0}
      />
      {matFumetto && (
        <instancedMesh
          ref={fumetti}
          args={[geoFumetto, matFumetto, MAX_FUMETTI]}
          frustumCulled={false}
          renderOrder={10}
          count={0}
        />
      )}
    </group>
  );
}
