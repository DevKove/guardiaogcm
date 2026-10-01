CREATE TABLE public.plantoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operador_id uuid NOT NULL DEFAULT auth.uid(),
  data_inicio date NOT NULL DEFAULT current_date,
  turno text NOT NULL CHECK (turno IN ('Diurno','Noturno')),
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','encerrado')),
  iniciado_em timestamptz NOT NULL DEFAULT now(),
  encerrado_em timestamptz,
  observacoes text,
  resumo jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX plantao_aberto_por_operador ON public.plantoes(operador_id) WHERE status = 'aberto';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantoes TO authenticated;
GRANT ALL ON public.plantoes TO service_role;
ALTER TABLE public.plantoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.plantao_editavel(_plantao_id uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT has_role(_user,'admin') OR EXISTS (
    SELECT 1 FROM plantoes WHERE id = _plantao_id AND status = 'aberto' AND operador_id = _user)
$$;

CREATE POLICY "staff read plantoes" ON public.plantoes FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "staff open plantao" ON public.plantoes FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()) AND operador_id = auth.uid() AND status = 'aberto');
CREATE POLICY "own open or admin update" ON public.plantoes FOR UPDATE TO authenticated
  USING ((operador_id = auth.uid() AND status = 'aberto') OR has_role(auth.uid(),'admin'))
  WITH CHECK (operador_id = auth.uid() OR has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete plantoes" ON public.plantoes FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER plantoes_touch BEFORE UPDATE ON public.plantoes FOR EACH ROW EXECUTE FUNCTION public.touch_simple();

CREATE TABLE public.plantao_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plantao_id uuid NOT NULL REFERENCES public.plantoes(id) ON DELETE CASCADE,
  texto text NOT NULL,
  hora timestamptz NOT NULL DEFAULT now(),
  criado_por uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantao_registros TO authenticated;
GRANT ALL ON public.plantao_registros TO service_role;
ALTER TABLE public.plantao_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read registros" ON public.plantao_registros FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "insert registros" ON public.plantao_registros FOR INSERT TO authenticated WITH CHECK (criado_por = auth.uid() AND plantao_editavel(plantao_id, auth.uid()));
CREATE POLICY "update registros" ON public.plantao_registros FOR UPDATE TO authenticated USING (plantao_editavel(plantao_id, auth.uid()));
CREATE POLICY "delete registros" ON public.plantao_registros FOR DELETE TO authenticated USING (plantao_editavel(plantao_id, auth.uid()));

ALTER TABLE public.ocorrencias ADD COLUMN plantao_id uuid REFERENCES public.plantoes(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_plantao_ocorrencia()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.plantao_id IS NULL THEN
    SELECT id INTO NEW.plantao_id FROM plantoes WHERE operador_id = auth.uid() AND status = 'aberto' LIMIT 1;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ocorrencias_set_plantao BEFORE INSERT ON public.ocorrencias FOR EACH ROW EXECUTE FUNCTION public.set_plantao_ocorrencia();

-- ocorrência finalizada de plantão encerrado: só admin altera
CREATE OR REPLACE FUNCTION public.ocorrencia_bloqueada(_plantao_id uuid, _status ocorrencia_status)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _status IN ('encerrada','cancelada') AND EXISTS (SELECT 1 FROM plantoes WHERE id = _plantao_id AND status = 'encerrado')
$$;
DROP POLICY "update ocorrencias" ON public.ocorrencias;
CREATE POLICY "update ocorrencias" ON public.ocorrencias FOR UPDATE TO authenticated USING (
  has_role(auth.uid(),'admin') OR (
    NOT ocorrencia_bloqueada(plantao_id, status) AND
    ((criado_por = auth.uid()) OR has_role(auth.uid(),'supervisor'))
  )
);

REVOKE EXECUTE ON FUNCTION public.plantao_editavel(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ocorrencia_bloqueada(uuid, ocorrencia_status) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.plantao_editavel(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ocorrencia_bloqueada(uuid, ocorrencia_status) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.plantoes, public.plantao_registros;