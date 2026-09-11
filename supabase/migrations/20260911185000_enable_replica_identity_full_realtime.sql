-- Set REPLICA IDENTITY FULL for tables used in realtime synchronization
-- This ensures payload.old contains all fields (including id) on DELETE events
ALTER TABLE public.spaces REPLICA IDENTITY FULL;
ALTER TABLE public.lists REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.docs REPLICA IDENTITY FULL;
ALTER TABLE public.workspaces REPLICA IDENTITY FULL;
ALTER TABLE public.members REPLICA IDENTITY FULL;

-- Add base_apps to realtime publication if not already added
DO 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'base_apps'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.base_apps;
  END IF;
END ;
ALTER TABLE public.base_apps REPLICA IDENTITY FULL;
