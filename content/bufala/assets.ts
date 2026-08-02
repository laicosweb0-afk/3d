// Gli asset visivi del viaggio.
//
// ⚠️ PROVVISORIO — DA LOCALIZZARE PRIMA DELLA PUBBLICAZIONE.
// Le immagini puntano al CDN di Higgsfield perché la sessione che le ha
// generate non poteva scaricarle (la policy di rete blocca quel dominio).
// Funzionano nel browser, ma prima di andare online vanno scaricate e
// messe in `public/assets/bufala/`, sostituendo qui gli URL con i percorsi
// locali: un sito di produzione non deve dipendere dal CDN di un fornitore
// di generazione, che può cambiare o scadere.
//
// Sostituzione: scaricare i file, metterli in public/assets/bufala/ con i
// nomi già usati come chiave qui sotto, e cambiare BASE in '/assets/bufala'.

const CDN =
  'https://d8j0ntlcm91z4.cloudfront.net/user_3EzPcrBGp32RbeIR79HWLyATCBp';

export interface Asset {
  src: string;
  /** Descrizione per chi non vede l'immagine. Il viaggio è decorativo — il
   *  contenuto vero sta nei titoli — ma le sezioni sotto no. */
  alt: string;
}

export const immagini = {
  /** Macro estrema, superficie illeggibile: l'attacco. */
  macro: {
    src: `${CDN}/hf_20260802_191801_ac2d8436-c2d0-4958-a4ee-d44d77f66614.png`,
    alt: 'La superficie bagnata della mozzarella, in macro',
  },
  /** La forma intera sull'ardesia. */
  intera: {
    src: `${CDN}/hf_20260802_191808_f52a71dc-7efe-4fef-a399-2785e9d51d1e.png`,
    alt: 'Una mozzarella di bufala intera su una lastra di ardesia',
  },
  /** Le mani che la presentano. */
  mani: {
    src: `${CDN}/hf_20260802_191834_aabc7899-8571-46ff-93ac-832e06b009ac.png`,
    alt: 'Due mani presentano una mozzarella di bufala',
  },
  /** Il taglio: il cuore che si apre. Il culmine del viaggio. */
  taglio: {
    src: `${CDN}/hf_20260802_191818_7da50b9b-4554-4f36-b64e-ab828f9d2fe4.png`,
    alt: 'Una mozzarella di bufala tagliata, con il cuore filante e il latte',
  },
  /** Gli altri prodotti del banco. */
  famiglia: {
    src: `${CDN}/hf_20260802_191844_63c3f9a6-268e-4d2b-ba4b-670b284d5fa8.png`,
    alt: 'Treccia, bocconcini, burrata e ricotta di bufala su ardesia',
  },
} as const satisfies Record<string, Asset>;

/** Il modello 3D della mozzarella, generato dall'immagine di riferimento.
 *  Non ancora in uso: va prima scaricato, ottimizzato e messo in scena.
 *  Tenuto qui perché è l'asset su cui si costruirà la versione navigabile. */
export const modello3D =
  'https://d3u0tzju9qaucj.cloudfront.net/7d051b5a-7bfe-49fe-a484-24e7b3a9458a/90720880-daa4-499e-8727-4d6905405586.glb';
