-- Reproduz o hardening de índices e permissões RPC do CAD.
-- Idempotente para permitir execução em bancos de preview.

create index if not exists idx_ocorrencias_plantao_id
  on public.ocorrencias (plantao_id);
create index if not exists idx_ocorrencias_posto_id
  on public.ocorrencias (posto_id);
create index if not exists idx_ocorrencias_viatura_id
  on public.ocorrencias (viatura_id);
create index if not exists idx_viaturas_ocorrencia_id
  on public.viaturas (ocorrencia_id);
create index if not exists idx_escalas_posto_id
  on public.escalas (posto_id);
create index if not exists idx_escalas_viatura_id
  on public.escalas (viatura_id);
create index if not exists idx_ocorrencia_envolvidos_ocorrencia_id
  on public.ocorrencia_envolvidos (ocorrencia_id);
create index if not exists idx_ocorrencia_historico_ocorrencia_id
  on public.ocorrencia_historico (ocorrencia_id);
create index if not exists idx_plantao_historico_plantao_id
  on public.plantao_historico (plantao_id);
create index if not exists idx_plantao_registros_plantao_id
  on public.plantao_registros (plantao_id);

revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.is_staff(uuid) from public;
revoke all on function public.admin_set_user_access(uuid, uuid, text, text, public.app_role) from public;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_staff(uuid) to authenticated;
grant execute on function public.admin_set_user_access(uuid, uuid, text, text, public.app_role) to authenticated;
