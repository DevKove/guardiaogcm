CREATE OR REPLACE FUNCTION public.validar_viatura_integrante_plantao()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.plantao_integrantes pi
    JOIN public.plantoes p ON p.id = pi.plantao_id
    WHERE pi.plantao_id = NEW.plantao_id
      AND pi.equipe_id = NEW.equipe_id
      AND p.status = 'aberto'
  ) THEN
    RAISE EXCEPTION 'A guarnição da viatura deve ser formada por integrante selecionado no plantão atual';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS viatura_integrante_plantao_check ON public.viatura_integrantes;
CREATE TRIGGER viatura_integrante_plantao_check
BEFORE INSERT OR UPDATE ON public.viatura_integrantes
FOR EACH ROW EXECUTE FUNCTION public.validar_viatura_integrante_plantao();

DROP TRIGGER IF EXISTS validar_supervisor_integrante ON public.plantao_integrantes;
DROP FUNCTION IF EXISTS public.validar_supervisor_integrante();
