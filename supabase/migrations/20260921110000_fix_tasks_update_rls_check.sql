-- Migration: Fix tasks_update RLS WITH CHECK policy to include task creator and assignee
DROP POLICY IF EXISTS tasks_update ON public.tasks;

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
  user_id = (SELECT auth.uid())
  OR ("assigneeId" = (SELECT auth.uid())::text)
  OR (workspace_id IS NOT NULL AND private.is_workspace_member(workspace_id))
  OR (space_id IS NOT NULL AND private.can_edit_space(space_id))
  OR (list_id IS NOT NULL AND private.can_edit_list(list_id))
);
