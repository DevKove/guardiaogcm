-- Corrige o encerramento administrativo do plantão.
-- A RPC já valida usuário, perfil administrativo, reautenticação e plantão.
-- Como plantao_historico não aceita INSERT direto do cliente, a RPC precisa
-- executar com privilégios do owner para registrar a assinatura/auditoria.
ALTER FUNCTION public.finalizar_plantao_assinado(uuid, jsonb)
  SECURITY DEFINER
  SET search_path = public;
REVOKE ALL ON FUNCTION public.finalizar_plantao_assinado(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalizar_plantao_assinado(uuid, jsonb) TO authenticated;
