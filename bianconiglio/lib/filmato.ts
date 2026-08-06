// Il filmato d'attesa: come si dipinge un video «impilato» senza fondo.
//
// I browser non hanno un formato video con trasparenza che funzioni ovunque
// (VP9 con alfa non esiste su iPhone, HEVC con alfa non esiste altrove).
// Quindi il girato è UN video normale, alto il doppio: la metà alta porta il
// colore, la metà bassa porta la maschera di trasparenza in scala di grigi.
// Un canvas WebGL ricuce le due metà a ogni fotogramma: colore dalla metà
// alta, alfa dalla metà bassa. Funziona su qualsiasi cosa abbia WebGL —
// cioè tutto, iPhone compreso.
//
// I due file in `public/` sono lo stesso girato in due codec: H.264 per
// Safari (decodifica hardware, c'è sempre) e VP9 per i Chromium compilati
// senza codec proprietari. Il <video> con due <source> sceglie da solo.

const VERTICE =
  'attribute vec2 p;varying vec2 t;' +
  'void main(){t=vec2((p.x+1.)/2.,(1.-p.y)/2.);gl_Position=vec4(p,0.,1.);}';

// `min(c, vec3(a))`: il colore è già premoltiplicato in codifica, ma la
// compressione può farlo sforare l'alfa di un soffio e accendere un orlo
// chiaro sul contorno. Il *1.02 compensa la maschera che, passata dal
// yuv, non arriva mai a 255 pieno.
const FRAMMENTO =
  'precision mediump float;varying vec2 t;uniform sampler2D u;' +
  'void main(){' +
  'vec3 c=texture2D(u,vec2(t.x,t.y*.5)).rgb;' +
  'float a=min(1.,texture2D(u,vec2(t.x,t.y*.5+.5)).r*1.02);' +
  'gl_FragColor=vec4(min(c,vec3(a)),a);}';

export type Pittore = {
  /** Dipinge il fotogramma corrente del video. Vero se c'era da dipingere. */
  dipingi: () => boolean;
};

/**
 * Prepara il canvas a ricombinare il video impilato. Ritorna `null` dove
 * WebGL non c'è: in quel caso il filmato semplicemente non parte e resta lo
 * sprite con gli occhi e la bocca comandati — la demo di prima, intatta.
 */
export function creaPittore(tela: HTMLCanvasElement, video: HTMLVideoElement): Pittore | null {
  const gl = tela.getContext('webgl', { premultipliedAlpha: true, alpha: true });
  if (!gl) return null;

  const compila = (tipo: number, sorgente: string) => {
    const shader = gl.createShader(tipo);
    if (!shader) return null;
    gl.shaderSource(shader, sorgente);
    gl.compileShader(shader);
    return shader;
  };

  const vertice = compila(gl.VERTEX_SHADER, VERTICE);
  const frammento = compila(gl.FRAGMENT_SHADER, FRAMMENTO);
  const programma = gl.createProgram();
  if (!vertice || !frammento || !programma) return null;
  gl.attachShader(programma, vertice);
  gl.attachShader(programma, frammento);
  gl.linkProgram(programma);
  if (!gl.getProgramParameter(programma, gl.LINK_STATUS)) return null;
  gl.useProgram(programma);

  // Un triangolo che copre tutto lo schermo: meno lavoro di un quadrilatero.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posizione = gl.getAttribLocation(programma, 'p');
  gl.enableVertexAttribArray(posizione);
  gl.vertexAttribPointer(posizione, 2, gl.FLOAT, false, 0, 0);

  const trama = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, trama);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return {
    dipingi() {
      // Sotto HAVE_CURRENT_DATA non c'è un fotogramma da leggere.
      if (video.readyState < 2) return false;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    },
  };
}

/**
 * Dove sta il coniglio dentro il fotogramma, misurato sulla maschera del
 * fotogramma 0 (che ha la stessa posa dello sprite, piedi a terra). Queste
 * percentuali posizionano la tela sopra il riquadro dello sprite in modo che
 * i due conigli coincidano: scala uniforme, il video non viene mai stirato.
 */
export const RITAGLIO_FILMATO = {
  left: '-20.85%',
  top: '-6.31%',
  width: '146.58%',
  height: '108.35%',
} as const;
