-- Migration: Fix tasks priority not-null constraint and ensure default is 'medium'
-- Allows clearing task priority or defaulting to medium seamlessly without constraint violations

ALTER TABLE public.tasks ALTER COLUMN priority SET DEFAULT 'medium';

DO $$
BEGIN
  ALTER TABLE public.tasks ALTER COLUMN priority DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
