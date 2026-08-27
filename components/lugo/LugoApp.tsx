'use client';

// Radice del gioco: comandi da tastiera + canvas + overlay DOM. Lo start
// screen e l'HUD completi arrivano con la milestone missioni; per ora la
// partita comincia subito.

import { useEffect } from 'react';
import { KeyboardControls } from '@react-three/drei';
import { GameCanvas } from './GameCanvas';
import { Hud } from './Hud';
import { Joystick } from './Joystick';
import { StartScreen } from './StartScreen';
import { CONTROLLI } from '@/lib/lugo/input';
import { useLugo } from '@/lib/lugo/store';

export function LugoApp() {
  const fase = useLugo((s) => s.fase);

  useEffect(() => {
    // le frecce non devono scrollare la pagina
    const blocca = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blocca);
    return () => window.removeEventListener('keydown', blocca);
  }, []);

  return (
    <KeyboardControls map={CONTROLLI}>
      <div className="lugo-root">
        <GameCanvas />
        {fase === 'start' ? <StartScreen /> : <Hud />}
        <Joystick />
      </div>
    </KeyboardControls>
  );
}
