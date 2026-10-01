create type public.app_role as enum ('admin','supervisor','operador');
create type public.ocorrencia_status as enum ('aberta','em_atendimento','encerrada','cancelada');

create table public.profiles (
  id uuid primary key,
  nome text not null default '',
  matricula text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id=_user_id) $$;

create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff(auth.uid()) or id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "admin update profiles" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant insert, delete on public.user_roles to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, matricula)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome',''), new.raw_user_meta_data->>'matricula');
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles (user_id, role) values (new.id,'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id,'operador');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.ocorrencias (
  id uuid primary key default gen_random_uuid(),
  protocolo bigint generated always as identity,
  natureza text not null,
  prioridade smallint not null default 3,
  status ocorrencia_status not null default 'aberta',
  solicitante_nome text,
  solicitante_telefone text,
  endereco text not null,
  bairro text,
  referencia text,
  relato text not null,
  viatura text,
  criado_por uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  encerrada_em timestamptz
);
grant select, insert, update on public.ocorrencias to authenticated;
grant all on public.ocorrencias to service_role;
alter table public.ocorrencias enable row level security;
create policy "staff read ocorrencias" on public.ocorrencias for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert ocorrencias" on public.ocorrencias for insert to authenticated with check (public.is_staff(auth.uid()) and criado_por = auth.uid());
create policy "update ocorrencias" on public.ocorrencias for update to authenticated using (criado_por = auth.uid() or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'supervisor'));

create table public.ocorrencia_historico (
  id uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references public.ocorrencias(id) on delete cascade,
  usuario_id uuid not null default auth.uid(),
  descricao text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.ocorrencia_historico to authenticated;
grant all on public.ocorrencia_historico to service_role;
alter table public.ocorrencia_historico enable row level security;
create policy "staff read hist" on public.ocorrencia_historico for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff insert hist" on public.ocorrencia_historico for insert to authenticated with check (public.is_staff(auth.uid()) and usuario_id = auth.uid());

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); if new.status in ('encerrada','cancelada') and old.status not in ('encerrada','cancelada') then new.encerrada_em = now(); end if; return new; end; $$;
create trigger ocorrencias_touch before update on public.ocorrencias for each row execute function public.touch_updated_at();

alter publication supabase_realtime add table public.ocorrencias;