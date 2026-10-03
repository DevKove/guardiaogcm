-- A revoked/non-staff account must not be able to write into an old open plantão.
CREATE OR REPLACE FUNCTION public.plantao_editavel(_plantao_id uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user = auth.uid()
    AND public.is_staff(auth.uid())
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.plantoes
        WHERE id = _plantao_id
          AND status = 'aberto'
          AND operador_id = auth.uid()
      )
    );
$$;
