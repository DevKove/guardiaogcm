-- Scope SECURITY DEFINER helper functions to the caller's own identity.
-- This prevents authenticated users from probing roles or plantão state for arbitrary user IDs.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid() AND role = _role
     );
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = auth.uid()
     );
$$;

CREATE OR REPLACE FUNCTION public.plantao_editavel(_plantao_id uuid, _user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user = auth.uid()
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

CREATE OR REPLACE FUNCTION public.ocorrencia_bloqueada(_plantao_id uuid, _status public.ocorrencia_status)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.is_staff(auth.uid())
    AND _status IN ('encerrada', 'cancelada')
    AND EXISTS (
      SELECT 1 FROM public.plantoes
      WHERE id = _plantao_id AND status = 'encerrado'
    );
$$;

-- This function is callable only by service_role; validate the supplied actor directly
-- instead of using the caller-scoped has_role helper.
CREATE OR REPLACE FUNCTION public.admin_set_user_access(
  _actor uuid,
  _user_id uuid,
  _nome text,
  _matricula text,
  _role public.app_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _actor AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.';
  END IF;
  IF _user_id IS NULL OR length(trim(COALESCE(_nome, ''))) = 0 OR length(_nome) > 120 OR length(COALESCE(_matricula, '')) > 40 THEN
    RAISE EXCEPTION 'Dados de perfil inválidos.';
  END IF;

  IF _role <> 'admin' AND EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) AND (SELECT count(*) FROM public.user_roles WHERE role = 'admin') <= 1 THEN
    RAISE EXCEPTION 'Não é permitido remover o último administrador.';
  END IF;

  INSERT INTO public.profiles (id, nome, matricula)
  VALUES (_user_id, trim(_nome), NULLIF(trim(COALESCE(_matricula, '')), ''))
  ON CONFLICT (id) DO UPDATE
    SET nome = EXCLUDED.nome, matricula = EXCLUDED.matricula;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_access(uuid, uuid, text, text, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_access(uuid, uuid, text, text, public.app_role) TO service_role;
