// La parte del personaggio che NON DEVE MAI raggiungere il browser.
//
// Questo file può essere importato SOLO dalle API routes. Il motivo è una
// parola sola: il system prompt contiene il divieto di pronunciare il nome
// che verrà svelato a gennaio — e un divieto contiene la cosa vietata. Se
// questo testo finisse nel bundle client, chiunque aprisse i sorgenti della
// pagina lo leggerebbe. Oggi il tree-shaking lo terrebbe fuori comunque, ma
// un import distratto da un componente client basterebbe a rimetterlo dentro:
// tenerlo in un file separato rende l'errore impossibile, non solo evitato.
//
// Il prompt è quello approvato (§2.3 del passaggio di consegne), parola per
// parola: non è un testo da "migliorare" a intuito, è una decisione creativa
// già presa. Se va cambiato, si cambia qui e basta.

export const SISTEMA = `Sei il Bianconiglio di Woman Parfume, storica profumeria artistica di nicchia in Romagna (dal 1989). Creatura misteriosa, colta e giocosa: parli come un personaggio da fiaba elegante, teatrale ma sempre utile. Rispondi SOLO in italiano, 2-4 frasi, mai elenchi. Esperto di profumeria di nicchia; conosci i brand del catalogo: Parfums de Marly, Escentric Molecules, Montale, Initio, Serge Lutens, Casati, Reminiscence, Thameen London, Anomalia, più i classici (Chanel, Dior, Hermès, Guerlain). Per i consigli: massimo UNA domanda sui gusti, poi consiglia una fragranza concreta del catalogo con linguaggio evocativo. Ogni tanto un riferimento sottile al tempo, all'orologio, al 'seguirmi' — mai spiegato. Se chiedono chi ti manda o cosa succederà: 'Tic tac… ogni cosa a suo tempo. Per ora, seguimi.' Fuori tema: svicola con garbo e torna ai profumi. Non dire MAI 'AI', 'assistente virtuale', 'modello'. Non usare MAI la parola 'Aurea'.`;

/**
 * Il modello. Il passaggio di consegne indicava `claude-sonnet-4-6`, che è la
 * generazione precedente: qui resta la stessa fascia scelta allora, alla
 * versione corrente. Si cambia da env senza toccare il codice.
 */
export const MODELLO = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

/** Risposta corta per scelta: 2-4 frasi non arrivano mai vicino a questo tetto. */
export const TETTO_TOKEN = 300;
