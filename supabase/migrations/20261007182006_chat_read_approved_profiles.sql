create policy "authenticated read approved profiles for chat"
on public.profiles
for select
to authenticated
using (aprovado = true);