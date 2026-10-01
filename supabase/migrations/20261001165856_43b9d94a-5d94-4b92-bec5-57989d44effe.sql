create type public.viatura_status as enum ('disponivel','em_deslocamento','no_local','retornando','manutencao','fora_servico');

create table public.viaturas (
  id uuid primary key default gen_random_uuid(),
  prefixo text not null unique,
  placa text,
  modelo text,
  tipo text not null default 'Viatura',
  status viatura_status not null default 'disponivel',
  guarnicao text,
  ocorrencia_id uuid references public.ocorrencias(id) on delete set null,
  ativa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.viaturas to authenticated;
grant all on public.viaturas to service_role;
alter table public.viaturas enable row level security;
create policy "staff read viaturas" on public.viaturas for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff update viaturas" on public.viaturas for update to authenticated using (public.is_staff(auth.uid()));
create policy "sup insert viaturas" on public.viaturas for insert to authenticated with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'supervisor'));
create policy "admin delete viaturas" on public.viaturas for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.touch_simple() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
create trigger viaturas_touch before update on public.viaturas for each row execute function public.touch_simple();

alter table public.ocorrencias
  add column viatura_id uuid references public.viaturas(id) on delete set null,
  add column despachada_em timestamptz,
  add column chegada_em timestamptz,
  add column desfecho text,
  add column origem text not null default '153',
  add column numero text,
  add column latitude double precision,
  add column longitude double precision;

create table public.ocorrencia_envolvidos (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.ocorrencias(id) on delete cascade,
  tipo text not null,
  nome text not null,
  documento text,
  telefone text,
  observacao text,
  criado_por uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.ocorrencia_envolvidos to authenticated;
grant all on public.ocorrencia_envolvidos to service_role;
alter table public.ocorrencia_envolvidos enable row level security;
create policy "staff read env" on public.ocorrencia_envolvidos for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert env" on public.ocorrencia_envolvidos for insert to authenticated with check (public.is_staff(auth.uid()) and criado_por = auth.uid());
create policy "sup delete env" on public.ocorrencia_envolvidos for delete to authenticated using (criado_por = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'supervisor'));

alter publication supabase_realtime add table public.viaturas;

insert into public.viaturas (prefixo, placa, modelo, tipo) values
 ('GM-01','ABC1D23','Toyota Hilux','Viatura'),
 ('GM-02','DEF4G56','Chevrolet S10','Viatura'),
 ('GM-03','GHI7J89','Renault Duster','Viatura'),
 ('MT-01','JKL0M12','Honda XRE 300','Motocicleta'),
 ('ROMU-01','MNO3P45','Toyota SW4','Tático');