-- Hardening: trilhas de auditoria não podem ser forjadas pelo cliente.
-- Os registros passam a ser criados exclusivamente pelos gatilhos/RPCs confiáveis.
DROP POLICY IF EXISTS "authenticated can insert own plantao historico" ON public.plantao_historico;
DROP POLICY IF EXISTS "authorized insert hist" ON public.ocorrencia_historico;
