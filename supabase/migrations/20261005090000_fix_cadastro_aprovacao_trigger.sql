-- Corrige o fluxo de cadastro para que todo novo usuário comece pendente.
-- O trigger legado on_auth_user_created também criava profiles e podia
-- vencer a corrida antes do trigger específico de cadastro, deixando
-- aprovado=true por causa do DEFAULT da coluna.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  insert into public.profiles (id, nome, matricula, aprovado)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data->>'nome', '')), 120),
    nullif(left(trim(coalesce(new.raw_user_meta_data->>'matricula', '')), 40), ''),
    false
  )
  on conflict (id) do nothing;

  if coalesce(new.raw_app_meta_data->>'cad_provisioned', 'false') = 'true' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'operador')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$function$;

drop trigger if exists on_auth_user_created_cad on auth.users;
drop function if exists public.handle_new_cad_user();
