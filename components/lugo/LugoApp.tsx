'use client';

// Radice del gioco: comandi da tastiera + canvas + overlay DOM. Lo start
// screen e l'HUD completi arrivano con la milestone missioni; per ora la
// partita comincia subito.

import { Suspense, useEffect, useState } from 'react';
import { KeyboardControls } from '@react-three/drei';
import { GameCanvas } from './GameCanvas';
import { Hud } from './Hud';
import { Joystick } from './Joystick';
import { StartScreen } from './StartScreen';
import { Intro, introGiaVista } from './Intro';
import { CONTROLLI, suUnComando } from '@/lib/lugo/input';
import { useLugo } from '@/lib/lugo/store';
import { avviaSalvataggio } from '@/lib/lugo/salvataggio';
import { setVolumi } from '@/lib/lugo/audio';

export function LugoApp() {
  const fase = useLugo((s) => s.fase);
  // l'intro si vede una volta per scheda: ricaricare la pagina durante una
  // partita non deve rifarla vedere ogni volta
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    if (introGiaVista()) setIntro(false);
  }, []);

  useEffect(() => {
    // i progressi si caricano e da lì in poi si salvano da soli
    avviaSalvataggio();
    // i volumi salvati entrano subito nel mixer
    setVolumi(useLugo.getState().volumi);
    // Le frecce non devono scrollare la pagina. Ma se il fuoco è su un
    // tasto dello schermo, lo Spazio deve premerlo: bloccandolo sempre,
    // chi gioca da tastiera non poteva attivare GIOCA, ACCETTA o RISCUOTI
    // con la barra spaziatrice — il modo in cui si preme un bottone da
    // che esistono i browser.
    const blocca = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) return;
      if (suUnComando(e.target)) return;
      e.preventDefault();
    };
    // Dopo un click col dito o col mouse il bottone resta col fuoco, e la
    // barra spaziatrice — che nel gioco è il freno a mano — lo ripremeva.
    // Un click da tastiera arriva con detail 0: quello lascia il fuoco
    // dov'è, perché a chi naviga da tastiera serve.
    const sfoca = (e: MouseEvent) => {
      if (e.detail === 0) return;
      const bottone = (e.target as HTMLElement | null)?.closest?.('button');
      if (bottone) bottone.blur();
    };
    window.addEventListener('keydown', blocca);
    window.addEventListener('click', sfoca);
    return () => {
      window.removeEventListener('keydown', blocca);
      window.removeEventListener('click', sfoca);
    };
  }, []);

  return (
    <KeyboardControls map={CONTROLLI}>
      <div className="lugo-root">
        <GameCanvas />
        {intro && <Intro onFine={() => setIntro(false)} />}
        {fase === 'start' ? (
          <StartScreen />
        ) : (
          // l'HUD legge la mappa (punti di interesse del diario): serve la
          // rete di sicurezza, anche se a partita avviata è già caricata
          <Suspense fallback={null}>
            <Hud />
          </Suspense>
        )}
        <Joystick />
      </div>
    </KeyboardControls>
  );
}
