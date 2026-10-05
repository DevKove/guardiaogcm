import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const r = (roles ?? []).map((x) => x.role);
      return {
        id: u.user.id,
        email: u.user.email ?? "",
        nome: profile?.nome || u.user.email || "",
        matricula: profile?.matricula ?? null,
        aprovado: profile?.aprovado ?? false,
        roles: r,
        isAdmin: r.includes("admin"),
        isSupervisor: r.includes("admin") || r.includes("supervisor"),
      };
    },
  });
}
