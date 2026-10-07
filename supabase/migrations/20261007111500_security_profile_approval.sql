-- Hardening: users must not be able to self-approve their accounts.
-- Only an administrator may change profiles.aprovado.

create or replace function public.protect_profile_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.';
  end if;

  if new.id <> auth.uid() and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Não é permitido alterar o identificador do perfil.';
  end if;

  if new.aprovado is distinct from old.aprovado
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Somente administradores podem alterar a aprovação do usuário.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_approval on public.profiles;

create trigger trg_protect_profile_approval
before update on public.profiles
for each row
execute function public.protect_profile_approval();

revoke all on function public.protect_profile_approval() from public, anon, authenticated;
grant execute on function public.protect_profile_approval() to postgres, service_role;

drop policy if exists "own profile update" on public.profiles;

create policy "own profile update"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
