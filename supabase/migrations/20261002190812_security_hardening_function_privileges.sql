-- Restringe funções SECURITY DEFINER usadas pelo CAD.
-- Mantém somente o papel autenticado nos RPCs de aplicação.

revoke all on function public.despachar_viatura(uuid, uuid) from public;
revoke all on function public.finalizar_ocorrencia(uuid, text, text, text) from public;
revoke all on function public.marcar_chegada(uuid) from public;
revoke all on function public.ocorrencia_bloqueada(uuid, public.ocorrencia_status) from public;
revoke all on function public.plantao_editavel(uuid, uuid) from public;

grant execute on function public.despachar_viatura(uuid, uuid) to authenticated;
grant execute on function public.finalizar_ocorrencia(uuid, text, text, text) to authenticated;
grant execute on function public.marcar_chegada(uuid) to authenticated;
grant execute on function public.ocorrencia_bloqueada(uuid, public.ocorrencia_status) to authenticated;
grant execute on function public.plantao_editavel(uuid, uuid) to authenticated;

alter function public.admin_set_user_access(uuid, uuid, text, text, public.app_role)
  set search_path = public;
alter function public.has_role(uuid, public.app_role)
  set search_path = public;
alter function public.is_staff(uuid)
  set search_path = public;
