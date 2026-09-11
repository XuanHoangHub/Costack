-- Migration: Fix Spaces, Lists, and Tasks RLS and Schema Permissions
-- Grants USAGE on schema private to authenticated and anon
-- Fixes self-referential subqueries on spaces and lists
-- Synchronizes spaces and tasks between all workspace members

-- 1. Grant usage and function execute on schema private
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA private GRANT EXECUTE ON FUNCTIONS TO authenticated, anon, service_role;

-- 2. Update membership helper functions to support members.workspace_ids
CREATE OR REPLACE FUNCTION private.is_workspace_member(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = (SELECT auth.uid())
      AND wm.status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = target_workspace_id
      AND w.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.user_id = (SELECT auth.uid())
      AND target_workspace_id = ANY(COALESCE(m.workspace_ids, '{}'::text[]))
  );
$$;

CREATE OR REPLACE FUNCTION private.is_workspace_admin(target_workspace_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_memberships wm
    WHERE wm.workspace_id = target_workspace_id
      AND wm.user_id = (SELECT auth.uid())
      AND wm.status = 'active'
      AND wm.role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.workspaces w
    WHERE w.id = target_workspace_id
      AND w.user_id = (SELECT auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.user_id = (SELECT auth.uid())
      AND target_workspace_id = ANY(COALESCE(m.workspace_ids, '{}'::text[]))
      AND LOWER(COALESCE(m.role, 'member')) IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_space(target_space_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spaces s
    WHERE s.id = target_space_id
      AND (
        s.user_id = (SELECT auth.uid())
        OR private.is_workspace_admin(s.workspace_id)
        OR (
          private.is_workspace_member(s.workspace_id)
          AND (
            NOT COALESCE(s.is_private, false)
            OR COALESCE(s.share_settings, '{}'::jsonb) ? ((SELECT auth.uid())::text)
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_edit_space(target_space_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.spaces s
    WHERE s.id = target_space_id
      AND (
        s.user_id = (SELECT auth.uid())
        OR private.is_workspace_admin(s.workspace_id)
        OR (
          private.is_workspace_member(s.workspace_id)
          AND (
            NOT COALESCE(s.is_private, false)
            OR COALESCE(s.share_settings, '{}'::jsonb)->>((SELECT auth.uid())::text) = 'edit'
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_view_list(target_list_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lists l
    WHERE l.id = target_list_id
      AND (
        l.user_id = (SELECT auth.uid())
        OR (
          private.can_view_space(l.space_id)
          AND (
            NOT COALESCE(l.is_private, false)
            OR COALESCE(l.share_settings, '{}'::jsonb) ? ((SELECT auth.uid())::text)
            OR private.can_edit_space(l.space_id)
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION private.can_edit_list(target_list_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lists l
    WHERE l.id = target_list_id
      AND (
        l.user_id = (SELECT auth.uid())
        OR private.can_edit_space(l.space_id)
        OR COALESCE(l.share_settings, '{}'::jsonb)->>((SELECT auth.uid())::text) = 'edit'
      )
  );
$$;

-- 3. Replace RLS policies on spaces (direct column access, avoid self-referential subquery on upsert)
DROP POLICY IF EXISTS spaces_select ON public.spaces;
DROP POLICY IF EXISTS spaces_insert ON public.spaces;
DROP POLICY IF EXISTS spaces_update ON public.spaces;
DROP POLICY IF EXISTS spaces_delete ON public.spaces;

CREATE POLICY spaces_select ON public.spaces
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_workspace_admin(workspace_id)
  OR (
    private.is_workspace_member(workspace_id)
    AND (
      NOT COALESCE(is_private, false)
      OR COALESCE(share_settings, '{}'::jsonb) ? ((SELECT auth.uid())::text)
    )
  )
);

CREATE POLICY spaces_insert ON public.spaces
FOR INSERT TO authenticated
WITH CHECK (
  ((user_id = (SELECT auth.uid())) OR (user_id IS NULL))
  AND private.is_workspace_member(workspace_id)
);

CREATE POLICY spaces_update ON public.spaces
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_workspace_admin(workspace_id)
  OR (
    private.is_workspace_member(workspace_id)
    AND (
      NOT COALESCE(is_private, false)
      OR COALESCE(share_settings, '{}'::jsonb)->>((SELECT auth.uid())::text) = 'edit'
    )
  )
)
WITH CHECK (
  private.is_workspace_member(workspace_id)
);

CREATE POLICY spaces_delete ON public.spaces
FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.is_workspace_admin(workspace_id)
  OR (
    private.is_workspace_member(workspace_id)
    AND (
      NOT COALESCE(is_private, false)
      OR COALESCE(share_settings, '{}'::jsonb)->>((SELECT auth.uid())::text) = 'edit'
    )
  )
);

-- 4. Replace RLS policies on lists
DROP POLICY IF EXISTS lists_select ON public.lists;
DROP POLICY IF EXISTS lists_insert ON public.lists;
DROP POLICY IF EXISTS lists_update ON public.lists;
DROP POLICY IF EXISTS lists_delete ON public.lists;

CREATE POLICY lists_select ON public.lists
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (
    private.can_view_space(space_id)
    AND (
      NOT COALESCE(is_private, false)
      OR COALESCE(share_settings, '{}'::jsonb) ? ((SELECT auth.uid())::text)
      OR private.can_edit_space(space_id)
    )
  )
);

CREATE POLICY lists_insert ON public.lists
FOR INSERT TO authenticated
WITH CHECK (
  ((user_id = (SELECT auth.uid())) OR (user_id IS NULL))
  AND private.can_edit_space(space_id)
);

CREATE POLICY lists_update ON public.lists
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.can_edit_space(space_id)
  OR COALESCE(share_settings, '{}'::jsonb)->>((SELECT auth.uid())::text) = 'edit'
)
WITH CHECK (
  private.can_edit_space(space_id)
);

CREATE POLICY lists_delete ON public.lists
FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR private.can_edit_space(space_id)
  OR COALESCE(share_settings, '{}'::jsonb)->>((SELECT auth.uid())::text) = 'edit'
);

-- 5. Replace RLS policies on tasks
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;

CREATE POLICY tasks_select ON public.tasks
FOR SELECT TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR ("assigneeId" = (SELECT auth.uid())::text)
  OR (workspace_id IS NOT NULL AND private.is_workspace_member(workspace_id))
  OR (space_id IS NOT NULL AND private.can_view_space(space_id))
  OR (list_id IS NOT NULL AND private.can_view_list(list_id))
);

CREATE POLICY tasks_insert ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (
  ((user_id = (SELECT auth.uid())) OR (user_id IS NULL))
  AND (
    (workspace_id IS NOT NULL AND private.is_workspace_member(workspace_id))
    OR (space_id IS NOT NULL AND private.can_edit_space(space_id))
    OR (list_id IS NOT NULL AND private.can_edit_list(list_id))
  )
);

CREATE POLICY tasks_update ON public.tasks
FOR UPDATE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR ("assigneeId" = (SELECT auth.uid())::text)
  OR (workspace_id IS NOT NULL AND private.is_workspace_member(workspace_id))
  OR (space_id IS NOT NULL AND private.can_edit_space(space_id))
  OR (list_id IS NOT NULL AND private.can_edit_list(list_id))
)
WITH CHECK (
  (workspace_id IS NOT NULL AND private.is_workspace_member(workspace_id))
  OR (space_id IS NOT NULL AND private.can_edit_space(space_id))
  OR (list_id IS NOT NULL AND private.can_edit_list(list_id))
);

CREATE POLICY tasks_delete ON public.tasks
FOR DELETE TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (workspace_id IS NOT NULL AND private.is_workspace_admin(workspace_id))
  OR (space_id IS NOT NULL AND private.can_edit_space(space_id))
  OR (list_id IS NOT NULL AND private.can_edit_list(list_id))
);
