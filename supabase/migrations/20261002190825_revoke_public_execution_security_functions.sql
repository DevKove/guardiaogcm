-- Defesa em profundidade: remove execução pública de funções de segurança.
-- As funções de trigger continuam disponíveis ao mecanismo interno do banco.

revoke all on function public.admin_set_user_access(uuid, uuid, text, text, public.app_role) from public;
revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.is_staff(uuid) from public;
revoke all on function public.despachar_viatura(uuid, uuid) from public;
revoke all on function public.finalizar_ocorrencia(uuid, text, text, text) from public;
revoke all on function public.marcar_chegada(uuid) from public;
revoke all on function public.ocorrencia_bloqueada(uuid, public.ocorrencia_status) from public;
revoke all on function public.plantao_editavel(uuid, uuid) from public;

grant execute on function public.admin_set_user_access(uuid, uuid, text, text, public.app_role) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.despachar_viatura(uuid, uuid) to authenticated;
grant execute on function public.finalizar_ocorrencia(uuid, text, text, text) to authenticated;
grant execute on function public.marcar_chegada(uuid) to authenticated;
grant execute on function public.ocorrencia_bloqueada(uuid, public.ocorrencia_status) to authenticated;
grant execute on function public.plantao_editavel(uuid, uuid) to authenticated;
