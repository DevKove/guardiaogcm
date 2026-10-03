create table if not exists public.equipe (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  matricula text,
  tipo text not null default 'GCM' check (tipo in ('GCM','Vigia')),
  funcao text not null default 'Agente',
  ativo boolean not null default true,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists equipe_matricula_unique
  on public.equipe (lower(matricula))
  where matricula is not null and btrim(matricula) <> '';

create index if not exists equipe_ativo_nome_idx
  on public.equipe (ativo, nome);

alter table public.equipe enable row level security;

drop policy if exists "staff read equipe" on public.equipe;
create policy "staff read equipe" on public.equipe for select to authenticated
  using (is_staff(auth.uid()));

drop policy if exists "supervisor insert equipe" on public.equipe;
create policy "supervisor insert equipe" on public.equipe for insert to authenticated
  with check (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'supervisor'::app_role));

drop policy if exists "supervisor update equipe" on public.equipe;
create policy "supervisor update equipe" on public.equipe for update to authenticated
  using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'supervisor'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'supervisor'::app_role));

drop policy if exists "supervisor delete equipe" on public.equipe;
create policy "supervisor delete equipe" on public.equipe for delete to authenticated
  using (has_role(auth.uid(), 'admin'::app_role) or has_role(auth.uid(), 'supervisor'::app_role));

create or replace function public.touch_equipe_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists equipe_updated_at on public.equipe;
create trigger equipe_updated_at before update on public.equipe
for each row execute function public.touch_equipe_updated_at();
