import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "supervisor" | "operador";

export type Usuario = {
  id: string;
  email: string;
  nome: string;
  matricula: string;
  role: Role;
  ultimo_acesso: string | null;
};

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-users", { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const data = await invoke({ action: "list" });
  return data.data as Usuario[];
}

export async function salvarUsuario(data: {
  id?: string;
  email: string;
  senha: string;
  nome: string;
  matricula: string;
  role: Role;
}) {
  return invoke({ action: "save", data });
}

export async function excluirUsuario(id: string) {
  return invoke({ action: "delete", id });
}
