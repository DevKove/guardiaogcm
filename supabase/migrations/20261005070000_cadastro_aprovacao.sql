-- Cadastro público com aprovação administrativa
alter table public.profiles
  add column if not exists aprovado boolean not null default true;

update public.profiles
set aprovado = true
where aprovado is distinct from true;

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert"
on public.profiles
for insert to authenticated
with check (id = (select auth.uid()) and aprovado = false);

create or replace function public.handle_new_cad_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.profiles (id, nome, matricula, aprovado)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'nome', '')), 120),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'matricula', '')), 40), ''),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

drop trigger if exists on_auth_user_created_cad on auth.users;
create trigger on_auth_user_created_cad
  after insert on auth.users
  for each row execute function public.handle_new_cad_user();

revoke all on function public.handle_new_cad_user() from public;

create or replace function public.admin_set_user_access(
  _actor uuid, _user_id uuid, _nome text, _matricula text, _role app_role
) returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if _actor is null or not exists (
    select 1 from public.user_roles where user_id = _actor and role = 'admin'
  ) then
    raise exception 'Acesso restrito a administradores.';
  end if;

  if _user_id is null or length(trim(coalesce(_nome, ''))) = 0
     or length(_nome) > 120 or length(coalesce(_matricula, '')) > 40 then
    raise exception 'Dados de perfil inválidos.';
  end if;

  if _role <> 'admin' and exists (
    select 1 from public.user_roles where user_id = _user_id and role = 'admin'
  ) and (select count(*) from public.user_roles where role = 'admin') <= 1 then
    raise exception 'Não é permitido remover o último administrador.';
  end if;

  insert into public.profiles (id, nome, matricula, aprovado)
  values (_user_id, trim(_nome), nullif(trim(coalesce(_matricula, '')), ''), true)
  on conflict (id) do update
    set nome = excluded.nome,
        matricula = excluded.matricula,
        aprovado = true;

  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles (user_id, role) values (_user_id, _role);
end;
$function$;

create or replace function public.admin_approve_user(
  _actor uuid, _user_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if _actor is null or not exists (
    select 1 from public.user_roles where user_id = _actor and role = 'admin'
  ) then
    raise exception 'Acesso restrito a administradores.';
  end if;

  if not exists (select 1 from public.profiles where id = _user_id) then
    raise exception 'Usuário não encontrado.';
  end if;

  update public.profiles set aprovado = true where id = _user_id;
  delete from public.user_roles where user_id = _user_id;
  insert into public.user_roles (user_id, role) values (_user_id, 'operador');
end;
$function$;

revoke all on function public.admin_approve_user(uuid, uuid) from public;
grant execute on function public.admin_approve_user(uuid, uuid) to authenticated;
