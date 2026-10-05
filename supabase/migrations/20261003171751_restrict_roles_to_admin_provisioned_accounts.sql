CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, matricula)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', ''),
    NULLIF(NEW.raw_user_meta_data->>'matricula', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Only accounts created through the trusted administrator workflow receive a role.
  -- raw_app_meta_data is admin-managed; raw_user_meta_data is user-editable and must
  -- never be used to authorize access.
  IF COALESCE(NEW.raw_app_meta_data->>'cad_provisioned', 'false') = 'true' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'operador')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
