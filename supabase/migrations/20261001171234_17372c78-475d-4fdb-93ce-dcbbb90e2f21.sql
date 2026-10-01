ALTER TABLE public.viaturas ADD COLUMN IF NOT EXISTS km_atual integer, ADD COLUMN IF NOT EXISTS observacao text;

CREATE TABLE public.postos_fixos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Escola',
  endereco text,
  bairro text,
  telefone text,
  responsavel text,
  horario text,
  observacao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.postos_fixos TO authenticated;
GRANT ALL ON public.postos_fixos TO service_role;
ALTER TABLE public.postos_fixos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read postos" ON public.postos_fixos FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "sup insert postos" ON public.postos_fixos FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor'));
CREATE POLICY "sup update postos" ON public.postos_fixos FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor'));
CREATE POLICY "admin delete postos" ON public.postos_fixos FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE TRIGGER postos_touch BEFORE UPDATE ON public.postos_fixos FOR EACH ROW EXECUTE FUNCTION public.touch_simple();

CREATE TABLE public.escalas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  turno text NOT NULL DEFAULT 'Diurno',
  hora_inicio time NOT NULL DEFAULT '07:00',
  hora_fim time NOT NULL DEFAULT '19:00',
  agentes text NOT NULL,
  funcao text NOT NULL DEFAULT 'Patrulhamento',
  posto_id uuid REFERENCES public.postos_fixos(id) ON DELETE SET NULL,
  viatura_id uuid REFERENCES public.viaturas(id) ON DELETE SET NULL,
  observacao text,
  criado_por uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.escalas TO authenticated;
GRANT ALL ON public.escalas TO service_role;
ALTER TABLE public.escalas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read escalas" ON public.escalas FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "sup insert escalas" ON public.escalas FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor'));
CREATE POLICY "sup update escalas" ON public.escalas FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor'));
CREATE POLICY "sup delete escalas" ON public.escalas FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor'));
CREATE TRIGGER escalas_touch BEFORE UPDATE ON public.escalas FOR EACH ROW EXECUTE FUNCTION public.touch_simple();

CREATE TABLE public.avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  mensagem text NOT NULL,
  nivel text NOT NULL DEFAULT 'info',
  autor_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.avisos TO authenticated;
GRANT ALL ON public.avisos TO service_role;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read avisos" ON public.avisos FOR SELECT TO authenticated USING (is_staff(auth.uid()));
CREATE POLICY "sup insert avisos" ON public.avisos FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor')) AND autor_id = auth.uid());
CREATE POLICY "sup delete avisos" ON public.avisos FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'supervisor'));

ALTER TABLE public.ocorrencias ADD COLUMN IF NOT EXISTS posto_id uuid REFERENCES public.postos_fixos(id) ON DELETE SET NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.postos_fixos, public.escalas, public.avisos;