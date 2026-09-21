-- ===========================================================================
-- 0004 — Quello che serve per usarlo davvero tutti i giorni.
--
--   1. i ruoli: chi lavora i contatti e chi tiene le chiavi di casa
--   2. le impostazioni: le soglie escono dal codice ed entrano nel database
--   3. il preventivo: numero, scadenza, com'è finito
--   4. le card NFC: quale card ha portato quella persona
--   5. i dati di esempio: marcati, così si cancellano in un colpo solo
--
-- Come le altre: si aggiunge, non si sostituisce. Chi ha già dati in mano non
-- perde niente e non deve fare nessuna conversione a mano.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. RUOLI
-- ---------------------------------------------------------------------------
do $$ begin
  create type ruolo_utente as enum ('admin', 'operatore');
exception when duplicate_object then null; end $$;

alter table profili add column if not exists ruolo ruolo_utente not null default 'operatore';

-- Il primo profilo che esiste è l'amministratore: senza questo, un CRM appena
-- installato non avrebbe nessuno che può cambiare le impostazioni, e per
-- uscirne servirebbe entrare nel database.
update profili
   set ruolo = 'admin'
 where id = (select id from profili order by creato_il limit 1)
   and not exists (select 1 from profili where ruolo = 'admin');

-- ---------------------------------------------------------------------------
-- 2. IMPOSTAZIONI
-- ---------------------------------------------------------------------------
-- Una riga sola, tutta dentro un jsonb. Non è pigrizia: queste impostazioni
-- si leggono tutte insieme a ogni pagina e non si cercano mai per campo,
-- quindi una tabella con venti colonne sarebbe venti colonne da migrare ogni
-- volta che se ne aggiunge una. Il codice le fonde con i valori predefiniti
-- (lib/dominio/impostazioni.ts), quindi una chiave mancante non rompe niente.
create table if not exists impostazioni (
  chiave text primary key,
  valore jsonb not null default '{}'::jsonb,
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references profili(id) on delete set null
);

insert into impostazioni (chiave, valore)
values ('crm', '{}'::jsonb)
on conflict (chiave) do nothing;

drop trigger if exists tocca_impostazioni on impostazioni;
create trigger tocca_impostazioni before update on impostazioni
  for each row execute function tocca_aggiornato_il();

-- ---------------------------------------------------------------------------
-- 3. IL PREVENTIVO, SOPRA L'OPPORTUNITÀ
-- ---------------------------------------------------------------------------
-- Non una tabella a parte: un lavoro ha un preventivo corrente, e tenere gli
-- importi in due posti vuol dire prima o poi due importi diversi. La storia
-- delle revisioni sta già negli eventi.
--
-- «Scaduto» non è fra gli stati: si calcola da scadenza_preventivo. Uno stato
-- salvato invecchia da solo e servirebbe qualcosa che lo aggiorni ogni notte.
do $$ begin
  create type stato_preventivo as enum ('nessuno', 'bozza', 'inviato', 'accettato', 'rifiutato');
exception when duplicate_object then null; end $$;

alter table opportunita
  add column if not exists numero_preventivo text,
  add column if not exists scadenza_preventivo date,
  add column if not exists stato_preventivo stato_preventivo not null default 'nessuno';

-- Chi ha già un preventivo mandato non deve risultare senza: si allinea lo
-- stato a quello che dicono i dati già presenti.
update opportunita
   set stato_preventivo = 'inviato'
 where stato_preventivo = 'nessuno'
   and data_preventivo is not null;

update opportunita set stato_preventivo = 'accettato' where stato = 'vinta' and data_preventivo is not null;
update opportunita set stato_preventivo = 'rifiutato' where stato = 'persa' and data_preventivo is not null;

create index if not exists opportunita_stato_preventivo_idx
  on opportunita (stato_preventivo) where stato_preventivo <> 'nessuno';

-- ---------------------------------------------------------------------------
-- 4. CARD NFC
-- ---------------------------------------------------------------------------
-- Con una card sola la domanda «quale ha funzionato» non esiste. Con quattro
-- sì, ed è la domanda che decide se comprarne altre.
create table if not exists card_nfc (
  id uuid primary key default gen_random_uuid(),
  codice text not null unique,             -- quello che finisce in /nfc/<codice>
  nome text not null,
  luogo text,
  campagna_id uuid references campagne(id) on delete set null,
  destinazione text,                       -- dove manda; vuoto = pagina del Club
  attiva boolean not null default true,
  -- Un tocco non è un contatto: tanta gente appoggia il telefono e se ne va.
  tocchi integer not null default 0,
  ultimo_tocco_il timestamptz,
  note text,
  demo boolean not null default false,
  creata_il timestamptz not null default now()
);

create index if not exists card_nfc_codice_idx on card_nfc (codice);

-- Il tocco si conta con una funzione, non con una select seguita da update:
-- due persone che toccano due card nello stesso istante non devono far
-- perdere un conteggio.
create or replace function tocca_card(p_codice text)
returns void
language sql
security definer
set search_path = public
as $$
  update card_nfc
     set tocchi = tocchi + 1,
         ultimo_tocco_il = now()
   where codice = p_codice and attiva;
$$;

-- ---------------------------------------------------------------------------
-- 5. DATI DI ESEMPIO, MARCATI
-- ---------------------------------------------------------------------------
-- La richiesta era: «i dati demo devono essere facilmente eliminabili».
-- Una colonna lo rende vero — cancellarli è una riga, non una caccia al
-- tesoro fra nomi che sembrano finti.
alter table contatti add column if not exists demo boolean not null default false;
alter table campagne add column if not exists demo boolean not null default false;

create index if not exists contatti_demo_idx on contatti (demo) where demo;
create index if not exists campagne_demo_idx on campagne (demo) where demo;

-- Tutto il resto (opportunità, azioni, eventi, conversazioni, identità) pende
-- dal contatto con on delete cascade: cancellato il contatto demo, sparisce
-- anche la sua storia. Niente orfani.

-- ---------------------------------------------------------------------------
-- 6. REGOLE DI RIGA
-- ---------------------------------------------------------------------------
alter table impostazioni enable row level security;
alter table card_nfc enable row level security;

-- Le impostazioni le legge chiunque sia entrato (servono a ogni pagina), le
-- scrive solo un amministratore. Il controllo sta qui **e** nelle azioni sul
-- server: nascondere un bottone non è una protezione.
drop policy if exists "impostazioni lette da chi è entrato" on impostazioni;
create policy "impostazioni lette da chi è entrato" on impostazioni
  for select to authenticated using (true);

drop policy if exists "impostazioni scritte dagli admin" on impostazioni;
create policy "impostazioni scritte dagli admin" on impostazioni
  for all to authenticated
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'))
  with check (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));

drop policy if exists "card lette da chi è entrato" on card_nfc;
create policy "card lette da chi è entrato" on card_nfc
  for select to authenticated using (true);

drop policy if exists "card gestite dagli admin" on card_nfc;
create policy "card gestite dagli admin" on card_nfc
  for all to authenticated
  using (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'))
  with check (exists (select 1 from profili p where p.id = auth.uid() and p.ruolo = 'admin'));

-- La pagina /nfc/<codice> risponde a chi non è entrato — è una card in mano a
-- un cliente — quindi legge con la chiave di servizio, che salta le regole di
-- riga. Non le si apre in lettura pubblica: l'elenco delle card dice dove
-- sono e dentro quale campagna, e non riguarda nessuno fuori da Rama.
