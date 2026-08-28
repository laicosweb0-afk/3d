'use client';

// Minimappa circolare: le strade pre-renderizzate una volta su un canvas
// fuori schermo, poi ogni tick si ritaglia la finestra attorno al
// giocatore (nord in alto), con la freccia del giocatore e il blip
// dell'obiettivo agganciato al bordo quando è lontano.

import { useEffect, useRef } from 'react';
import { mondoLugo, type MondoLugo } from '@/lib/lugo/loadMap';
import { registroAttivita, COLORE_CATEGORIA } from '@/lib/lugo/attivita';
import { puntiInteresse } from '@/lib/lugo/poi';
import { missioneById, posTappa } from '@/lib/lugo/missions';
import { runtime } from '@/lib/lugo/runtime';
import { useLugo } from '@/lib/lugo/store';

const LATO = 180; // px CSS
const SCALA_OFF = 1.2; // px per metro del canvas fuori schermo

function disegnaBase(mondo: MondoLugo): { off: HTMLCanvasElement; minX: number; minZ: number } {
  const { minX, minZ, maxX, maxZ } = mondo.bounds;
  const off = document.createElement('canvas');
  off.width = Math.ceil((maxX - minX) * SCALA_OFF);
  off.height = Math.ceil((maxZ - minZ) * SCALA_OFF);
  const ctx = off.getContext('2d')!;
  // toni chiari da cartina di Maps, in tinta col gioco diurno
  ctx.fillStyle = '#EDEAE2';
  ctx.fillRect(0, 0, off.width, off.height);

  const w2p = (x: number, z: number): [number, number] => [(x - minX) * SCALA_OFF, (z - minZ) * SCALA_OFF];

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const a of mondo.aree) {
    if (a.kind === 'acqua') ctx.fillStyle = '#9DC6E8';
    else if (a.kind === 'verde') ctx.fillStyle = '#B4D8A0';
    else if (a.kind === 'parcheggio') ctx.fillStyle = '#DAD6CC';
    else ctx.fillStyle = '#DFD9CC';
    ctx.beginPath();
    for (let i = 0; i < a.poly.length; i += 2) {
      const [px, pz] = w2p(a.poly[i], a.poly[i + 1]);
      if (i === 0) ctx.moveTo(px, pz);
      else ctx.lineTo(px, pz);
    }
    ctx.closePath();
    ctx.fill();
  }
  for (const r of mondo.roads) {
    ctx.strokeStyle = r.classe === 'pedonale' ? '#D9D1BE' : '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, r.larghezza * SCALA_OFF * 0.9);
    ctx.beginPath();
    for (let i = 0; i < r.pts.length; i += 2) {
      const [px, pz] = w2p(r.pts[i], r.pts[i + 1]);
      if (i === 0) ctx.moveTo(px, pz);
      else ctx.lineTo(px, pz);
    }
    ctx.stroke();
  }
  // le attività: un pallino del colore della categoria
  for (const a of registroAttivita(mondo)) {
    const [px, pz] = w2p(a.x, a.z);
    ctx.fillStyle = COLORE_CATEGORIA[a.categoria];
    ctx.beginPath();
    ctx.arc(px, pz, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  return { off, minX, minZ };
}

export function Minimap() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let vivo = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    mondoLugo().then((mondo) => {
      if (!vivo || !ref.current) return;
      const { off, minX, minZ } = disegnaBase(mondo);
      const canvas = ref.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = LATO * dpr;
      canvas.height = LATO * dpr;
      const ctx = canvas.getContext('2d')!;

      let finestraCorrente = 260;
      const disegna = () => {
        const rt = runtime.rt;
        if (!rt) return;
        const s = useLugo.getState();
        const t = s.mode === 'auto' ? rt.auto : rt.persona;
        const lato = LATO * dpr;
        // zoom dinamico: a piedi si vede vicino, in velocità più lontano
        const finestraTarget = s.mode === 'piedi' ? 190 : 260 + Math.min(140, Math.abs(rt.vAuto) * 6);
        finestraCorrente += (finestraTarget - finestraCorrente) * 0.12;
        const FINESTRA = finestraCorrente;
        const finestraPx = FINESTRA * SCALA_OFF;

        ctx.clearRect(0, 0, lato, lato);
        ctx.save();
        ctx.beginPath();
        ctx.arc(lato / 2, lato / 2, lato / 2 - dpr, 0, Math.PI * 2);
        ctx.clip();

        const cx = (t.x - minX) * SCALA_OFF;
        const cz = (t.z - minZ) * SCALA_OFF;
        ctx.drawImage(
          off,
          cx - finestraPx / 2, cz - finestraPx / 2, finestraPx, finestraPx,
          0, 0, lato, lato,
        );

        // i luoghi da scoprire: rombo pieno se già visitato, vuoto se no
        {
          const pxm = lato / FINESTRA;
          for (const pt of puntiInteresse(mondo)) {
            if (pt.tipo === 'attivita') continue;
            const dx = (pt.x - t.x) * pxm;
            const dz = (pt.z - t.z) * pxm;
            if (Math.hypot(dx, dz) > lato / 2 - 6 * dpr) continue;
            const visto = s.poiVisitati.includes(pt.id);
            ctx.save();
            ctx.translate(lato / 2 + dx, lato / 2 + dz);
            ctx.rotate(Math.PI / 4);
            const r = 3.4 * dpr;
            ctx.beginPath();
            ctx.rect(-r, -r, r * 2, r * 2);
            if (visto) {
              ctx.fillStyle = '#B4762A';
              ctx.fill();
            } else {
              ctx.strokeStyle = '#6E6252';
              ctx.lineWidth = 1.4 * dpr;
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // blip dell'obiettivo
        if (s.statoMissione === 'attiva' && s.missioneId) {
          const m = missioneById(s.missioneId);
          if (m) {
            const target = posTappa(mondo, m.tappe[s.tappa]);
            const pxm = lato / FINESTRA; // px canvas per metro visibile
            let dx = (target.x - t.x) * pxm;
            let dz = (target.z - t.z) * pxm;
            const dist = Math.hypot(dx, dz);
            const rMax = lato / 2 - 10 * dpr;
            if (dist > rMax) {
              dx = (dx / dist) * rMax;
              dz = (dz / dist) * rMax;
            }
            ctx.fillStyle = '#E8710A';
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1.5 * dpr;
            ctx.beginPath();
            ctx.arc(lato / 2 + dx, lato / 2 + dz, 4.5 * dpr, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }

        // giocatore: triangolo orientato con lo heading
        const yaw = s.mode === 'auto' ? rt.auto.yaw : rt.persona.yaw;
        ctx.save();
        ctx.translate(lato / 2, lato / 2);
        ctx.rotate(yaw + Math.PI / 2);
        ctx.fillStyle = '#2A6FD6';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(0, -7 * dpr);
        ctx.lineTo(5 * dpr, 6 * dpr);
        ctx.lineTo(-5 * dpr, 6 * dpr);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.restore();
        // bordo
        ctx.strokeStyle = 'rgba(70,74,84,0.45)';
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.arc(lato / 2, lato / 2, lato / 2 - dpr, 0, Math.PI * 2);
        ctx.stroke();
      };

      timer = setInterval(disegna, 100);
    });
    return () => {
      vivo = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return <canvas ref={ref} className="lugo-minimappa" style={{ width: LATO, height: LATO }} data-hud="minimappa" />;
}
