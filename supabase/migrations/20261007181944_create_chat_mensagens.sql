create table if not exists public.mensagens_chat (
  id uuid primary key default gen_random_uuid(),
  remetente_id uuid not null references public.profiles(id) on delete cascade,
  destinatario_id uuid not null references public.profiles(id) on delete cascade,
  mensagem text not null,
  lida_em timestamptz,
  created_at timestamptz not null default now(),
  constraint mensagens_chat_nao_para_si check (remetente_id <> destinatario_id),
  constraint mensagens_chat_mensagem_tamanho check (char_length(btrim(mensagem)) between 1 and 2000)
);

create index if not exists idx_mensagens_chat_participantes
  on public.mensagens_chat (remetente_id, destinatario_id, created_at desc);

create index if not exists idx_mensagens_chat_destinatario_nao_lidas
  on public.mensagens_chat (destinatario_id, created_at desc)
  where lida_em is null;

alter table public.mensagens_chat enable row level security;

grant select, insert, update on public.mensagens_chat to authenticated;

create policy "chat participantes leem mensagens"
on public.mensagens_chat for select to authenticated
using ((select auth.uid()) = remetente_id or (select auth.uid()) = destinatario_id);

create policy "chat usuario envia mensagem"
on public.mensagens_chat for insert to authenticated
with check (
  (select auth.uid()) = remetente_id
  and remetente_id <> destinatario_id
  and exists (select 1 from public.profiles p where p.id = destinatario_id and p.aprovado = true)
  and exists (select 1 from public.profiles p where p.id = remetente_id and p.aprovado = true)
);

create policy "chat destinatario marca como lida"
on public.mensagens_chat for update to authenticated
using ((select auth.uid()) = destinatario_id)
with check (
  (select auth.uid()) = destinatario_id
  and remetente_id <> destinatario_id
  and lida_em is not null
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'mensagens_chat'
  ) then
    alter publication supabase_realtime add table public.mensagens_chat;
  end if;
end $$;