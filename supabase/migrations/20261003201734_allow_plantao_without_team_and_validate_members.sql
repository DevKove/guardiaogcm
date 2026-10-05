create or replace function public.iniciar_plantao(
  p_nome_plantao text,
  p_supervisor_id uuid,
  p_integrantes uuid[],
  p_operador_radio_id uuid default null,
  p_data_inicio date default current_date,
  p_turno text default null,
  p_horario text default null
)
returns uuid
language plpgsql
set search_path = public
as $function$
declare
  v_plantao_id uuid;
  v_count integer;
  v_unique_count integer;
  v_integrantes uuid[] := coalesce(p_integrantes, '{}'::uuid[]);
begin
  if not is_staff((select auth.uid())) then
    raise exception 'Usuário sem permissão para iniciar plantão';
  end if;

  if p_nome_plantao not in ('ALPHA','BRAVO','CHARLIE','DELTA') then
    raise exception 'Nome de plantão inválido';
  end if;

  if cardinality(v_integrantes) > 0 then
    select count(*)::integer, count(distinct x)::integer
      into v_count, v_unique_count
    from unnest(v_integrantes) as x;

    if v_count <> v_unique_count then
      raise exception 'Não é permitido repetir integrante no plantão';
    end if;

    select count(*)::integer
      into v_count
    from public.equipe
    where id = any(v_integrantes) and ativo = true;

    if v_count <> cardinality(v_integrantes) then
      raise exception 'Todos os integrantes devem estar ativos e cadastrados na Equipe';
    end if;

    if p_supervisor_id is not null and not exists (
      select 1 from public.equipe
      where id = p_supervisor_id and ativo = true and id = any(v_integrantes)
    ) then
      raise exception 'O supervisor deve ser um integrante ativo selecionado para o plantão';
    end if;

    if p_operador_radio_id is not null and not exists (
      select 1 from public.equipe
      where id = p_operador_radio_id and ativo = true and id = any(v_integrantes)
    ) then
      raise exception 'O operador de rádio deve ser um integrante ativo selecionado para o plantão';
    end if;
  elsif p_supervisor_id is not null or p_operador_radio_id is not null then
    raise exception 'Supervisor e operador de rádio só podem ser informados quando houver equipe no plantão';
  end if;

  insert into public.plantoes (
    operador_id, data_inicio, turno, horario, status,
    nome_plantao, supervisor_id, operador_radio_id
  )
  values (
    (select auth.uid()), p_data_inicio, p_turno, p_horario, 'aberto',
    p_nome_plantao, p_supervisor_id, p_operador_radio_id
  )
  returning id into v_plantao_id;

  if cardinality(v_integrantes) > 0 then
    insert into public.plantao_integrantes (plantao_id, equipe_id)
    select v_plantao_id, x from unnest(v_integrantes) as x;
  end if;

  return v_plantao_id;
end;
$function$;
