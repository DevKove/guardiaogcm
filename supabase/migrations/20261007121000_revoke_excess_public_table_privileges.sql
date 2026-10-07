DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM anon', r.table_schema, r.table_name);
    EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE %I.%I FROM authenticated', r.table_schema, r.table_name);
  END LOOP;
END $$;
