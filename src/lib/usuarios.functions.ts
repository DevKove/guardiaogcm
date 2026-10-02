import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Role = z.enum(["admin", "supervisor", "operador"]);

async function assertAdmin(supabase: { rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => PromiseLike<{ data: unknown; error: unknown }> }, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || data !== true) throw new Error("Acesso restrito a administradores.");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const sa = await admin();
    const [{ data: auth, error }, { data: profs }, { data: roles }] = await Promise.all([
      sa.auth.admin.listUsers({ perPage: 1000 }),
      sa.from("profiles").select("id, nome, matricula"),
      sa.from("user_roles").select("user_id, role"),
    ]);
    if (error) throw new Error(error.message);
    return auth.users.map((u) => {
      const p = profs?.find((x) => x.id === u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        nome: p?.nome ?? "",
        matricula: p?.matricula ?? "",
        role: (roles?.find((r) => r.user_id === u.id)?.role ?? "operador") as z.infer<typeof Role>,
        ultimo_acesso: u.last_sign_in_at ?? null,
      };
    }).sort((a, b) => a.nome.localeCompare(b.nome));
  });

export const salvarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid().optional(),
      email: z.string().email().max(255),
      senha: z.string().min(6).max(72).optional().or(z.literal("")),
      nome: z.string().trim().min(1).max(120),
      matricula: z.string().trim().max(40).optional().default(""),
      role: Role,
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const sa = await admin();
    let id = data.id;
    let createdByThisRequest = false;
    if (id) {
      if (id === context.userId && data.role !== "admin") {
        throw new Error("Você não pode remover seu próprio perfil de administrador.");
      }
      // Fail early on a last-admin demotion; the database function repeats this check transactionally.
      if (data.role !== "admin") {
        const { data: existingRole, error: roleReadError } = await sa
          .from("user_roles").select("user_id").eq("user_id", id).eq("role", "admin").maybeSingle();
        if (roleReadError) throw new Error("Não foi possível validar o papel atual do usuário.");
        if (existingRole) {
          const { count, error: countError } = await sa
            .from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin");
          if (countError) throw new Error("Não foi possível validar a quantidade de administradores.");
          if ((count ?? 0) <= 1) throw new Error("Não é permitido remover o último administrador.");
        }
      }
      const { error } = await sa.auth.admin.updateUserById(id, {
        email: data.email,
        ...(data.senha ? { password: data.senha } : {}),
        user_metadata: { nome: data.nome, matricula: data.matricula },
      });
      if (error) throw new Error(error.message);
    } else {
      if (!data.senha) throw new Error("Informe uma senha para o novo usuário.");
      const { data: c, error } = await sa.auth.admin.createUser({
        email: data.email, password: data.senha, email_confirm: true,
        user_metadata: { nome: data.nome, matricula: data.matricula },
      });
      if (error) throw new Error(error.message);
      id = c.user.id;
      createdByThisRequest = true;
    }

    const { error: accessError } = await (sa as never as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    }).rpc("admin_set_user_access", {
      _actor: context.userId,
      _user_id: id,
      _nome: data.nome,
      _matricula: data.matricula,
      _role: data.role,
    });
    if (accessError) {
      if (createdByThisRequest) {
        const { error: rollbackError } = await sa.auth.admin.deleteUser(id);
        if (rollbackError) {
          throw new Error("Falha ao configurar acesso e não foi possível remover a conta recém-criada. Verifique o usuário no painel administrativo.");
        }
      }
      throw new Error("Não foi possível salvar perfil e permissões: " + accessError.message);
    }
    return { ok: true };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    if (data.id === context.userId) throw new Error("Você não pode excluir a si mesmo.");
    const sa = await admin();
    const { error: deleteError } = await sa.auth.admin.deleteUser(data.id);
    if (deleteError) throw new Error(deleteError.message);

    // Auth deletion is not part of a Postgres transaction; check every cleanup result and
    // report explicitly if orphaned application rows need administrator attention.
    const [{ error: rolesError }, { error: profileError }] = await Promise.all([
      sa.from("user_roles").delete().eq("user_id", data.id),
      sa.from("profiles").delete().eq("id", data.id),
    ]);
    if (rolesError || profileError) {
      throw new Error("A conta foi removida do Auth, mas houve falha ao limpar os dados associados. Solicite uma verificação administrativa.");
    }
    return { ok: true };
  });
