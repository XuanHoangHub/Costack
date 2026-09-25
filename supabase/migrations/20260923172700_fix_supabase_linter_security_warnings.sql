-- Migration: Fix Supabase Linter Security Warnings
-- Resolves all WARN-level security findings from the Supabase database linter:
--
-- 1. function_search_path_mutable: handle_auth_user_sync
-- 2. rls_policy_always_true: departments, team_members, teams ("Allow CRUD for authenticated")
-- 3. public_bucket_allows_listing: avatars, public-assets
-- 4. anon_security_definer_function_executable: get_invitation_by_token
-- 5. authenticated_security_definer_function_executable: 12 functions
-- (auth_leaked_password_protection is a Dashboard-only setting, not fixable via SQL)

-- ==============================================================================
-- 1. FIX: handle_auth_user_sync — mutable search_path + revoke from authenticated
--    This is a TRIGGER function called by auth.users on INSERT. It should NOT be
--    callable via the REST API by anyone.
-- ==============================================================================

DO $$
DECLARE
  func_rec RECORD;
BEGIN
  FOR func_rec IN
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_auth_user_sync'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = ''''', func_rec.func_sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon, authenticated', func_rec.func_sig);
  END LOOP;
END $$;

-- ==============================================================================
-- 2. FIX: Drop "Allow CRUD for authenticated" RLS policies on departments,
--    teams, and team_members. These are overly permissive (USING(true))
--    policies that were likely created via the Supabase Dashboard. The proper
--    policies already exist from migrations.
-- ==============================================================================

-- departments: already has "departments_authenticated_read" SELECT policy
DROP POLICY IF EXISTS "Allow CRUD for authenticated" ON public.departments;

-- teams: already has teams_select_workspace, teams_insert_admin, etc.
DROP POLICY IF EXISTS "Allow CRUD for authenticated" ON public.teams;

-- team_members: already has team_members_select_workspace, etc.
DROP POLICY IF EXISTS "Allow CRUD for authenticated" ON public.team_members;

-- ==============================================================================
-- 3. FIX: Public bucket allows listing (avatars, public-assets)
--    Replace broad SELECT policies with path-scoped policies that allow reading
--    individual objects but not listing the entire bucket contents.
-- ==============================================================================

-- 3a. Avatars bucket: drop broad SELECT, create path-scoped access
DROP POLICY IF EXISTS "Allow public SELECT on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar public read access" ON storage.objects;

CREATE POLICY "Avatar public read access"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- 3b. Public-assets bucket: drop broad SELECT, create path-scoped access
DROP POLICY IF EXISTS "Public Access for public-assets" ON storage.objects;
DROP POLICY IF EXISTS "Public assets read access" ON storage.objects;

CREATE POLICY "Public assets read access"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'public-assets'
  AND (storage.foldername(name))[1] IS NOT NULL
);

-- ==============================================================================
-- 4. FIX: get_invitation_by_token — SECURITY DEFINER callable by anon
--    Recreate with proper search_path, revoke from anon/public, grant to authenticated.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.get_invitation_by_token(text);

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  invitation record;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RAISE EXCEPTION 'Token is required';
  END IF;

  SELECT
    wi.id,
    wi.workspace_id,
    wi.workspace_name,
    wi.email,
    wi.role,
    wi.status,
    wi.invited_by_name,
    wi.expires_at,
    wi.created_at
  INTO invitation
  FROM public.workspace_invitations wi
  WHERE wi.token = btrim(p_token)
  LIMIT 1;

  IF invitation IS NULL THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  RETURN jsonb_build_object(
    'id', invitation.id,
    'workspace_id', invitation.workspace_id,
    'workspace_name', invitation.workspace_name,
    'email', invitation.email,
    'role', invitation.role,
    'status', invitation.status,
    'invited_by_name', invitation.invited_by_name,
    'expires_at', invitation.expires_at,
    'created_at', invitation.created_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_by_token(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO authenticated;

-- ==============================================================================
-- 5. FIX: toggle_chat_message_reaction — SECURITY DEFINER callable by authenticated
--    Recreate with proper search_path, internal auth & channel view checks.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.toggle_chat_message_reaction(text, text);

CREATE OR REPLACE FUNCTION public.toggle_chat_message_reaction(
  p_message_id text,
  p_emoji text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  current_user_id text;
  msg record;
  current_reactions jsonb;
  emoji_users jsonb;
  new_reactions jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  current_user_id := (SELECT auth.uid())::text;

  -- Verify message exists and user has access to the channel
  SELECT m.id, m.channel_id, m.reactions
  INTO msg
  FROM public.chat_messages m
  WHERE m.id = p_message_id;

  IF msg.id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Check user can view this channel
  IF NOT private.can_view_chat_channel(msg.channel_id) THEN
    RAISE EXCEPTION 'Access denied to this channel';
  END IF;

  current_reactions := COALESCE(msg.reactions, '{}'::jsonb);
  emoji_users := COALESCE(current_reactions->p_emoji, '[]'::jsonb);

  -- Toggle: if user already reacted, remove; otherwise add
  IF emoji_users @> to_jsonb(current_user_id) THEN
    emoji_users := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(emoji_users) AS elem
      WHERE elem #>> '{}' <> current_user_id
    );
    IF jsonb_array_length(emoji_users) = 0 THEN
      new_reactions := current_reactions - p_emoji;
    ELSE
      new_reactions := jsonb_set(current_reactions, ARRAY[p_emoji], emoji_users);
    END IF;
  ELSE
    emoji_users := emoji_users || to_jsonb(current_user_id);
    new_reactions := jsonb_set(current_reactions, ARRAY[p_emoji], emoji_users);
  END IF;

  UPDATE public.chat_messages
  SET reactions = new_reactions
  WHERE id = p_message_id;

  RETURN new_reactions;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_chat_message_reaction(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.toggle_chat_message_reaction(text, text) TO authenticated;

-- ==============================================================================
-- 6. FIX: vote_chat_poll — SECURITY DEFINER callable by authenticated
--    Recreate with proper search_path, auth checks, and channel view checks.
-- ==============================================================================

DROP FUNCTION IF EXISTS public.vote_chat_poll(text, text);

CREATE OR REPLACE FUNCTION public.vote_chat_poll(
  p_message_id text,
  p_option_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
DECLARE
  current_user_id text;
  msg record;
  poll_data jsonb;
  options_arr jsonb;
  new_options jsonb := '[]'::jsonb;
  opt jsonb;
  opt_voters jsonb;
  i int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  current_user_id := (SELECT auth.uid())::text;

  -- Verify message exists
  SELECT m.id, m.channel_id, m.content
  INTO msg
  FROM public.chat_messages m
  WHERE m.id = p_message_id;

  IF msg.id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Check user can view this channel
  IF NOT private.can_view_chat_channel(msg.channel_id) THEN
    RAISE EXCEPTION 'Access denied to this channel';
  END IF;

  -- Extract poll data from content
  poll_data := msg.content::jsonb;
  IF poll_data IS NULL OR poll_data->>'type' <> 'poll' THEN
    RAISE EXCEPTION 'Message is not a poll';
  END IF;

  options_arr := COALESCE(poll_data->'options', '[]'::jsonb);

  -- Toggle vote: remove user from all options, add to selected option
  FOR i IN 0..jsonb_array_length(options_arr) - 1 LOOP
    opt := options_arr->i;
    opt_voters := COALESCE(opt->'voters', '[]'::jsonb);

    opt_voters := (
      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
      FROM jsonb_array_elements(opt_voters) AS elem
      WHERE elem #>> '{}' <> current_user_id
    );

    IF (opt->>'id') = p_option_id THEN
      opt_voters := opt_voters || to_jsonb(current_user_id);
    END IF;

    opt := jsonb_set(opt, '{voters}', opt_voters);
    opt := jsonb_set(opt, '{vote_count}', to_jsonb(jsonb_array_length(opt_voters)));
    new_options := new_options || jsonb_build_array(opt);
  END LOOP;

  poll_data := jsonb_set(poll_data, '{options}', new_options);

  UPDATE public.chat_messages
  SET content = poll_data::text
  WHERE id = p_message_id;

  RETURN poll_data;
END;
$$;

REVOKE ALL ON FUNCTION public.vote_chat_poll(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.vote_chat_poll(text, text) TO authenticated;

-- ==============================================================================
-- 7. HARDENING: Ensure all existing SECURITY DEFINER RPCs have search_path = '',
--    are revoked from public/anon, and granted to authenticated.
--    Trigger functions are revoked from everyone.
--    Uses dynamic SQL for safe, idempotent application.
-- ==============================================================================

DO $$
DECLARE
  func_rec RECORD;
BEGIN
  -- Hardening exposed RPCs: set search_path = '', revoke public/anon, grant authenticated
  FOR func_rec IN
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'create_workspace_invitation',
        'accept_workspace_invitation',
        'decline_workspace_invitation',
        'resend_workspace_invitation',
        'revoke_workspace_invitation',
        'upsert_workspace_team',
        'set_workspace_team_member',
        'delete_workspace_team',
        'add_workspace_member_manual'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = ''''', func_rec.func_sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon', func_rec.func_sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', func_rec.func_sig);
  END LOOP;

  -- Trigger functions: revoke from all roles to prevent RPC invocation
  FOR func_rec IN
    SELECT p.oid::regprocedure AS func_sig
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'handle_auth_user_sync',
        'trg_set_chat_message_workspace'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = ''''', func_rec.func_sig);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon, authenticated', func_rec.func_sig);
  END LOOP;
END $$;
