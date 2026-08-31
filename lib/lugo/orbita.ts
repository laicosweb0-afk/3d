'use client';

// L'orbita della camera: il trascinamento col dito o col mouse sul canvas
// che fa girare la visuale a 360°, il pinch a due dita e la rotellina per
// lo zoom. Lo stato vive fuori da React per la stessa ragione di stick.ts:
// lo scrivono i pointer event del canvas, lo legge la ChaseCamera nel suo
// useFrame, e nessuno dei due deve passare da un re-render.
//
// La divisione dei compiti è precisa, ed è il cuore del "senza bug": qui si
// convertono i PIXEL in RADIANTI e si tiene la contabilità dei puntatori;
// che cosa quei radianti facciano — girare rt.cameraYaw a piedi, o essere
// solo uno sguardo temporaneo in auto e in bici — lo decide la ChaseCamera,
// l'unica a sapere in che modalità si sta giocando. Se questo modulo
// applicasse da solo i delta a rt.cameraYaw, in auto lo sguardo di lato
// girerebbe anche il riferimento dei comandi, cioè lo sterzo.

/** Radianti di visuale per pixel di trascinamento orizzontale. */
const RAD_PER_PIXEL = 0.006;
/** In verticale un po' meno: la corsa utile del pitch è molto più corta. */
const RAD_PER_PIXEL_PITCH = 0.0045;
/**
 * Il pitch è l'inclinazione dello sguardo: positivo = camera più alta che
 * guarda in giù, negativo = camera bassa che guarda in su. I limiti sono
 * asimmetrici apposta: in giù c'è tutta la città da vedere, in su dopo
 * −0,12 rad la camera finirebbe sotto il piano stradale.
 */
export const PITCH_MIN = -0.12;
export const PITCH_MAX = 0.55;
/** Fattore sulla distanza della modalità corrente: 60%–160%. */
export const ZOOM_MIN = 0.6;
export const ZOOM_MAX = 1.6;
/**
 * Dopo l'ultimo rilascio il riallineo automatico dietro le spalle resta
 * fermo per questo tempo: senza la pausa, chi gira la visuale e riparte
 * subito dritto se la vedrebbe strappare via dalle mani dal riallineo.
 */
const PAUSA_RIALLINEO_MS = 1500;

export const orbita = {
  /**
   * Yaw accumulato dai pointer event e non ancora consumato dalla camera.
   * È un ACCUMULATORE, non uno stato: fra due fotogrammi possono arrivare
   * tre pointermove, e sommarli qui invece di tenere solo l'ultimo è ciò
   * che rende il conto dei pixel esatto anche quando il frame arranca.
   */
  dYaw: 0,
  /** Inclinazione dello sguardo (rad), già clampata. Stato assoluto. */
  pitch: 0,
  /** Fattore di zoom sulla distanza della modalità, già clampato. */
  zoom: 1,
  /**
   * Lo sguardo temporaneo in auto/bici (rad). Lo scrive SOLO la
   * ChaseCamera, che a piedi lo ripiega dentro rt.cameraYaw e nei mezzi
   * lo fa decadere a zero dopo il rilascio.
   */
  offsetYaw: 0,
  /** Quanti puntatori stanno trascinando il canvas adesso (0, 1 o 2). */
  dita: 0,
  /** performance.now() del momento in cui l'ultimo dito ha mollato. */
  ultimoRilascio: 0,
};

/** La camera preleva i radianti in sospeso e azzera l'accumulatore. */
export function consumaDeltaYaw(): number {
  const d = orbita.dYaw;
  orbita.dYaw = 0;
  return d;
}

/**
 * True se si sta orbitando ADESSO o si è appena smesso: è la finestra in
 * cui il riallineo automatico dietro le spalle deve restare fermo.
 */
export function orbitaRecente(): boolean {
  return orbita.dita > 0 || performance.now() - orbita.ultimoRilascio < PAUSA_RIALLINEO_MS;
}

function clampa(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/**
 * Aggancia l'orbita all'elemento canvas VERO di three.js e ritorna la
 * funzione di sgancio. Si ascolta il DOM e non gli onPointerDown del
 * <Canvas> di r3f: quelli passano dal raycaster e scattano solo colpendo
 * un oggetto 3D — un drag cominciato sul cielo non arriverebbe mai.
 * Ascoltando l'elemento, invece, il joystick e i bottoni dell'HUD restano
 * fuori da soli: stanno SOPRA il canvas nel DOM, i loro pointer event
 * hanno come bersaglio loro stessi e qui non transitano proprio; e il
 * dito che loro catturano resta loro anche se scivola sul canvas.
 */
export function attaccaOrbita(canvas: HTMLCanvasElement): () => void {
  // l'ultima posizione nota di ogni puntatore che stiamo seguendo: i delta
  // si misurano da qui, così quando un dito del pinch si stacca l'altro
  // riparte dal proprio ultimo punto ed è il "ribasare" che evita lo scatto
  const puntatori = new Map<number, { x: number; y: number }>();

  const aggiornaConta = () => {
    orbita.dita = puntatori.size;
  };

  const rilascia = (id: number) => {
    if (!puntatori.delete(id)) return;
    aggiornaConta();
    // il tempo di rilascio conta solo quando molla l'ULTIMO dito: se lo
    // segnasse anche il primo dei due del pinch, la pausa del riallineo
    // partirebbe a metà gesto
    if (puntatori.size === 0) orbita.ultimoRilascio = performance.now();
  };

  const giu = (e: PointerEvent) => {
    // il terzo dito non comanda niente: due bastano per orbita e pinch, e
    // accettarne altri vorrebbe dire scegliere quale coppia fa lo zoom
    if (puntatori.size >= 2) return;
    // col mouse si orbita SOLO col tasto principale: il destro è il menu
    // contestuale e il medio l'autoscroll, e rubarli qui è un bug altrove
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    puntatori.set(e.pointerId, { x: e.clientX, y: e.clientY });
    aggiornaConta();
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // senza capture il drag funziona lo stesso finché si resta sul
      // canvas; uscendo dal bordo arriverà comunque il pointerup globale
    }
  };

  const muovi = (e: PointerEvent) => {
    const p = puntatori.get(e.pointerId);
    if (!p) return;
    // cintura e bretelle per il mouse: se il pulsante risulta già alzato
    // (rilascio avvenuto fuori finestra prima della capture) il puntatore
    // va mollato qui, o si resterebbe in orbita a tasto su — il classico
    // drag fantasma che segue il mouse per sempre
    if (e.pointerType === 'mouse' && (e.buttons & 1) === 0) {
      rilascia(e.pointerId);
      return;
    }
    if (puntatori.size === 2) {
      // ── pinch: comanda SOLO la distanza fra le dita ──────────────────
      // Niente rotazione col pinch in corso: due dita non si muovono mai
      // in modo perfettamente solidale, e mescolare l'orbita allo zoom
      // fa ondeggiare la visuale a ogni pizzico.
      let altro: { x: number; y: number } | null = null;
      for (const [id, q] of puntatori) if (id !== e.pointerId) altro = q;
      if (altro) {
        const prima = Math.hypot(p.x - altro.x, p.y - altro.y);
        const dopo = Math.hypot(e.clientX - altro.x, e.clientY - altro.y);
        // dita che si allargano = ci si avvicina = fattore più piccolo
        if (prima > 1 && dopo > 1) {
          orbita.zoom = clampa(orbita.zoom * (prima / dopo), ZOOM_MIN, ZOOM_MAX);
        }
      }
    } else {
      // ── orbita: pixel → radianti ─────────────────────────────────────
      // trascinare a destra guarda a destra (yaw cresce verso destra: è
      // la stessa convenzione di character.ts); trascinare in giù abbassa
      // lo sguardo alzando la camera, come nei giochi di guida
      orbita.dYaw += (e.clientX - p.x) * RAD_PER_PIXEL;
      orbita.pitch = clampa(
        orbita.pitch + (e.clientY - p.y) * RAD_PER_PIXEL_PITCH,
        PITCH_MIN,
        PITCH_MAX,
      );
    }
    p.x = e.clientX;
    p.y = e.clientY;
  };

  const su = (e: PointerEvent) => rilascia(e.pointerId);

  const rotella = (e: WheelEvent) => {
    // stesso zoom e stessi clamp del pinch; il preventDefault tiene la
    // rotellina sul gioco invece che sullo scroll della pagina
    e.preventDefault();
    orbita.zoom = clampa(orbita.zoom * Math.exp(e.deltaY * 0.0011), ZOOM_MIN, ZOOM_MAX);
  };

  // qualunque uscita dalla finestra molla tutto, come fa il joystick: mai
  // un'orbita "incollata" al rientro da un cambio di scheda
  const molla = () => {
    puntatori.clear();
    aggiornaConta();
    orbita.dYaw = 0;
    orbita.ultimoRilascio = performance.now();
  };

  canvas.addEventListener('pointerdown', giu);
  canvas.addEventListener('pointermove', muovi);
  canvas.addEventListener('pointerup', su);
  canvas.addEventListener('pointercancel', su);
  canvas.addEventListener('lostpointercapture', su);
  canvas.addEventListener('wheel', rotella, { passive: false });
  window.addEventListener('blur', molla);
  document.addEventListener('visibilitychange', molla);

  return () => {
    canvas.removeEventListener('pointerdown', giu);
    canvas.removeEventListener('pointermove', muovi);
    canvas.removeEventListener('pointerup', su);
    canvas.removeEventListener('pointercancel', su);
    canvas.removeEventListener('lostpointercapture', su);
    canvas.removeEventListener('wheel', rotella);
    window.removeEventListener('blur', molla);
    document.removeEventListener('visibilitychange', molla);
    molla();
  };
}
