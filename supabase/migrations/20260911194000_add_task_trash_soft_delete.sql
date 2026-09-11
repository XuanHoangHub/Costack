-- Migration: Add deleted_at to tasks table for Task Trash (soft-delete) support
-- Description: Enables safe task deletion with restore / trash recovery capabilities

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON public.tasks (deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_deleted_at ON public.tasks (workspace_id, deleted_at);
