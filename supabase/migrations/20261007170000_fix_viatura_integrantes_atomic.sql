-- Corrige a edição da guarnição da viatura:
-- uma única operação substitui os vínculos, permitindo adicionar e remover integrantes
-- sem deixar a viatura parcialmente atualizada em caso de erro.
create or replace function public.substituir_viatura_integrantes(
  p_viatura_id uuid,
  p_plantao_id uuid,
  p_equipe_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not is_staff(v_uid) then
    raise exception 'Usuário não autorizado.';
  end if;

  if not exists (
    select 1
    from public.plantoes p
    where p.id = p_plantao_id
      and p.status = 'aberto'
      and (
        p.operador_id = v_uid
        or has_role(v_uid, 'admin'::app_role)
        or has_role(v_uid, 'supervisor'::app_role)
      )
  ) then
    raise exception 'Você não pode alterar a guarnição deste plantão.';
  end if;

  if not exists (
    select 1 from public.viaturas v where v.id = p_viatura_id
  ) then
    raise exception 'Viatura não encontrada.';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_equipe_ids, '{}'::uuid[])) x(id)
    where not exists (
      select 1 from public.equipe e
      where e.id = x.id and e.ativo = true
    )
  ) then
    raise exception 'Todos os integrantes devem estar cadastrados como ativos em Equipe.';
  end if;

  delete from public.viatura_integrantes
  where viatura_id = p_viatura_id
    and plantao_id = p_plantao_id;

  insert into public.viatura_integrantes (plantao_id, viatura_id, equipe_id, papel)
  select p_plantao_id, p_viatura_id, x.id, 'integrante'
  from unnest(coalesce(p_equipe_ids, '{}'::uuid[])) x(id);
end;
$$;

revoke all on function public.substituir_viatura_integrantes(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.substituir_viatura_integrantes(uuid, uuid, uuid[]) to authenticated;


-- A guarnição da viatura pode usar qualquer integrante ativo cadastrado em Equipe.
-- A exigência de pertencimento ao plantão foi removida; o plantão continua
-- obrigatório como contexto da escala e permanece aberto durante a edição.
create or replace function public.validar_viatura_integrante_plantao()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if not exists (
    select 1
    from public.plantoes p
    join public.equipe e on e.id = new.equipe_id
    where p.id = new.plantao_id
      and p.status = 'aberto'
      and e.ativo = true
  ) then
    raise exception 'O integrante da viatura deve estar cadastrado como ativo em Equipe e o plantão deve estar aberto';
  end if;
  return new;
end;
$function$;
