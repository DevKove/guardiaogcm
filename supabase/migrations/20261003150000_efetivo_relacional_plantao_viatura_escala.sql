-- Cadastro relacional de efetivo para plantões, viaturas e escalas.
ALTER TABLE public.plantoes
  ADD COLUMN IF NOT EXISTS operador_radio_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'plantoes_operador_radio_id_fkey'
  ) THEN
    ALTER TABLE public.plantoes
      ADD CONSTRAINT plantoes_operador_radio_id_fkey
      FOREIGN KEY (operador_radio_id) REFERENCES public.equipe(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS plantoes_operador_radio_id_idx
  ON public.plantoes(operador_radio_id);

ALTER TABLE public.plantoes
  DROP CONSTRAINT IF EXISTS plantoes_nome_plantao_check;
ALTER TABLE public.plantoes
  ADD CONSTRAINT plantoes_nome_plantao_check
  CHECK (nome_plantao IS NULL OR nome_plantao IN ('ALPHA','BRAVO','CHARLIE','DELTA'));

CREATE TABLE IF NOT EXISTS public.escala_integrantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escala_id uuid NOT NULL REFERENCES public.escalas(id) ON DELETE CASCADE,
  equipe_id uuid NOT NULL REFERENCES public.equipe(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (escala_id, equipe_id)
);

CREATE INDEX IF NOT EXISTS escala_integrantes_escala_idx
  ON public.escala_integrantes(escala_id);
CREATE INDEX IF NOT EXISTS escala_integrantes_equipe_idx
  ON public.escala_integrantes(equipe_id);

ALTER TABLE public.escala_integrantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff read escala integrantes" ON public.escala_integrantes;
CREATE POLICY "staff read escala integrantes"
ON public.escala_integrantes FOR SELECT TO authenticated
USING (is_staff((select auth.uid())));

DROP POLICY IF EXISTS "supervisor insert escala integrantes" ON public.escala_integrantes;
CREATE POLICY "supervisor insert escala integrantes"
ON public.escala_integrantes FOR INSERT TO authenticated
WITH CHECK (
  is_staff((select auth.uid()))
  AND (has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'supervisor'::app_role))
  AND EXISTS (SELECT 1 FROM public.equipe e WHERE e.id = equipe_id AND e.ativo = true)
);

DROP POLICY IF EXISTS "supervisor update escala integrantes" ON public.escala_integrantes;
CREATE POLICY "supervisor update escala integrantes"
ON public.escala_integrantes FOR UPDATE TO authenticated
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'supervisor'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'supervisor'::app_role)
);

DROP POLICY IF EXISTS "supervisor delete escala integrantes" ON public.escala_integrantes;
CREATE POLICY "supervisor delete escala integrantes"
ON public.escala_integrantes FOR DELETE TO authenticated
USING (
  has_role((select auth.uid()), 'admin'::app_role) OR has_role((select auth.uid()), 'supervisor'::app_role)
);

CREATE OR REPLACE FUNCTION public.iniciar_plantao(
  p_nome_plantao text,
  p_supervisor_id uuid,
  p_integrantes uuid[],
  p_operador_radio_id uuid DEFAULT NULL,
  p_data_inicio date DEFAULT CURRENT_DATE,
  p_turno text DEFAULT NULL,
  p_horario text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_plantao_id uuid;
  v_count integer;
  v_unique_count integer;
BEGIN
  IF NOT is_staff((select auth.uid())) THEN
    RAISE EXCEPTION 'Usuário sem permissão para iniciar plantão';
  END IF;
  IF p_nome_plantao NOT IN ('ALPHA','BRAVO','CHARLIE','DELTA') THEN
    RAISE EXCEPTION 'Nome de plantão inválido';
  END IF;
  IF p_supervisor_id IS NULL THEN
    RAISE EXCEPTION 'Supervisor é obrigatório';
  END IF;
  IF p_integrantes IS NULL OR cardinality(p_integrantes) = 0 THEN
    RAISE EXCEPTION 'Selecione ao menos um integrante da Equipe';
  END IF;

  SELECT count(*)::integer, count(DISTINCT x)::integer
    INTO v_count, v_unique_count
  FROM unnest(p_integrantes) AS x;
  IF v_count <> v_unique_count THEN
    RAISE EXCEPTION 'Não é permitido repetir integrante no plantão';
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.equipe
  WHERE id = ANY(p_integrantes) AND ativo = true;
  IF v_count <> cardinality(p_integrantes) THEN
    RAISE EXCEPTION 'Todos os integrantes devem estar ativos e cadastrados na Equipe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.equipe
    WHERE id = p_supervisor_id AND ativo = true AND id = ANY(p_integrantes)
  ) THEN
    RAISE EXCEPTION 'O supervisor deve ser um integrante ativo selecionado para o plantão';
  END IF;

  IF p_operador_radio_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.equipe
    WHERE id = p_operador_radio_id AND ativo = true AND id = ANY(p_integrantes)
  ) THEN
    RAISE EXCEPTION 'O operador de rádio deve ser um integrante ativo selecionado para o plantão';
  END IF;

  INSERT INTO public.plantoes (
    operador_id, data_inicio, turno, horario, status,
    nome_plantao, supervisor_id, operador_radio_id
  )
  VALUES (
    (select auth.uid()), p_data_inicio, p_turno, p_horario, 'aberto',
    p_nome_plantao, p_supervisor_id, p_operador_radio_id
  )
  RETURNING id INTO v_plantao_id;

  INSERT INTO public.plantao_integrantes (plantao_id, equipe_id)
  SELECT v_plantao_id, x FROM unnest(p_integrantes) AS x;

  RETURN v_plantao_id;
END;
$$;

REVOKE ALL ON FUNCTION public.iniciar_plantao(text, uuid, uuid[], uuid, date, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.iniciar_plantao(text, uuid, uuid[], uuid, date, text, text) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.escala_integrantes;
