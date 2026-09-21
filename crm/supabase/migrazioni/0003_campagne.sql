-- CRM Rama — le campagne diventano il punto di partenza.
-- Si esegue DOPO 0002_crm.sql.
--
-- Il ragionamento: una persona non «arriva da Instagram», arriva da UNA
-- CAMPAGNA che gira su Instagram. Finché la campagna non è un oggetto del
-- CRM, la domanda «questa campagna cosa ha prodotto?» non ha risposta.
--
--   CAMPAGNA → CONVERSAZIONE → CONTATTO → OPPORTUNITÀ → PREVENTIVO → ORDINE
--
-- Tre cose nuove:
--   • CAMPAGNE      — con la spesa, che resta NULL finché non la sappiamo
--   • CONVERSAZIONI — una per canale, tutte appese alla stessa persona
--   • IDENTITÀ      — il modo per non avere «Giulia 1» e «Giulia 2»

-- ---------------------------------------------------------------------------
-- Vocabolari
-- ---------------------------------------------------------------------------
create type piattaforma_campagna as enum ('meta', 'google', 'tiktok', 'altro');

create type stato_campagna as enum ('bozza', 'attiva', 'in_pausa', 'conclusa');

-- Dove si svolge la conversazione. Non è la fonte del contatto: una persona
-- arrivata da una campagna Meta può scrivere su WhatsApp.
create type canale_conversazione as enum (
  'messenger', 'whatsapp', 'instagram', 'email', 'telefono', 'sito', 'altro'
);

create type stato_conversazione as enum ('aperta', 'gestita', 'chiusa');

-- Le chiavi con cui riconosciamo una persona. Messenger e Instagram danno
-- identificativi che valgono solo dentro Rama; WhatsApp dà il numero, che è
-- l'unica chiave che attraversa i canali.
create type tipo_identita as enum (
  'messenger_psid', 'instagram_igsid', 'whatsapp_telefono',
  'email', 'telefono', 'esterna'
);

-- Messenger mancava fra i tipi di evento.
alter type tipo_evento add value if not exists 'messenger';
alter type tipo_evento add value if not exists 'messaggio';

-- ---------------------------------------------------------------------------
-- CAMPAGNE
-- ---------------------------------------------------------------------------
create table campagne (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  piattaforma piattaforma_campagna not null default 'meta',
  obiettivo text,
  -- Dove porta la campagna: è questo che decide quale adattatore la riceverà.
  canale_ingresso canale_conversazione not null default 'messenger',
  stato stato_campagna not null default 'attiva',
  data_inizio date,
  data_fine date,
  -- Budget e spesa restano NULL finché non li sappiamo: nel CRM si legge
  -- «N/D», che è diverso da «0 €».
  budget numeric(10, 2),
  spesa numeric(10, 2),
  spesa_aggiornata_il timestamptz,

  -- Gli agganci al mondo Meta. Si riempiono a mano adesso, dall'API domani.
  id_esterno text,              -- campaign id della piattaforma
  adset_id text,
  ad_id text,
  parametro_ref text,           -- il ref= degli annunci click-to-Messenger
  utm_source text,
  utm_medium text,
  utm_campaign text,
  landing text,

  note text,
  creata_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create index campagne_stato on campagne (stato, creata_il desc);
create unique index campagne_id_esterno on campagne (id_esterno) where id_esterno is not null;
create unique index campagne_ad_id on campagne (ad_id) where ad_id is not null;
create unique index campagne_ref on campagne (parametro_ref) where parametro_ref is not null;

create trigger campagne_aggiornato_il
  before update on campagne
  for each row execute function tocca_aggiornato_il();

-- Ogni contatto può venire da una campagna. Resta NULL per chi entra in
-- negozio o dal passaparola: non si inventa un'attribuzione che non c'è.
alter table contatti add column campagna_id uuid references campagne (id) on delete set null;
create index contatti_campagna on contatti (campagna_id);

-- ---------------------------------------------------------------------------
-- IDENTITÀ — una persona, tanti modi di riconoscerla
-- ---------------------------------------------------------------------------
create table identita (
  id uuid primary key default gen_random_uuid(),
  contatto_id uuid not null references contatti (id) on delete cascade,
  tipo tipo_identita not null,
  valore text not null,
  -- Falso quando l'abbiamo dedotta noi (stesso nome, stessa città) invece di
  -- riceverla da un canale: serve a non fidarsi ciecamente di un'unione.
  verificata boolean not null default true,
  creata_il timestamptz not null default now()
);

-- La stessa chiave non può appartenere a due persone: è questo vincolo che
-- impedisce «Giulia 1» e «Giulia 2».
create unique index identita_chiave on identita (tipo, valore);
create index identita_contatto on identita (contatto_id);

-- Le chiavi che già conosciamo diventano identità, così il riconoscimento
-- parte con quello che c'è.
insert into identita (contatto_id, tipo, valore)
select id, 'email', lower(email) from contatti where email is not null
on conflict do nothing;

insert into identita (contatto_id, tipo, valore)
select id, 'telefono', regexp_replace(telefono, '[^0-9+]', '', 'g')
from contatti where telefono is not null and length(regexp_replace(telefono, '[^0-9+]', '', 'g')) >= 8
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- CONVERSAZIONI
-- ---------------------------------------------------------------------------
create table conversazioni (
  id uuid primary key default gen_random_uuid(),
  contatto_id uuid not null references contatti (id) on delete cascade,
  campagna_id uuid references campagne (id) on delete set null,
  canale canale_conversazione not null,
  -- L'identificativo del filo dalla parte di Meta (thread/PSID/numero):
  -- serve a ritrovare la stessa conversazione al messaggio dopo.
  id_esterno text,
  stato stato_conversazione not null default 'aperta',
  assegnata_a uuid references profili (id) on delete set null,
  non_letta boolean not null default true,
  primo_messaggio_il timestamptz not null default now(),
  ultimo_messaggio_il timestamptz not null default now(),
  ultimo_messaggio_testo text,
  -- Quello che il canale ci ha detto sull'annuncio: ad_id, ctwa_clid, ref…
  riferimento jsonb,
  creata_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now()
);

create index conversazioni_contatto on conversazioni (contatto_id, ultimo_messaggio_il desc);
create index conversazioni_aperte on conversazioni (stato, ultimo_messaggio_il desc);
create unique index conversazioni_esterne on conversazioni (canale, id_esterno) where id_esterno is not null;

create trigger conversazioni_aggiornato_il
  before update on conversazioni
  for each row execute function tocca_aggiornato_il();

-- Un evento può nascere dentro una conversazione: così la timeline della
-- persona resta una sola, anche con quattro canali aperti.
alter table eventi add column conversazione_id uuid references conversazioni (id) on delete set null;
create index eventi_conversazione on eventi (conversazione_id, quando desc);

-- ---------------------------------------------------------------------------
-- Ingressi grezzi: quello che arriva dai webhook, prima di essere lavorato.
-- Se un adattatore sbaglia la mappatura, il dato non è perso: si rilavora.
-- ---------------------------------------------------------------------------
create table ingressi_grezzi (
  id bigserial primary key,
  canale text not null,
  payload jsonb not null,
  esito text,                     -- null = ancora da lavorare
  contatto_id uuid references contatti (id) on delete set null,
  errore text,
  ricevuto_il timestamptz not null default now(),
  lavorato_il timestamptz
);

create index ingressi_da_lavorare on ingressi_grezzi (esito, ricevuto_il) where esito is null;

-- ---------------------------------------------------------------------------
-- Regole di riga
-- ---------------------------------------------------------------------------
alter table campagne enable row level security;
alter table identita enable row level security;
alter table conversazioni enable row level security;
alter table ingressi_grezzi enable row level security;

create policy "campagne: tutto agli autenticati" on campagne for all to authenticated using (true) with check (true);
create policy "identita: tutto agli autenticati" on identita for all to authenticated using (true) with check (true);
create policy "conversazioni: tutto agli autenticati" on conversazioni for all to authenticated using (true) with check (true);
-- ingressi_grezzi: nessuna policy. Ci scrive solo la chiave di servizio,
-- cioè l'endpoint pubblico che riceve i webhook.
