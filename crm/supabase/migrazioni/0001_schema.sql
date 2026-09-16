-- CRM Rama Ceramiche — schema iniziale.
-- Da eseguire una volta sola nel progetto Supabase: SQL Editor → incolla → Run.
-- Istruzioni complete in CRM-RAMA.md.

-- ---------------------------------------------------------------------------
-- Vocabolari chiusi: valori scritti male non entrano nel database.
-- ---------------------------------------------------------------------------
create type provenienza_contatto as enum ('card_nfc', 'manuale', 'sito');
create type stato_contatto as enum ('nuovo', 'contattato', 'in_showroom', 'preventivo', 'cliente', 'perso');
create type ruolo_utente as enum ('titolare', 'collaboratore');
create type tipo_attivita as enum ('chiamata', 'email', 'appuntamento', 'altro');

-- ---------------------------------------------------------------------------
-- Chi lavora in showroom. Una riga per ogni utente di Supabase Auth.
-- ---------------------------------------------------------------------------
create table profili (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  ruolo ruolo_utente not null default 'collaboratore',
  attivo boolean not null default true,
  creato_il timestamptz not null default now()
);

-- L'account lo crei invitando la persona da Supabase (registrazione pubblica
-- disattivata): il profilo nasce da sé al primo invito.
create function crea_profilo_per_utente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profili (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger profilo_al_nuovo_utente
  after insert on auth.users
  for each row execute function crea_profilo_per_utente();

-- ---------------------------------------------------------------------------
-- I contatti: il cuore del CRM.
-- ---------------------------------------------------------------------------
create table contatti (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  nome text not null,
  email text,
  telefono text,
  provenienza provenienza_contatto not null default 'manuale',
  stato stato_contatto not null default 'nuovo',
  assegnato_a uuid references profili (id) on delete set null,
  consenso_marketing boolean not null default false,
  consenso_il timestamptz,
  tag text[] not null default '{}',
  ultimo_contatto_il timestamptz
);

-- Stessa email = stessa persona: il secondo tocco sulla card aggiorna, non
-- duplica. L'indice è su lower(email) perché Mario@ e mario@ sono la stessa.
create unique index contatti_email_unica on contatti (lower(email)) where email is not null;
create index contatti_stato on contatti (stato, creato_il desc);

create function tocca_aggiornato_il()
returns trigger language plpgsql as $$
begin
  new.aggiornato_il = now();
  return new;
end;
$$;

create trigger contatti_aggiornato_il
  before update on contatti
  for each row execute function tocca_aggiornato_il();

-- ---------------------------------------------------------------------------
-- Il passaggio dalla card NFC: un contatto può tornare più volte, ogni giro
-- lascia la sua riga. Il codice è unico per costruzione.
-- ---------------------------------------------------------------------------
create table lead_card (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  contatto_id uuid not null references contatti (id) on delete cascade,
  progetto text not null,
  stile text not null,
  consegna text not null,
  codice text not null unique,
  credito_eur integer not null default 70,
  scadenza date not null,
  riscattato_il timestamptz,
  riscattato_da uuid references profili (id) on delete set null,
  email_inviata_il timestamptz,
  -- Identificativo generato dal browser: se la card ritenta l'invio, la
  -- seconda chiamata ritrova questa riga invece di battere un altro codice.
  client_token text unique
);

create index lead_card_contatto on lead_card (contatto_id, creato_il desc);

-- ---------------------------------------------------------------------------
-- Note e promemoria.
-- ---------------------------------------------------------------------------
create table note (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  contatto_id uuid not null references contatti (id) on delete cascade,
  autore uuid references profili (id) on delete set null,
  testo text not null
);

create index note_contatto on note (contatto_id, creato_il desc);

create table attivita (
  id uuid primary key default gen_random_uuid(),
  creato_il timestamptz not null default now(),
  contatto_id uuid references contatti (id) on delete cascade,
  assegnato_a uuid references profili (id) on delete set null,
  titolo text not null,
  tipo tipo_attivita not null default 'chiamata',
  scadenza timestamptz not null default now(),
  fatta_il timestamptz
);

create index attivita_da_fare on attivita (fatta_il, scadenza);

-- ---------------------------------------------------------------------------
-- Freno anti-abuso di /api/lead. Dell'IP si salva solo l'impronta: con il pepe
-- lato server non si torna all'indirizzo, e serve solo a contare.
-- ---------------------------------------------------------------------------
create table lead_richieste (
  id bigserial primary key,
  ip_hash text not null,
  creato_il timestamptz not null default now()
);

create index lead_richieste_finestra on lead_richieste (ip_hash, creato_il desc);

-- ---------------------------------------------------------------------------
-- Regole di riga. Fuori dal login non si legge e non si scrive niente:
-- l'unico ingresso pubblico è /api/lead, che passa dalla chiave di servizio
-- (la sola che scavalca queste regole) e vive solo sul server.
-- ---------------------------------------------------------------------------
alter table profili enable row level security;
alter table contatti enable row level security;
alter table lead_card enable row level security;
alter table note enable row level security;
alter table attivita enable row level security;
alter table lead_richieste enable row level security;

create policy "profili: lettura autenticati" on profili for select to authenticated using (true);
create policy "profili: aggiorna sé stesso" on profili for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "contatti: tutto agli autenticati" on contatti for all to authenticated using (true) with check (true);
create policy "lead_card: tutto agli autenticati" on lead_card for all to authenticated using (true) with check (true);
create policy "note: tutto agli autenticati" on note for all to authenticated using (true) with check (true);
create policy "attivita: tutto agli autenticati" on attivita for all to authenticated using (true) with check (true);
-- lead_richieste: nessuna policy. Ci scrive solo la chiave di servizio.
