ALTER TABLE public.plantoes
  ADD COLUMN IF NOT EXISTS equipe text,
  ADD COLUMN IF NOT EXISTS supervisor text,
  ADD COLUMN IF NOT EXISTS operador_radio text,
  ADD COLUMN IF NOT EXISTS horario text,
  ADD COLUMN IF NOT EXISTS guarnicoes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS postos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS atividades text,
  ADD COLUMN IF NOT EXISTS materiais text,
  ADD COLUMN IF NOT EXISTS informativo text,
  ADD COLUMN IF NOT EXISTS atividades_verso text;

CREATE UNIQUE INDEX IF NOT EXISTS plantoes_um_aberto_por_operador ON public.plantoes(operador_id) WHERE status = 'aberto';

INSERT INTO public.viaturas (prefixo, tipo)
SELECT v, 'Viatura' FROM unnest(ARRAY['VTR 001','VTR 201','VTR 006','VTR 007','VTR 008','VTR 009']) v
WHERE NOT EXISTS (SELECT 1 FROM public.viaturas WHERE prefixo = v);

INSERT INTO public.postos_fixos (nome, tipo)
SELECT n, t FROM (VALUES
 ('C.A.D.','Prédio público'),('C.R.A.S.','Prédio público'),('C.R.E.A.S.','Prédio público'),('Espaço Cultural','Prédio público'),
 ('Paço Municipal','Prédio público'),('U.B.S. Alcides Vieira','Unidade de Saúde'),('U.B.S. do Morro','Unidade de Saúde'),
 ('P.A. Central','UPA / Hospital'),('Parque do Castelinho','Praça / Parque'),('Parque do Mizue','Praça / Parque'),('Parque Almiro','Praça / Parque'),
 ('Lago Municipal 1,2,3','Praça / Parque'),('Creche São Conrado','Escola'),('Garagem de Óleo','Prédio público'),('Terminal de Ônibus','Terminal'),
 ('Garagem Santa Fé','Prédio público'),('Creche Di Tata','Escola'),('Escola Áurea','Escola'),('Escola Mizue','Escola'),
 ('Escola Helena Rodrigues','Escola'),('Escola Pedro Ferreira','Escola'),('Escola Célia Notollini','Escola')
) AS x(n,t)
WHERE NOT EXISTS (SELECT 1 FROM public.postos_fixos WHERE lower(nome) = lower(n));