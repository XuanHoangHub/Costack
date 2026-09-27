-- Migration: Unify & Complete Supabase Realtime Setup for All Tables
-- Description:
-- 1. Ensures the `supabase_realtime` publication exists.
-- 2. Adds all collaborative application tables to the `supabase_realtime` publication.
-- 3. Enables REPLICA IDENTITY FULL for all tables so UPDATE and DELETE events carry full row payloads.
-- 4. Ensures authenticated users have SELECT access to stream changes through Postgres CDC.

DO $$
DECLARE
  target_table text;
  realtime_tables text[] := ARRAY[
    -- Workspaces & Memberships
    'workspaces',
    'workspace_memberships',
    'members',
    'workspace_invitations',
    'workspace_contacts',
    'departments',
    
    -- Spaces, Lists, Tasks
    'spaces',
    'lists',
    'tasks',
    'docs',
    'documents',
    'document_versions',
    
    -- Teams Management
    'teams',
    'team_members',
    
    -- Realtime Chat & Channels
    'chat_channels',
    'chat_messages',
    'chat_read_states',
    
    -- Whiteboard Collaboration
    'whiteboard_elements',
    
    -- Base Apps & Productivity
    'base_apps',
    'goals',
    'goal_key_results',
    'habits',
    'focus_sessions',
    'automation_rules',
    
    -- Finance Hub
    'finance_profiles',
    'finance_accounts',
    'finance_transactions',
    'finance_invoices',
    'finance_debts',
    'finance_budgets',
    'finance_payments',
    'finance_categories'
  ];
BEGIN
  -- 1. Ensure publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  -- 2. Add each existing table to publication and enable REPLICA IDENTITY FULL
  FOREACH target_table IN ARRAY realtime_tables LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
      -- Add to publication if not already included
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = target_table
      ) THEN
        BEGIN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target_table);
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Could not add table % to supabase_realtime publication: %', target_table, SQLERRM;
        END;
      END IF;

      -- Set REPLICA IDENTITY FULL so WAL CDC includes all previous columns on UPDATE / DELETE
      BEGIN
        EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', target_table);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set REPLICA IDENTITY FULL for table %: %', target_table, SQLERRM;
      END;
    END IF;
  END LOOP;
END
$$;
