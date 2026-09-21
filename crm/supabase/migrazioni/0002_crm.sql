-- CRM Rama — da "registro dei lead della card" a CRM commerciale.
-- Si esegue DOPO 0001_schema.sql, sullo stesso progetto: niente viene buttato,
-- i contatti e i crediti della card restano dove sono.
--
-- Cosa cambia:
--   • il contatto guadagna cognome, fonte (da dove arriva) e fase (dove si
--     trova nel percorso): due cose diverse, prima confuse in una sola;
--   • le "attività" diventano AZIONI — cosa va fatto, quando, con che priorità;
--   • nasce la timeline (EVENTI): cosa è successo, in ordine, senza perdere niente;
--   • nasce l'OPPORTUNITÀ: il lavoro di cui si parla, con il suo valore.

-- ---------------------------------------------------------------------------
-- Vocabolari nuovi
-- ---------------------------------------------------------------------------
create type fonte_contatto as enum (
  'instagram', 'facebook', 'google', 'sito', 'whatsapp',
  'showroom', 'card_nfc', 'campagna', 'passaparola', 'altro'
);

create type fase_contatto as enum (
  'nuovo', 'da_contattare', 'contattato', 'qualificato', 'appuntamento',
  'preventivo', 'follow_up', 'ordine', 'cliente', 'perso'
);

create type tipo_azione as enum (
  'rispondere', 'telefonare', 'richiamare', 'inviare_preventivo', 'inviare_campioni',
  'fissare_appuntamento', 'confermare_misure', 'follow_up', 'confermare_ordine', 'altro'
);

create type priorita_azione as enum ('urgente', 'da_fare', 'normale');

create type tipo_evento as enum (
  'lead_ricevuto', 'telefonata', 'whatsapp', 'instagram', 'email', 'appuntamento',
  'visita_showroom', 'preventivo_inviato', 'campione_consegnato', 'campione_reso',
  'follow_up', 'ordine', 'cambio_fase', 'nota'
);

create type interesse_lavoro as enum (
  'pavimenti', 'rivestimenti', 'bagno', 'cucina', 'outdoor', 'ristrutturazione', 'altro'
);

create type stato_opportunita as enum ('aperta', 'vinta', 'persa');

create type motivo_perso as enum (
  'prezzo', 'tempi', 'silenzio', 'comprato_altrove', 'lavoro_rimandato', 'altro'
);

-- ---------------------------------------------------------------------------
-- CONTATTI — fonte e fase prendono il posto di provenienza e stato
-- ---------------------------------------------------------------------------
alter table contatti
  add column cognome text not null default '',
  add column provincia text,
  add column fonte fonte_contatto not null default 'altro',
  add column fonte_dettaglio text,
  add column fase fase_contatto not null default 'nuovo',
  add column note text;

-- Traduzione dei vecchi valori. Il "manuale" di ieri era quasi sempre qualcuno
-- passato in showroom, ma non possiamo saperlo: resta 'altro'.
update contatti set fonte = case provenienza
  when 'card_nfc' then 'card_nfc'::fonte_contatto
  when 'sito' then 'sito'::fonte_contatto
  else 'altro'::fonte_contatto
end;

update contatti set fase = case stato
  when 'nuovo' then 'nuovo'::fase_contatto
  when 'contattato' then 'contattato'::fase_contatto
  when 'in_showroom' then 'appuntamento'::fase_contatto
  when 'preventivo' then 'preventivo'::fase_contatto
  when 'cliente' then 'cliente'::fase_contatto
  when 'perso' then 'perso'::fase_contatto
  else 'nuovo'::fase_contatto
end;

-- Il nome era un campo solo: si spezza al primo spazio, il resto è cognome.
update contatti
set cognome = trim(substring(nome from position(' ' in nome) + 1)),
    nome = split_part(nome, ' ', 1)
where position(' ' in nome) > 0 and cognome = '';

alter table contatti drop column provenienza, drop column stato;
drop type provenienza_contatto;
drop type stato_contatto;

create index contatti_fase on contatti (fase, aggiornato_il desc);
create index contatti_fonte on contatti (fonte, creato_il desc);

-- ---------------------------------------------------------------------------
-- AZIONI — le "attività" di prima, con dentro cosa serve per lavorare
-- ---------------------------------------------------------------------------
alter table attivita rename to azioni;
alter table azioni rename column titolo to descrizione;

alter table azioni
  add column tipo_nuovo tipo_azione not null default 'altro',
  add column ha_ora boolean not null default false,
  add column priorita priorita_azione not null default 'da_fare',
  add column esito text;

update azioni set tipo_nuovo = case tipo
  when 'chiamata' then 'telefonare'::tipo_azione
  when 'email' then 'rispondere'::tipo_azione
  when 'appuntamento' then 'fissare_appuntamento'::tipo_azione
  else 'altro'::tipo_azione
end;

alter table azioni drop column tipo;
alter table azioni rename column tipo_nuovo to tipo;
drop type tipo_attivita;

-- Le azioni aperte in scadenza sono la domanda più frequente del CRM.
create index azioni_da_fare on azioni (fatta_il, scadenza) where fatta_il is null;

-- ---------------------------------------------------------------------------
-- EVENTI — la timeline. Le vecchie note diventano eventi di tipo 'nota'.
-- ---------------------------------------------------------------------------
create table eventi (
  id uuid primary key default gen_random_uuid(),
  contatto_id uuid not null references contatti (id) on delete cascade,
  tipo tipo_evento not null,
  descrizione text not null,
  quando timestamptz not null default now(),
  valore numeric(10, 2),
  operatore uuid references profili (id) on delete set null,
  automatico boolean not null default false,
  creato_il timestamptz not null default now()
);

create index eventi_contatto on eventi (contatto_id, quando desc);
create index eventi_tipo on eventi (tipo, quando desc);

insert into eventi (contatto_id, tipo, descrizione, quando, operatore, automatico)
select contatto_id, 'nota', testo, creato_il, autore, false from note;

drop table note;

-- ---------------------------------------------------------------------------
-- OPPORTUNITÀ — il lavoro di cui si sta parlando
-- ---------------------------------------------------------------------------
create table opportunita (
  id uuid primary key default gen_random_uuid(),
  contatto_id uuid not null references contatti (id) on delete cascade,
  titolo text not null,
  interesse interesse_lavoro not null default 'altro',
  descrizione text,
  valore_stimato numeric(10, 2),
  valore_preventivo numeric(10, 2),
  probabilita integer check (probabilita between 0 and 100),
  stato stato_opportunita not null default 'aperta',
  data_preventivo timestamptz,
  chiusura_prevista date,
  motivo_perso motivo_perso,
  creata_il timestamptz not null default now(),
  -- Stesso nome usato da `contatti`, così vale lo stesso trigger.
  aggiornato_il timestamptz not null default now()
);

create index opportunita_contatto on opportunita (contatto_id, creata_il desc);
create index opportunita_aperte on opportunita (stato) where stato = 'aperta';

create trigger opportunita_aggiornato_il
  before update on opportunita
  for each row execute function tocca_aggiornato_il();

-- Ogni contatto arrivato dalla card ha già un credito: diventa la sua prima
-- opportunità, così anche quei lead hanno un valore in pipeline.
insert into opportunita (contatto_id, titolo, interesse, descrizione, valore_stimato, creata_il)
select l.contatto_id,
       'Progetto ' || lower(l.progetto),
       case lower(l.progetto)
         when 'bagno' then 'bagno'::interesse_lavoro
         when 'cucina' then 'cucina'::interesse_lavoro
         when 'salotto' then 'pavimenti'::interesse_lavoro
         when 'casa intera' then 'ristrutturazione'::interesse_lavoro
         else 'altro'::interesse_lavoro
       end,
       'Dal quiz della card: stile ' || lower(l.stile),
       null,
       l.creato_il
from lead_card l;

-- ---------------------------------------------------------------------------
-- Regole di riga: come per le altre tabelle, fuori dal login non si entra.
-- ---------------------------------------------------------------------------
alter table eventi enable row level security;
alter table opportunita enable row level security;

create policy "eventi: tutto agli autenticati" on eventi for all to authenticated using (true) with check (true);
create policy "opportunita: tutto agli autenticati" on opportunita for all to authenticated using (true) with check (true);
