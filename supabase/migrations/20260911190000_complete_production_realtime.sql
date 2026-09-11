-- Migration: Complete Production Realtime Setup
-- Ensures all collaborative & dynamic tables are part of supabase_realtime publication
-- and configured with REPLICA IDENTITY FULL so DELETE/UPDATE events contain all row data for filters.

-- 1. Add missing tables to supabase_realtime publication
DO $$
DECLARE
  target_table text;
  tables_to_add text[] := ARRAY[
    'documents',
    'workspace_contacts',
    'departments',
    'chat_read_states',
    'goals',
    'goal_key_results',
    'habits',
    'focus_sessions',
    'automation_rules'
  ];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH target_table IN ARRAY tables_to_add
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = target_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', target_table);
      END IF;
    END LOOP;
  END IF;
END $$;

-- 2. Enable REPLICA IDENTITY FULL for all realtime tables
-- This guarantees that WAL replication payloads on DELETE include all previous columns,
-- allowing client-side filters (e.g., workspace_id=eq..., document_id=eq...) to match properly.

-- Documents & Workspace
ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER TABLE public.workspace_contacts REPLICA IDENTITY FULL;
ALTER TABLE public.departments REPLICA IDENTITY FULL;
ALTER TABLE public.chat_read_states REPLICA IDENTITY FULL;

-- Goals & Productivity
ALTER TABLE public.goals REPLICA IDENTITY FULL;
ALTER TABLE public.goal_key_results REPLICA IDENTITY FULL;
ALTER TABLE public.habits REPLICA IDENTITY FULL;
ALTER TABLE public.focus_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.automation_rules REPLICA IDENTITY FULL;

-- Finance Hub (Fix missing DELETE events due to workspace_id filter)
ALTER TABLE public.finance_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.finance_accounts REPLICA IDENTITY FULL;
ALTER TABLE public.finance_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.finance_invoices REPLICA IDENTITY FULL;
ALTER TABLE public.finance_debts REPLICA IDENTITY FULL;
ALTER TABLE public.finance_budgets REPLICA IDENTITY FULL;
ALTER TABLE public.finance_payments REPLICA IDENTITY FULL;
ALTER TABLE public.finance_categories REPLICA IDENTITY FULL;
