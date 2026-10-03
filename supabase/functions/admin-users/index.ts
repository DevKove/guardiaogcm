import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://devkove.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function response(body: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function secretKey() {
  const raw = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.default) return parsed.default;
    } catch {
      // Fall through to the legacy key.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function publishableKey() {
  const raw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.default) return parsed.default;
    } catch {
      // Fall through to the legacy key.
    }
  }
  return Deno.env.get("SUPABASE_ANON_KEY") ?? "";
}

async function authorize(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = publishableKey();
  const auth = req.headers.get("Authorization") ?? "";
  if (!url || !key || !auth.startsWith("Bearer ")) {
    throw new Error("Não autenticado.");
  }

  const token = auth.slice(7).trim();
  if (!token) throw new Error("Não autenticado.");

  const userClient = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new Error("Sessão inválida.");

  const admin = createClient(url, secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: role, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) throw new Error("Acesso restrito a administradores.");

  return { admin, actorId: data.user.id };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const respond = (body: unknown, status = 200) => response(body, status, origin);

  if (req.method === "OPTIONS") {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403, headers: { "Vary": "Origin" } });
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  try {
    if (origin && !ALLOWED_ORIGINS.has(origin)) return respond({ error: "Origem não permitida." }, 403);
    if (req.method !== "POST") return respond({ error: "Método não permitido." }, 405);
    const contentLength = Number(req.headers.get("Content-Length") ?? "0");
    if (contentLength > 32768) return respond({ error: "Requisição muito grande." }, 413);

    const { admin, actorId } = await authorize(req);
    const body = await req.json();
    const action = body?.action;

    if (action === "list") {
      const [{ data: authData, error: authError }, { data: profiles }, { data: roles }] =
        await Promise.all([
          admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
          admin.from("profiles").select("id, nome, matricula"),
          admin.from("user_roles").select("user_id, role"),
        ]);

      if (authError) throw new Error(authError.message);

      const result = authData.users.map((u) => {
        const profile = profiles?.find((p) => p.id === u.id);
        const role = roles?.find((r) => r.user_id === u.id)?.role ?? "operador";
        return {
          id: u.id,
          email: u.email ?? "",
          nome: profile?.nome ?? "",
          matricula: profile?.matricula ?? "",
          role,
          ultimo_acesso: u.last_sign_in_at ?? null,
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome));

      return respond({ data: result });
    }

    if (action === "save") {
      const input = body?.data;
      if (!input || typeof input !== "object") return respond({ error: "Dados inválidos." }, 400);

      const email = String(input.email ?? "").trim().toLowerCase();
      const nome = String(input.nome ?? "").trim();
      const matricula = String(input.matricula ?? "").trim();
      const senha = String(input.senha ?? "");
      const role = String(input.role ?? "");

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond({ error: "E-mail inválido." }, 400);
      if (!nome || nome.length > 120) return respond({ error: "Nome inválido." }, 400);
      if (matricula.length > 40) return respond({ error: "Matrícula inválida." }, 400);
      if (!["admin", "supervisor", "operador"].includes(role)) return respond({ error: "Perfil inválido." }, 400);
      if (senha && (senha.length < 12 || senha.length > 72)) return respond({ error: "A senha deve ter entre 12 e 72 caracteres." }, 400);

      let id = input.id ? String(input.id).trim() : "";\n      if (id && !isUuid(id)) return respond({ error: "Usuário inválido." }, 400);
      let created = false;

      if (id) {
        if (id === actorId && role !== "admin") throw new Error("Você não pode remover seu próprio perfil de administrador.");

        if (role !== "admin") {
          const { data: currentRole } = await admin.from("user_roles").select("user_id").eq("user_id", id).eq("role", "admin").maybeSingle();
          if (currentRole) {
            const { count } = await admin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
            if ((count ?? 0) <= 1) throw new Error("Não é permitido remover o último administrador.");
          }
        }

        const { error } = await admin.auth.admin.updateUserById(id, {
          email,
          ...(senha ? { password: senha } : {}),
          user_metadata: { nome, matricula },
        });
        if (error) throw new Error(error.message);
      } else {
        if (!senha) return respond({ error: "Informe uma senha para o novo usuário." }, 400);
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
          app_metadata: { cad_provisioned: true },
          user_metadata: { nome, matricula },
        });
        if (error || !data.user) throw new Error(error?.message ?? "Não foi possível criar o usuário.");
        id = data.user.id;
        created = true;
      }

      const { error: accessError } = await admin.rpc("admin_set_user_access", {
        _actor: actorId,
        _user_id: id,
        _nome: nome,
        _matricula: matricula,
        _role: role,
      });

      if (accessError) {
        if (created) await admin.auth.admin.deleteUser(id);
        throw new Error("Não foi possível salvar perfil e permissões: " + accessError.message);
      }

      return respond({ ok: true, id });
    }

    if (action === "delete") {
      const id = String(body?.id ?? "");
      if (!id) return respond({ error: "Usuário inválido." }, 400);
      if (id === actorId) throw new Error("Você não pode excluir a si mesmo.");

      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) throw new Error(error.message);

      const [{ error: rolesError }, { error: profileError }] = await Promise.all([
        admin.from("user_roles").delete().eq("user_id", id),
        admin.from("profiles").delete().eq("id", id),
      ]);

      if (rolesError || profileError) {
        throw new Error("A conta foi removida do Auth, mas houve falha na limpeza dos dados associados.");
      }

      return respond({ ok: true });
    }

    return respond({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const safeMessages = [
      "Não autenticado.",
      "Sessão inválida.",
      "Acesso restrito a administradores.",
      "Você não pode remover seu próprio perfil de administrador.",
      "Não é permitido remover o último administrador.",
      "Não foi possível salvar perfil e permissões.",
    ];
    const safe = safeMessages.find((item) => message === item || message.startsWith(item));
    console.error("admin-users request failed", { name: error instanceof Error ? error.name : "UnknownError" });
    if (safe) {
      const status = safe.startsWith("Não autenticado") || safe.startsWith("Sessão inválida") || safe.startsWith("Acesso restrito") ? 403 : 400;
      return respond({ error: safe }, status);
    }
    return respond({ error: "Não foi possível concluir a solicitação. Verifique os dados e tente novamente." }, 500);
  }
});
