// Genera il prototipo «tutto in un file» per la pubblicazione come Artifact:
// la scena del Bianconiglio con immagine e voci incapsulate in base64.
// La fonte di verità di testi e regole resta lib/repertorio.ts nel progetto:
// da lì vengono estratti a ogni build di questo file.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const PAROLA = process.env.PAROLA || 'seguimi';
const SIGILLO = createHash('sha256').update(`bianconiglio::sigillo::${PAROLA}`).digest('hex');

const REPO = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
// Il file esce nella cartella del progetto (ed e' nel .gitignore: pesa
// diversi MB e si rigenera da qui in un attimo).
const OUT = process.env.OUT || `${REPO}/bianconiglio-link.html`;

const b64 = (p) => readFileSync(p).toString('base64');

// --- regole e testi, estratti dal progetto --------------------------------
const src = readFileSync(`${REPO}/lib/repertorio.ts`, 'utf8');
const regole = src.match(/const REGOLE: Regola\[\] = (\[[\s\S]*?\n\]);/)[1];
const fuori = src.match(/const FUORI_TEMA: Battuta = (\{[\s\S]*?\});/)[1];
const benvenuto = readFileSync(`${REPO}/lib/personaggio.ts`, 'utf8')
  .match(/BENVENUTO =\s*'([\s\S]*?)';/)[1];

// --- asset -----------------------------------------------------------------
const sprite = b64(`${REPO}/public/bianconiglio.webp`);
// Il filmato d'attesa: video «impilato» (metà alta = colore, metà bassa =
// maschera di trasparenza) ricavato dal girato su fondo verde. Un canvas
// WebGL li ricombina a schermo: funziona ovunque, iPhone compreso, dove i
// video con canale alfa nativo non esistono.
// Due codec dello stesso video: H.264 per Safari/iPhone (decodifica in
// hardware, sempre presente) e VP9 per i Chromium senza codec proprietari.
// A runtime si sceglie col canPlayType.
const filmatoMp4 = b64(`${REPO}/public/idle-stack.mp4`);
const filmatoWebm = b64(`${REPO}/public/idle-stack.webm`);
const voci = {};
for (const f of readdirSync(`${REPO}/public/voce`)) {
  voci[f.replace('.mp3', '')] = b64(`${REPO}/public/voce/${f}`);
}
console.log('voci incapsulate:', Object.keys(voci).length);

const html = `<meta charset="utf-8">\n<title>Continua.</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  /* La palette è quella del biglietto da visita di WO•MAN: nero profondo,
     crema, magenta, oro. Il mondo è uno solo e volutamente scuro: niente
     tema chiaro, il buio È la scena. */
  :root{
    --nero:#0E0B0D; --crema:#F6F1E9; --magenta:#D6336C; --oro:#C9A45C;
    --crema-tenue:rgba(246,241,233,.66); --crema-fioca:rgba(246,241,233,.4);
    --margine:clamp(1.1rem,5vw,3rem);
    --serif:'Cormorant Garamond',Didot,'Bodoni MT','Playfair Display',Georgia,serif;
    --sans:Jost,'Avenir Next',Avenir,Futura,'Century Gothic',system-ui,sans-serif;
  }
  *{box-sizing:border-box;margin:0}
  html,body{height:100%;background:var(--nero);color:var(--crema);
    font-family:var(--sans);overscroll-behavior:none}
  @media (prefers-reduced-motion:reduce){
    *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  }

  .scena{position:relative;height:100dvh;display:flex;flex-direction:column;overflow:hidden;
    background:radial-gradient(120% 70% at 50% 100%,rgba(214,51,108,.16) 0%,transparent 62%),
               radial-gradient(80% 50% at 50% 108%,rgba(201,164,92,.14) 0%,transparent 70%),var(--nero)}
  .cornice{position:fixed;top:0;bottom:0;width:2px;z-index:40;pointer-events:none;
    background:linear-gradient(to bottom,transparent 0%,var(--magenta) 12%,var(--magenta) 88%,transparent 100%)}
  .cornice.sx{left:calc(var(--margine)/2)} .cornice.dx{right:calc(var(--margine)/2)}

  .hero{position:relative;z-index:20;padding:clamp(1.3rem,4.5vh,2.6rem) var(--margine) clamp(.35rem,1.4vh,.75rem);
    text-align:center;pointer-events:none}
  .marchio{font-size:clamp(.55rem,1.7vw,.68rem);letter-spacing:.34em;text-transform:uppercase;
    color:var(--oro);margin-bottom:clamp(1rem,3.5vh,2.2rem)}
  .marchio span{display:block;margin-top:.5em;font-size:.85em;letter-spacing:.28em;color:var(--crema-fioca)}
  h1{font-family:var(--serif);font-weight:400;font-size:clamp(1.45rem,5.4vw,2.7rem);line-height:1.15;
    letter-spacing:.01em;text-wrap:balance}
  h1 em{font-style:italic;color:var(--magenta)}
  .sotto{font-family:var(--serif);font-style:italic;font-size:clamp(.88rem,2.8vw,1.2rem);
    color:var(--crema-tenue);margin-top:clamp(.6rem,2vh,1rem)}
  .rombo{display:flex;align-items:center;justify-content:center;gap:.85rem;
    margin:clamp(1rem,3vh,1.7rem) auto 0;max-width:15rem}
  .rombo::before,.rombo::after{content:'';flex:1;height:1px;
    background:linear-gradient(to right,transparent,var(--oro),transparent)}
  .rombo i{width:6px;height:6px;transform:rotate(45deg);background:var(--magenta)}

  .palco{position:relative;flex:1 1 auto;min-height:clamp(9rem,30vh,26rem);overflow:hidden;z-index:10}
  .ancora{position:absolute;left:50%;bottom:1.2%;transform:translateX(-50%);
    height:94%;aspect-ratio:1200/2886;max-width:calc(100vw - var(--margine)*1.6)}
  .coniglio{position:relative;width:100%;transform:translateY(108%);opacity:0;
    transform-origin:50% 100%;will-change:transform}
  .coniglio.arrivato{animation:sbuca 1650ms cubic-bezier(.24,.86,.36,1) both}
  @keyframes sbuca{
    0%{transform:translateY(108%) scale(1.05,.93);opacity:0}
    14%{opacity:1}
    52%{transform:translateY(-2.6%) scale(.965,1.05)}
    70%{transform:translateY(1.3%) scale(1.035,.955)}
    85%{transform:translateY(-.5%) scale(.99,1.012)}
    100%{transform:translateY(0) scale(1,1);opacity:1}}
  .coniglio::after{content:'';position:absolute;left:50%;bottom:-.8%;transform:translateX(-50%);
    width:96%;height:3.2%;border-radius:50%;z-index:-1;
    background:radial-gradient(ellipse at center,rgba(0,0,0,.5) 0%,transparent 68%)}
  .coniglio img{display:block;width:100%;height:auto;
    filter:drop-shadow(0 18px 34px rgba(0,0,0,.55));transition:opacity 180ms ease}

  /* La tela del filmato d'attesa. Le percentuali mappano il riquadro video
     sul riquadro dello sprite: misurate sul fotogramma 0, dove la posa del
     girato coincide con quella dello sprite (piedi a terra, stessa altezza).
     Scala uniforme: il video non viene mai stirato. */
  .tela{position:absolute;left:-20.85%;top:-6.31%;width:146.58%;height:108.35%;
    opacity:0;transition:opacity 180ms ease;pointer-events:none;
    filter:drop-shadow(0 18px 34px rgba(0,0,0,.55))}
  .coniglio.dalvivo .tela{opacity:1}
  .coniglio.dalvivo img{opacity:0}
  .coniglio.dalvivo .occhio,.coniglio.dalvivo .pupilla,.coniglio.dalvivo .bocca{opacity:0}
  .coniglio.dalvivo .palpebra{visibility:hidden}
  .respiro,.vita{position:relative;transform-origin:50% 100%}
  .respiro{animation:respira 6.4s ease-in-out infinite}
  .vita{transition:transform 90ms ease-out}
  @keyframes respira{
    0%{transform:scale(1,1) rotate(-.12deg)}
    25%{transform:scale(1.003,1.01) rotate(.05deg)}
    50%{transform:scale(1,1.002) rotate(.14deg)}
    75%{transform:scale(1.004,1.011) rotate(-.05deg)}
    100%{transform:scale(1,1) rotate(-.12deg)}}

  .occhio,.pupilla,.palpebra,.bocca{position:absolute;pointer-events:none}
  .occhio{border-radius:50%;transform:translate(-50%,-50%);transition:opacity 180ms ease}
  .pupilla{border-radius:50%;transform:translate(-50%,-50%);transition:transform 90ms linear,opacity 180ms ease}
  .pupilla::after{content:'';position:absolute;top:18%;left:22%;width:34%;height:34%;
    border-radius:50%;background:rgba(255,250,240,.92)}
  .palpebra{border-radius:50%;transition:transform 55ms ease-out,opacity 55ms ease-out;
    background:radial-gradient(circle at 50% 32%,#f8f6f4 52%,#e9e4e0 100%)}
  .bocca{transform:translate(-50%,-10%);border-radius:50% 50% 46% 46% / 30% 30% 70% 70%;
    filter:blur(1.1px);opacity:.92;transition:opacity 180ms ease;
    background:radial-gradient(ellipse at 50% 30%,#2A1216 0%,#47232B 55%,#6B3440 100%)}

  .fumetto{position:absolute;left:50%;top:0;transform:translateX(-50%) translateY(.5rem);
    width:fit-content;max-width:min(19.5rem,calc(100vw - var(--margine)*3));padding:.7rem 1.05rem;
    background:rgba(26,21,24,.55);-webkit-backdrop-filter:blur(18px) saturate(1.5);backdrop-filter:blur(18px) saturate(1.5);
    color:var(--crema);border:1px solid rgba(246,241,233,.14);border-radius:1rem;
    font-size:clamp(.82rem,2.6vw,.92rem);line-height:1.45;
    box-shadow:0 12px 36px rgba(0,0,0,.45);opacity:0;pointer-events:none;
    transition:opacity 420ms ease,transform 420ms cubic-bezier(.16,.9,.28,1);z-index:25}
  .fumetto.visibile{opacity:1;transform:translateX(-50%) translateY(0)}
  .pensiero{display:flex;align-items:center;justify-content:center;gap:.6rem;
    color:var(--crema-tenue);font-style:italic}
  .orologio{width:1.15rem;height:1.15rem;flex:none;transform-origin:50% 0;
    animation:oscilla 1.5s ease-in-out infinite}
  @keyframes oscilla{0%,100%{transform:rotate(-17deg)}50%{transform:rotate(17deg)}}

  .barra{position:relative;z-index:30;display:flex;flex-direction:column;align-items:center;gap:.8rem;
    padding:clamp(.7rem,2.5vh,1.3rem) var(--margine) clamp(1.2rem,4vh,2rem)}
  form{display:flex;gap:.5rem;width:min(34rem,100%)}
  input{flex:1;min-width:0;padding:.8rem 1rem;background:rgba(246,241,233,.07);
    -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(246,241,233,.14);border-radius:999px;outline:none;
    font:inherit;font-size:16px;color:var(--crema);
    transition:border-color .22s,background .22s}
  input::placeholder{color:var(--crema-fioca)}
  input:focus{border-color:var(--magenta);background:rgba(246,241,233,.09)}
  button{flex:none;width:3rem;height:3rem;display:grid;place-content:center;border-radius:50%;
    border:1px solid rgba(246,241,233,.14);background:rgba(246,241,233,.07);
    -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);
    color:var(--crema);font:inherit;cursor:pointer;transition:border-color .22s,transform .22s}
  button:hover:not(:disabled){border-color:var(--magenta);transform:translateY(-1px)}
  button:disabled{opacity:.4;cursor:default}
  button:focus-visible,input:focus-visible{outline:2px solid var(--magenta);outline-offset:2px}
  .continua{display:inline-flex;align-items:center;gap:.5rem;padding:.55rem 1.35rem;
    border:1px solid var(--magenta);border-radius:999px;color:var(--crema);
    text-decoration:none;font-size:.78rem;letter-spacing:.22em;text-transform:uppercase;
    transition:background .26s}
  .continua:hover{background:var(--magenta)}

  .porta{position:fixed;inset:0;z-index:60;display:grid;place-content:center;gap:1.4rem;
    padding:var(--margine);text-align:center;background:var(--nero)}
  .porta h2{font-family:var(--serif);font-weight:400;font-size:clamp(1.5rem,5vw,2.2rem)}
  .porta form{width:min(22rem,86vw)}
  .errore{color:var(--magenta);font-size:.85rem;min-height:1.2em}
  [hidden]{display:none!important}
</style>

<div class="porta" id="porta">
  <div class="rombo"><i></i></div>
  <h2>Serve una parola.</h2>
  <form id="fporta">
    <input id="parola" type="password" placeholder="…" autocomplete="off" aria-label="Parola d'accesso">
    <button type="submit" aria-label="Entra">→</button>
  </form>
  <p class="errore" id="eporta" role="status"></p>
</div>

<main class="scena" aria-hidden="true" id="scena">
  <div class="cornice sx"></div><div class="cornice dx"></div>
  <header class="hero">
    <p class="marchio">WO•MAN Parfume Store<span>Since 1989</span></p>
    <h1>Hai superato il <em>primo</em> passo.</h1>
    <p class="sotto">Il prossimo è una tua scelta.</p>
    <div class="rombo" aria-hidden="true"><i></i></div>
  </header>
  <div class="palco">
    <div class="fumetto" id="fumetto" role="status" aria-live="polite"></div>
    <div class="ancora"><div class="respiro"><div class="vita" id="vita">
      <div class="coniglio" id="coniglio">
        <img id="sprite" alt="" draggable="false" src="data:image/webp;base64,${sprite}">
        <canvas class="tela" id="tela" width="540" height="960" aria-hidden="true"></canvas>
      </div>
    </div></div></div>
  </div>
  <div class="barra">
    <form id="fchiedi">
      <input id="domanda" placeholder="Scrivimi qualcosa…" autocomplete="off" aria-label="Scrivi al Bianconiglio">
      <button type="submit" id="invia" aria-label="Invia">→</button>
    </form>
    <a class="continua" href="https://www.womanparfume.com/catalog" target="_blank" rel="noreferrer">Continua →</a>
  </div>
  <video id="filmato" muted playsinline loop preload="auto" aria-hidden="true"
    style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none"></video>
</main>

<script>
// ── Il personaggio: regole e battute (estratte da lib/repertorio.ts) ──────
const REGOLE = ${regole};
const FUORI_TEMA = ${fuori};
const BENVENUTO = ${JSON.stringify(benvenuto)};
const normalizza = (t) => t.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
function rispondi(domanda){
  const p = normalizza(domanda);
  for (const r of REGOLE) if (r.parole.some(w => p.includes(w))) return r;
  return FUORI_TEMA;
}

// ── Le voci recitate ──────────────────────────────────────────────────────
const VOCI = ${JSON.stringify(voci)};

// ── L'anatomia (percentuali misurate sui pixel dello sprite) ─────────────
const ANA = { occhi:[{x:30.8,y:37.9},{x:58.9,y:36.8}], rIride:5.9, rPupilla:3.6, corsa:1.6,
  bocca:{x:44.0,y:45.4,larghezza:10.0,aperta:3.8} };
const IRIDE='radial-gradient(circle at 50% 68%,#C68232 0%,#A0611F 42%,#602B10 76%,#45200C 100%)';

// ── La porta ──────────────────────────────────────────────────────────────
const SIGILLO='${SIGILLO}';
async function impronta(p){
  const d=new TextEncoder().encode('bianconiglio::sigillo::'+p);
  const h=await crypto.subtle.digest('SHA-256',d);
  return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
const $=(id)=>document.getElementById(id);
$('fporta').addEventListener('submit', async (e)=>{
  e.preventDefault();
  if (await impronta($('parola').value)===SIGILLO){
    $('porta').hidden=true; $('scena').removeAttribute('aria-hidden'); via();
  } else $('eporta').textContent='Non è questa la parola.';
});

// ── Il palco: occhi, palpebre, bocca ─────────────────────────────────────
const coniglio=$('coniglio');
let larghezza=0, sguardo=[[0,0],[0,0]];
const strato=[];
function costruisci(){
  larghezza=coniglio.clientWidth;
  const px=(p)=>larghezza*p/100;
  for (const [i,o] of ANA.occhi.entries()){
    const mk=(cls,dim,extra)=>{const d=document.createElement('div');d.className=cls;
      d.style.cssText='left:'+o.x+'%;top:'+o.y+'%;width:'+px(dim*2)+'px;height:'+px(dim*2)+'px;'+(extra||'');
      coniglio.appendChild(d);return d;};
    mk('occhio',ANA.rIride,'background:'+IRIDE);
    strato.push({pupilla:mk('pupilla',ANA.rPupilla,'background:#0A0503'),
                 palpebra:mk('palpebra',ANA.rIride*1.18,'opacity:0;transform:translate(-50%,-50%) scaleY(.02)'),o});
  }
  const b=document.createElement('div'); b.className='bocca'; b.id='bocca';
  b.style.cssText='left:'+ANA.bocca.x+'%;top:'+ANA.bocca.y+'%;width:'+px(ANA.bocca.larghezza)+'px;height:0px';
  coniglio.appendChild(b);
}
addEventListener('pointermove',segui,{passive:true});
addEventListener('pointerdown',segui,{passive:true});
function segui(ev){
  const r=coniglio.getBoundingClientRect(); if(!r.width) return;
  const corsa=r.width*ANA.corsa/100;
  for (const s of strato){
    const cx=r.left+r.width*s.o.x/100, cy=r.top+r.height*s.o.y/100;
    const dx=ev.clientX-cx, dy=ev.clientY-cy, d=Math.hypot(dx,dy)||1, q=Math.min(1,d/420);
    s.pupilla.style.transform='translate(calc(-50% + '+(dx/d*q*corsa)+'px), calc(-50% + '+(dy/d*q*corsa)+'px))';
  }
}
function batti(){
  for (const s of strato){ s.palpebra.style.opacity=1; s.palpebra.style.transform='translate(-50%,-50%) scaleY(1)'; }
  setTimeout(()=>{ for (const s of strato){ s.palpebra.style.opacity=0; s.palpebra.style.transform='translate(-50%,-50%) scaleY(.02)'; } },140);
  setTimeout(batti, 3000+Math.random()*3000);
}

// ── Il filmato d'attesa ───────────────────────────────────────────────────
// Il video «impilato» vive in un elemento invisibile; un canvas WebGL prende
// ogni fotogramma, legge il colore dalla metà alta e la trasparenza dalla
// metà bassa, e dipinge il coniglio vivo senza fondo. Quando il coniglio
// parla si torna allo sprite (che ha occhi e bocca comandabili) con una
// dissolvenza breve; il video intanto riparte dal fotogramma 0, la cui posa
// coincide con lo sprite, così il rientro non salta.
const FILMATI={
  'video/mp4; codecs="avc1.4d401f"':'${filmatoMp4}',
  'video/webm; codecs="vp9"':'${filmatoWebm}',
};
const filmatoEl=document.getElementById('filmato');
let gl=null, vivo=false, telaPronta=false, filmRaf=0;
const fermo=matchMedia('(prefers-reduced-motion: reduce)').matches;
function preparaFilmato(){
  try{
    const tipo=Object.keys(FILMATI).find((t)=>filmatoEl.canPlayType(t));
    if(!tipo) return;
    const bin=atob(FILMATI[tipo]); const buf=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) buf[i]=bin.charCodeAt(i);
    filmatoEl.src=URL.createObjectURL(new Blob([buf],{type:tipo.split(';')[0]}));
    const tela=document.getElementById('tela');
    gl=tela.getContext('webgl',{premultipliedAlpha:true,alpha:true});
    if(!gl) return;
    const mk=(tipo,src)=>{const s=gl.createShader(tipo);gl.shaderSource(s,src);gl.compileShader(s);return s;};
    const pr=gl.createProgram();
    gl.attachShader(pr,mk(gl.VERTEX_SHADER,
      'attribute vec2 p;varying vec2 t;void main(){t=vec2((p.x+1.)/2.,(1.-p.y)/2.);gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(pr,mk(gl.FRAGMENT_SHADER,
      'precision mediump float;varying vec2 t;uniform sampler2D u;void main(){'+
      'vec3 c=texture2D(u,vec2(t.x,t.y*.5)).rgb;'+
      'float a=min(1.,texture2D(u,vec2(t.x,t.y*.5+.5)).r*1.02);'+
      'gl_FragColor=vec4(min(c,vec3(a)),a);}'));
    gl.linkProgram(pr); gl.useProgram(pr);
    const b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(pr,'p');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const tx=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,tx);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  }catch(e){ gl=null; }
}
function dipingi(){
  if(!gl||filmatoEl.readyState<2) return;
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,filmatoEl);
  gl.drawArrays(gl.TRIANGLES,0,3);
  telaPronta=true;
}
function giraFilm(){ dipingi(); if(vivo) filmRaf=requestAnimationFrame(giraFilm); }
function avviaIdle(){
  if(!gl||vivo||fermo) return;
  vivo=true;
  filmatoEl.play().catch(()=>{});
  giraFilm();
  (function attendi(){ if(!vivo) return;
    if(telaPronta) coniglio.classList.add('dalvivo');
    else requestAnimationFrame(attendi); })();
}
function fermaIdle(){
  coniglio.classList.remove('dalvivo');
  if(!vivo) return;
  vivo=false; cancelAnimationFrame(filmRaf);
  filmatoEl.pause();
  // Riporta il nastro all'inizio: al prossimo giro si riparte dalla posa
  // che coincide con lo sprite.
  filmatoEl.addEventListener('seeked',()=>dipingi(),{once:true});
  try{ filmatoEl.currentTime=0; }catch(e){}
}

// ── La voce e la bocca ────────────────────────────────────────────────────
let ctx=null, analisi=null, audioEl=null, rafId=0;
addEventListener('pointerdown',()=>{ if(!ctx){ const C=window.AudioContext||window.webkitAudioContext; if(C) ctx=new C(); } ctx&&ctx.resume().catch(()=>{}); },{capture:true});
function apriBocca(v){
  const b=$('bocca'); if(!b) return;
  const px=larghezza*(ANA.bocca.aperta*Math.pow(Math.min(1,Math.max(0,v)),0.7))/100;
  b.style.height=px+'px';
  $('vita').style.transform='translateY('+(-v*.9)+'%) rotate('+(v*.5)+'deg) scale('+(1+v*.012)+','+(1-v*.006)+')';
}
function misura(){
  const camp=new Uint8Array(analisi.fftSize); let env=0;
  (function passo(){
    analisi.getByteTimeDomainData(camp);
    let s=0; for(let i=0;i<camp.length;i++){const d=(camp[i]-128)/128; s+=d*d;}
    const v=Math.min(1,Math.sqrt(s/camp.length)*4.2);
    env=v>env?v:env*.86; apriBocca(env);
    rafId=requestAnimationFrame(passo);
  })();
}
function ondaFinta(){
  const t0=performance.now();
  (function passo(){
    const t=(performance.now()-t0)/1000;
    apriBocca(Math.max(0,Math.min(1,(0.5+0.5*Math.sin(t*11.3)*Math.sin(t*4.1+1.2)*Math.sin(t*2.3+.4))*.85)));
    rafId=requestAnimationFrame(passo);
  })();
}
function zitto(){ cancelAnimationFrame(rafId); apriBocca(0); }
async function di(id,testo){
  zitto();
  fermaIdle(); // dal filmato allo sprite: la bocca ora la comandiamo noi
  try{
    if (VOCI[id] && ctx){
      if(!audioEl){ audioEl=new Audio();
        const s=ctx.createMediaElementSource(audioEl);
        analisi=ctx.createAnalyser(); analisi.fftSize=1024; analisi.smoothingTimeConstant=.65;
        s.connect(analisi); analisi.connect(ctx.destination); }
      audioEl.src='data:audio/mpeg;base64,'+VOCI[id];
      await new Promise((fine)=>{ audioEl.onended=fine; audioEl.onerror=fine;
        audioEl.play().then(misura).catch(fine); });
    } else if ('speechSynthesis' in window){
      const u=new SpeechSynthesisUtterance(testo); u.lang='it-IT'; u.pitch=1.75; u.rate=1.06;
      ondaFinta();
      await new Promise((fine)=>{ const t=setTimeout(fine,Math.max(4000,testo.length*110));
        u.onend=u.onerror=()=>{clearTimeout(t);fine();}; speechSynthesis.speak(u); });
    }
  } finally { zitto(); avviaIdle(); }
}

// ── La regia ─────────────────────────────────────────────────────────────
const fumetto=$('fumetto');
function mostra(html){ fumetto.innerHTML=html; fumetto.classList.add('visibile'); }
const TICTAC='<p class="pensiero"><svg class="orologio" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5 V4" stroke="#C9A45C" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="14" r="8" fill="none" stroke="#C9A45C" stroke-width="1.6"/><circle cx="12" cy="14" r="6.2" fill="rgba(201,164,92,.14)"/><text x="12" y="17.4" text-anchor="middle" font-size="8" font-family="Georgia,serif" fill="#C9A45C">A</text></svg>tic tac…</p>';
function via(){
  setTimeout(()=>{
    coniglio.classList.add('arrivato');
    setTimeout(()=>{ costruisci(); batti(); avviaIdle(); },1700);
    setTimeout(()=>{ mostra('<p>'+BENVENUTO+'</p>'); di('benvenuto',BENVENUTO).catch(()=>{}); },2400);
  },900);
}
preparaFilmato();
let occupato=false;
$('fchiedi').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const q=$('domanda').value.trim(); if(!q||occupato) return;
  occupato=true; $('domanda').value=''; $('domanda').disabled=true; $('invia').disabled=true;
  mostra(TICTAC);
  await new Promise(r=>setTimeout(r,650+Math.random()*550));
  const b=rispondi(q);
  mostra('<p>'+b.testo+'</p>');
  await di(b.id,b.testo);
  occupato=false; $('domanda').disabled=false; $('invia').disabled=false; $('domanda').focus();
});
</script>`;

writeFileSync(OUT, html);
console.log('scritto', OUT, Math.round(html.length / 1024 / 1024 * 10) / 10, 'MB');
