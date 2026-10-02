-- Security hardening for the operational CAD.
-- Existing records are preserved. Review the bootstrap note in docs/SECURITY.md before deployment.

-- Never grant administrator privileges based on signup order or user-supplied metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, matricula)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NULLIF(NEW.raw_user_meta_data->>'matricula', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Fleet master data and status changes are restricted to supervisors and administrators.
DROP POLICY IF EXISTS "staff update viaturas" ON public.viaturas;
DROP POLICY IF EXISTS "supervisors update viaturas" ON public.viaturas;
CREATE POLICY "supervisors update viaturas"
  ON public.viaturas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- The audit trigger records changed field names without duplicating personal data values.
ALTER TABLE public.ocorrencia_historico
  ALTER COLUMN usuario_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.audit_ocorrencia_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fields text[];
BEGIN
  SELECT array_agg(k.key ORDER BY k.key)
    INTO v_fields
    FROM jsonb_object_keys(to_jsonb(NEW)) AS k(key)
   WHERE k.key <> 'updated_at'
     AND (to_jsonb(OLD) -> k.key) IS DISTINCT FROM (to_jsonb(NEW) -> k.key);

  IF COALESCE(cardinality(v_fields), 0) = 0 THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.ocorrencia_historico (ocorrencia_id, usuario_id, descricao)
  VALUES (
    NEW.id,
    auth.uid(),
    'Alteração registrada pelo banco. Campos: ' || array_to_string(v_fields, ', ')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ocorrencias_audit_update ON public.ocorrencias;
CREATE TRIGGER ocorrencias_audit_update
  AFTER UPDATE ON public.ocorrencias
  FOR EACH ROW EXECUTE FUNCTION public.audit_ocorrencia_update();

REVOKE EXECUTE ON FUNCTION public.audit_ocorrencia_update() FROM PUBLIC, anon, authenticated;

-- Transactional dispatch: occurrence and vehicle are changed in the same transaction.
CREATE OR REPLACE FUNCTION public.despachar_viatura(_ocorrencia_id uuid, _viatura_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_oc public.ocorrencias%ROWTYPE;
  v_prefixo text;
BEGIN
  IF v_user IS NULL OR NOT public.is_staff(v_user) THEN
    RAISE EXCEPTION 'Acesso não autorizado.';
  END IF;

  SELECT * INTO v_oc
    FROM public.ocorrencias
   WHERE id = _ocorrencia_id
   FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Ocorrência não encontrada.'; END IF;
  IF NOT (v_oc.criado_por = v_user OR public.has_role(v_user, 'admin') OR public.has_role(v_user, 'supervisor')) THEN
    RAISE EXCEPTION 'Sem permissão para despachar esta ocorrência.';
  END IF;
  IF v_oc.status NOT IN ('aberta', 'em_atendimento') THEN
    RAISE EXCEPTION 'A ocorrência não está ativa.';
  END IF;
  IF v_oc.plantao_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.plantoes p WHERE p.id = v_oc.plantao_id AND p.status = 'encerrado'
  ) AND NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'O plantão foi encerrado; somente o administrador pode alterar esta ocorrência.';
  END IF;

  IF v_oc.viatura_id = _viatura_id THEN RETURN; END IF;

  SELECT prefixo INTO v_prefixo
    FROM public.viaturas
   WHERE id = _viatura_id AND ativa = true AND status = 'disponivel' AND ocorrencia_id IS NULL
   FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'A viatura não está disponível.'; END IF;

  IF v_oc.viatura_id IS NOT NULL THEN
    UPDATE public.viaturas
       SET status = 'disponivel', ocorrencia_id = NULL
     WHERE id = v_oc.viatura_id AND ocorrencia_id = _ocorrencia_id;
  END IF;

  UPDATE public.viaturas
     SET status = 'em_deslocamento', ocorrencia_id = _ocorrencia_id
   WHERE id = _viatura_id;

  UPDATE public.ocorrencias
     SET viatura_id = _viatura_id,
         viatura = v_prefixo,
         status = 'em_atendimento',
         despachada_em = now(),
         chegada_em = NULL
   WHERE id = _ocorrencia_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.marcar_chegada(_ocorrencia_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_oc public.ocorrencias%ROWTYPE;
BEGIN
  IF v_user IS NULL OR NOT public.is_staff(v_user) THEN
    RAISE EXCEPTION 'Acesso não autorizado.';
  END IF;

  SELECT * INTO v_oc FROM public.ocorrencias WHERE id = _ocorrencia_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ocorrência não encontrada.'; END IF;
  IF NOT (v_oc.criado_por = v_user OR public.has_role(v_user, 'admin') OR public.has_role(v_user, 'supervisor')) THEN
    RAISE EXCEPTION 'Sem permissão para alterar esta ocorrência.';
  END IF;
  IF v_oc.status NOT IN ('aberta', 'em_atendimento') THEN
    RAISE EXCEPTION 'A ocorrência não está ativa.';
  END IF;
  IF v_oc.viatura_id IS NULL THEN RAISE EXCEPTION 'Nenhuma viatura foi despachada.'; END IF;

  UPDATE public.ocorrencias SET chegada_em = now() WHERE id = _ocorrencia_id;
  UPDATE public.viaturas SET status = 'no_local'
   WHERE id = v_oc.viatura_id AND ocorrencia_id = _ocorrencia_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalizar_ocorrencia(
  _ocorrencia_id uuid,
  _status text,
  _desfecho text,
  _observacao text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_oc public.ocorrencias%ROWTYPE;
  v_status public.ocorrencia_status;
BEGIN
  IF v_user IS NULL OR NOT public.is_staff(v_user) THEN
    RAISE EXCEPTION 'Acesso não autorizado.';
  END IF;
  IF _status NOT IN ('encerrada', 'cancelada') THEN
    RAISE EXCEPTION 'Estado final inválido.';
  END IF;
  IF length(COALESCE(_observacao, '')) > 5000 THEN
    RAISE EXCEPTION 'A observação excede 5000 caracteres.';
  END IF;
  IF _status = 'cancelada' AND length(trim(COALESCE(_observacao, ''))) = 0 THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.';
  END IF;

  SELECT * INTO v_oc FROM public.ocorrencias WHERE id = _ocorrencia_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ocorrência não encontrada.'; END IF;
  IF NOT (v_oc.criado_por = v_user OR public.has_role(v_user, 'admin') OR public.has_role(v_user, 'supervisor')) THEN
    RAISE EXCEPTION 'Sem permissão para finalizar esta ocorrência.';
  END IF;
  IF v_oc.status NOT IN ('aberta', 'em_atendimento') THEN
    RAISE EXCEPTION 'A ocorrência já foi finalizada.';
  END IF;
  IF v_oc.plantao_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.plantoes p WHERE p.id = v_oc.plantao_id AND p.status = 'encerrado'
  ) AND NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'O plantão foi encerrado; somente o administrador pode alterar esta ocorrência.';
  END IF;

  v_status := _status::public.ocorrencia_status;
  UPDATE public.ocorrencias
     SET status = v_status,
         desfecho = CASE WHEN v_status = 'encerrada' THEN NULLIF(trim(COALESCE(_desfecho, '')), '') ELSE 'Cancelada' END
   WHERE id = _ocorrencia_id;

  IF v_oc.viatura_id IS NOT NULL THEN
    UPDATE public.viaturas
       SET status = 'disponivel', ocorrencia_id = NULL
     WHERE id = v_oc.viatura_id AND ocorrencia_id = _ocorrencia_id;
  END IF;

  INSERT INTO public.ocorrencia_historico (ocorrencia_id, usuario_id, descricao)
  VALUES (
    _ocorrencia_id,
    v_user,
    CASE WHEN v_status = 'encerrada' THEN 'Ocorrência encerrada' ELSE 'Ocorrência cancelada' END ||
      CASE WHEN length(trim(COALESCE(_observacao, ''))) > 0 THEN E'\n' || trim(_observacao) ELSE '' END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.despachar_viatura(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marcar_chegada(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalizar_ocorrencia(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.despachar_viatura(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_chegada(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_ocorrencia(uuid, text, text, text) TO authenticated;
