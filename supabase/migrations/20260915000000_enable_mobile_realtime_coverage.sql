-- Mobile subscribes to the same collaborative tables as the web client.
-- Older project setups did not consistently add the legacy task/chat tables
-- to `supabase_realtime`, so the socket could connect but receive no changes.
DO $$
DECLARE
  target_table text;
  realtime_tables text[] := ARRAY[
    'workspaces',
    'workspace_memberships',
    'members',
    'spaces',
    'lists',
    'tasks',
    'docs',
    'documents',
    'chat_channels',
    'chat_messages',
    'finance_profiles',
    'finance_accounts',
    'finance_transactions',
    'finance_categories'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH target_table IN ARRAY realtime_tables LOOP
    IF to_regclass(format('public.%I', target_table)) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = target_table
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', target_table);
      END IF;

      -- Filters on workspace_id and DELETE handling both require the old row.
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', target_table);
    END IF;
  END LOOP;
END
$$;
