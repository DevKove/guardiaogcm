import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Search, Send, X, UserRound, Check, CheckCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ChatProfile = {
  id: string;
  nome: string;
  matricula: string | null;
};

type ChatMessage = {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  mensagem: string;
  lida_em: string | null;
  created_at: string;
};

export function ChatFlutuante() {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<ChatProfile[]>([]);
  const [selected, setSelected] = useState<ChatProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const filteredProfiles = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) return profiles;
    return profiles.filter((p) =>
      [p.nome, p.matricula ?? ""].some((value) =>
        value.toLocaleLowerCase("pt-BR").includes(term),
      ),
    );
  }, [profiles, search]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function loadUsers() {
      setLoadingUsers(true);
      const { data: authData } = await supabase.auth.getUser();
      if (cancelled) return;
      const userId = authData.user?.id ?? null;
      setCurrentUserId(userId);
      if (!userId) {
        setLoadingUsers(false);
        return;
      }

      const [{ data, error }, unreadResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,nome,matricula")
          .eq("aprovado", true)
          .neq("id", userId)
          .order("nome", { ascending: true }),
        supabase
          .from("mensagens_chat")
          .select("id", { count: "exact", head: true })
          .eq("destinatario_id", userId)
          .is("lida_em", null),
      ]);

      if (!cancelled) {
        if (!error) setProfiles((data ?? []) as ChatProfile[]);
        setUnread(unreadResult.count ?? 0);
        setLoadingUsers(false);
      }
    }

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !currentUserId) return;

    const channel = supabase
      .channel(`chat-mensagens-${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mensagens_chat" },
        (payload) => {
          const incoming = (payload.new ?? payload.old) as Partial<ChatMessage>;
          if (!incoming?.id) return;

          if (payload.eventType === "INSERT") {
            const msg = payload.new as ChatMessage;
            const belongsToCurrentUser =
              msg.remetente_id === currentUserId || msg.destinatario_id === currentUserId;
            if (!belongsToCurrentUser) return;

            if (
              selected &&
              ((msg.remetente_id === currentUserId && msg.destinatario_id === selected.id) ||
                (msg.remetente_id === selected.id && msg.destinatario_id === currentUserId))
            ) {
              setMessages((current) =>
                current.some((item) => item.id === msg.id) ? current : [...current, msg],
              );
              if (msg.destinatario_id === currentUserId && !msg.lida_em) {
                void supabase
                  .from("mensagens_chat")
                  .update({ lida_em: new Date().toISOString() })
                  .eq("id", msg.id);
              }
            } else if (msg.destinatario_id === currentUserId) {
              setUnread((count) => count + 1);
            }
          }

          if (payload.eventType === "UPDATE") {
            const msg = payload.new as ChatMessage;
            setMessages((current) =>
              current.map((item) => (item.id === msg.id ? msg : item)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [open, currentUserId, selected]);

  useEffect(() => {
    if (!selected || !currentUserId) {
      setMessages([]);
      return;
    }

    const userId = currentUserId;
    const selectedId = selected.id;
    let cancelled = false;

    async function loadConversation() {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from("mensagens_chat")
        .select("id,remetente_id,destinatario_id,mensagem,lida_em,created_at")
        .or(
          `and(remetente_id.eq.${userId},destinatario_id.eq.${selectedId}),and(remetente_id.eq.${selectedId},destinatario_id.eq.${userId})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);

      if (!cancelled) {
        if (!error) setMessages((data ?? []) as ChatMessage[]);
        setLoadingMessages(false);
      }

      await supabase
        .from("mensagens_chat")
        .update({ lida_em: new Date().toISOString() })
        .eq("destinatario_id", userId)
        .eq("remetente_id", selectedId)
        .is("lida_em", null);

      if (!cancelled) {
        setUnread((count) => Math.max(0, count - messages.filter((m) => m.destinatario_id === currentUserId && !m.lida_em).length));
      }
    }

    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [selected?.id, currentUserId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, selected]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !currentUserId || !selected || sending) return;
    if (text.length > 2000) return;

    setSending(true);
    const { data, error } = await supabase
      .from("mensagens_chat")
      .insert({
        remetente_id: currentUserId,
        destinatario_id: selected.id,
        mensagem: text,
      })
      .select("id,remetente_id,destinatario_id,mensagem,lida_em,created_at")
      .single();

    if (!error && data) {
      setMessages((current) =>
        current.some((item) => item.id === data.id) ? current : [...current, data as ChatMessage],
      );
      setDraft("");
    }
    setSending(false);
  }

  function closeChat() {
    setOpen(false);
    setSelected(null);
    setSearch("");
    setDraft("");
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[70] bg-slate-950/15 backdrop-blur-[1px] sm:pointer-events-none sm:bg-transparent">
          <section
            aria-label="Chat interno do CAD"
            className="pointer-events-auto fixed bottom-20 right-3 flex h-[min(680px,calc(100vh-6rem))] w-[min(940px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-cyan-400/20 bg-card text-card-foreground shadow-2xl ring-1 ring-black/20 sm:bottom-24 sm:right-5"
          >
            <aside className="flex w-[280px] shrink-0 flex-col border-r border-border bg-background/70">
              <div className="border-b border-border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em]">
                      <MessageCircle className="h-4 w-4 text-primary" />
                      Chat
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">Mensagens internas do CAD</div>
                  </div>
                  <button onClick={closeChat} className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Fechar chat">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Procurar usuário..."
                    className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {loadingUsers ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Carregando usuários...
                  </div>
                ) : filteredProfiles.length === 0 ? (
                  <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                    Nenhum usuário disponível para conversa.
                  </div>
                ) : (
                  filteredProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setSelected(profile)}
                      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${selected?.id === profile.id ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-accent"}`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <UserRound className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold">{profile.nome}</span>
                        <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                          {profile.matricula ? `Matrícula ${profile.matricula}` : "Usuário cadastrado"}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col bg-card">
              {!selected ? (
                <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <MessageCircle className="h-8 w-8" />
                  </div>
                  <h2 className="mt-4 text-lg font-black">Conversa interna</h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    Selecione um usuário cadastrado para iniciar uma conversa privada dentro do sistema.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">{selected.nome}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Usuário cadastrado</div>
                    </div>
                  </div>

                  <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-muted/20 px-4 py-4">
                    {loadingMessages ? (
                      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando conversa...
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                        Nenhuma mensagem ainda. Envie a primeira mensagem.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {messages.map((message) => {
                          const mine = message.remetente_id === currentUserId;
                          return (
                            <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-card text-card-foreground ring-1 ring-border"}`}>
                                <div className="whitespace-pre-wrap break-words">{message.mensagem}</div>
                                <div className={`mt-1.5 flex items-center justify-end gap-1 text-[9px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                  {new Date(message.created_at).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  {mine && (message.lida_em ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border bg-card p-3">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value.slice(0, 2000))}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.shiftKey) {
                            event.preventDefault();
                            void sendMessage();
                          }
                        }}
                        rows={2}
                        placeholder="Digite sua mensagem..."
                        className="min-h-11 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10"
                      />
                      <button
                        onClick={() => void sendMessage()}
                        disabled={!draft.trim() || sending}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Enviar mensagem"
                        title="Enviar mensagem"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="mt-1.5 text-right text-[9px] text-muted-foreground">{draft.length}/2000 · Enter envia · Shift+Enter quebra linha</div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {mounted && createPortal(<button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`!fixed !bottom-5 !right-5 !z-[9999] pointer-events-auto inline-flex h-14 items-center gap-2 rounded-full border border-cyan-300/30 bg-[#07131f] px-5 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[0_12px_36px_rgba(0,0,0,.35)] transition hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-[#0a1d2d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 sm:bottom-7 sm:right-7 ${open ? "ring-2 ring-cyan-400/30" : ""}`}
        aria-label={open ? "Fechar Chat" : "Abrir Chat"}
        title="Chat"
      >
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
          <MessageCircle className="h-5 w-5" />
          {unread > 0 && (
            <span
              className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-[#07131f] bg-red-600 px-1.5 text-[10px] font-black text-white shadow-[0_0_0_2px_rgba(239,68,68,.18),0_4px_14px_rgba(239,68,68,.45)] animate-pulse"
              aria-label={`${unread > 99 ? "99+" : unread} mensagem${unread === 1 ? "" : "ns"} pendente${unread === 1 ? "" : "s"}`}
              title={`${unread > 99 ? "99+" : unread} mensagem${unread === 1 ? "" : "ns"} pendente${unread === 1 ? "" : "s"}`}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
          {unread > 0 && (
            <span className="absolute -right-3 -top-3 h-2.5 w-2.5 rounded-full bg-red-400 shadow-[0_0_12px_rgba(248,113,113,.9)] animate-ping" aria-hidden="true" />
          )}
        </span>
        <span>Chat</span>
      </button>, document.body)}
    </>
  );
}
