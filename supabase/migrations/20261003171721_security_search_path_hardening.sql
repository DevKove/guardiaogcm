-- Avoid object resolution through a caller-controlled search_path.
ALTER FUNCTION public.touch_equipe_updated_at() SET search_path = pg_catalog;
