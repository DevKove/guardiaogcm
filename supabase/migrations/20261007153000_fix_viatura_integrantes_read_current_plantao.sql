-- Permite que qualquer servidor operacional consulte a guarnição das viaturas
-- do plantão aberto. A escrita continua protegida pelas políticas existentes.
drop policy if exists "staff read viatura integrantes" on public.viatura_integrantes;

create policy "staff read viatura integrantes"
on public.viatura_integrantes
for select
to authenticated
using (
  is_staff(auth.uid())
  and exists (
    select 1
    from public.plantoes p
    where p.id = viatura_integrantes.plantao_id
      and p.status = 'aberto'
  )
);
