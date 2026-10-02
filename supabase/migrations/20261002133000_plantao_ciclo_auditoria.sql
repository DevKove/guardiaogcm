-- Controle formal do ciclo de vida do plantão e auditoria de autoria.
-- Regra operacional: somente um plantão pode estar aberto por vez.
DROP INDEX IF EXISTS public.plantao_aberto_por_operador;
DROP INDEX IF EXISTS public.plantoes_um_aberto_por_operador;
CREATE UNIQUE INDEX IF NOT EXISTS plantoes_apenas_um_aberto
  ON public.plantoes ((status))
  WHERE status = 'aberto';

CREATE TABLE IF NOT EXISTS public.plantao_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantao_id uuid NOT NULL REFERENCES public.plantoes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL DEFAULT auth.uid(),
  acao text NOT NULL,
  dados jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.plantao_historico TO authenticated;
GRANT ALL ON public.plantao_historico TO service_role;
ALTER TABLE public.plantao_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read plantao historico" ON public.plantao_historico;
CREATE POLICY "staff read plantao historico" ON public.plantao_historico
  FOR SELECT TO authenticated USING (is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.registrar_auditoria_plantao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.plantao_historico (plantao_id, usuario_id, acao, dados)
    VALUES (NEW.id, auth.uid(), 'plantao_criado', jsonb_build_object('novo', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.plantao_historico (plantao_id, usuario_id, acao, dados)
    VALUES (
      NEW.id,
      auth.uid(),
      CASE WHEN OLD.status <> NEW.status AND NEW.status = 'encerrado' THEN 'plantao_finalizado' ELSE 'plantao_atualizado' END,
      jsonb_build_object('antes', to_jsonb(OLD), 'depois', to_jsonb(NEW))
    );
    RETURN NEW;
  ELSE
    INSERT INTO public.plantao_historico (plantao_id, usuario_id, acao, dados)
    VALUES (OLD.id, auth.uid(), 'plantao_excluido', jsonb_build_object('anterior', to_jsonb(OLD)));
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS plantoes_auditoria ON public.plantoes;
CREATE TRIGGER plantoes_auditoria
AFTER INSERT OR UPDATE OR DELETE ON public.plantoes
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_plantao();

CREATE OR REPLACE FUNCTION public.registrar_auditoria_registro_plantao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.plantao_historico (plantao_id, usuario_id, acao, dados)
    VALUES (NEW.plantao_id, auth.uid(), 'registro_inserido', jsonb_build_object('registro_id', NEW.id, 'texto', NEW.texto, 'hora', NEW.hora, 'criado_por', NEW.criado_por));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.plantao_historico (plantao_id, usuario_id, acao, dados)
    VALUES (NEW.plantao_id, auth.uid(), 'registro_atualizado', jsonb_build_object('registro_id', NEW.id, 'antes', to_jsonb(OLD), 'depois', to_jsonb(NEW)));
    RETURN NEW;
  ELSE
    INSERT INTO public.plantao_historico (plantao_id, usuario_id, acao, dados)
    VALUES (OLD.plantao_id, auth.uid(), 'registro_excluido', jsonb_build_object('registro_id', OLD.id, 'anterior', to_jsonb(OLD)));
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS plantao_registros_auditoria ON public.plantao_registros;
CREATE TRIGGER plantao_registros_auditoria
AFTER INSERT OR UPDATE OR DELETE ON public.plantao_registros
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_registro_plantao();

-- Toda ocorrência operacional precisa pertencer ao plantão atualmente aberto.
DROP POLICY IF EXISTS "staff insert ocorrencias" ON public.ocorrencias;
CREATE POLICY "staff insert ocorrencias" ON public.ocorrencias
FOR INSERT TO authenticated
WITH CHECK (
  is_staff(auth.uid())
  AND criado_por = auth.uid()
  AND plantao_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.plantoes p
    WHERE p.id = plantao_id AND p.status = 'aberto'
  )
);

CREATE OR REPLACE FUNCTION public.set_plantao_ocorrencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plantao_id IS NULL THEN
    SELECT id INTO NEW.plantao_id
    FROM public.plantoes
    WHERE status = 'aberto'
    ORDER BY iniciado_em DESC
    LIMIT 1;
  END IF;

  IF NEW.plantao_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.plantoes WHERE id = NEW.plantao_id AND status = 'aberto'
  ) THEN
    RAISE EXCEPTION 'É necessário iniciar um plantão antes de registrar uma ocorrência';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ocorrencias_set_plantao ON public.ocorrencias;
CREATE TRIGGER ocorrencias_set_plantao
BEFORE INSERT ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.set_plantao_ocorrencia();

-- Impede que um plantão seja reaberto ou que uma ocorrência seja vinculada a plantão encerrado.
CREATE OR REPLACE FUNCTION public.validar_vinculo_plantao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'aberto' AND OLD.status = 'encerrado' THEN
    RAISE EXCEPTION 'Plantão encerrado não pode ser reaberto';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plantoes_validar_ciclo ON public.plantoes;
CREATE TRIGGER plantoes_validar_ciclo
BEFORE UPDATE ON public.plantoes
FOR EACH ROW EXECUTE FUNCTION public.validar_vinculo_plantao();

CREATE OR REPLACE FUNCTION public.validar_ocorrencia_plantao()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.plantao_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.plantoes WHERE id = NEW.plantao_id AND status = 'aberto'
  ) AND NEW.status IN ('aberta','em_atendimento') THEN
    RAISE EXCEPTION 'Ocorrência operacional não pode permanecer ativa fora de um plantão aberto';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ocorrencias_validar_plantao ON public.ocorrencias;
CREATE TRIGGER ocorrencias_validar_plantao
BEFORE INSERT OR UPDATE ON public.ocorrencias
FOR EACH ROW EXECUTE FUNCTION public.validar_ocorrencia_plantao();

ALTER PUBLICATION supabase_realtime ADD TABLE public.plantao_historico;
