import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    if (req.method !== "POST") return response({ error: "Método não permitido." }, 405);

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

      return response({ data: result });
    }

    if (action === "save") {
      const input = body?.data;
      if (!input || typeof input !== "object") return response({ error: "Dados inválidos." }, 400);

      const email = String(input.email ?? "").trim().toLowerCase();
      const nome = String(input.nome ?? "").trim();
      const matricula = String(input.matricula ?? "").trim();
      const senha = String(input.senha ?? "");
      const role = String(input.role ?? "");

      if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) return response({ error: "E-mail inválido." }, 400);
      if (!nome || nome.length > 120) return response({ error: "Nome inválido." }, 400);
      if (matricula.length > 40) return response({ error: "Matrícula inválida." }, 400);
      if (!["admin", "supervisor", "operador"].includes(role)) return response({ error: "Perfil inválido." }, 400);
      if (senha && (senha.length < 6 || senha.length > 72)) return response({ error: "A senha deve ter entre 6 e 72 caracteres." }, 400);

      let id = input.id ? String(input.id) : "";
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
        if (!senha) return response({ error: "Informe uma senha para o novo usuário." }, 400);
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
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

      return response({ ok: true, id });
    }

    if (action === "delete") {
      const id = String(body?.id ?? "");
      if (!id) return response({ error: "Usuário inválido." }, 400);
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

      return response({ ok: true });
    }

    return response({ error: "Ação inválida." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    return response({ error: message }, message.includes("Acesso restrito") || message.includes("Não autenticado") || message.includes("Sessão inválida") ? 403 : 400);
  }
});
