-- Migration Script: Docs & Collaborative Block Editor Module

-- Table: documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id TEXT NOT NULL,
    parent_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    icon TEXT,
    cover_url TEXT,
    content JSONB DEFAULT '{"type":"doc","content":[]}'::jsonb,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Table: document_collaborators
CREATE TABLE IF NOT EXISTS public.document_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'commenter', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (document_id, user_id)
);

-- Table: document_comments
CREATE TABLE IF NOT EXISTS public.document_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL, -- ID of the block/node the comment is attached to
    content TEXT NOT NULL,
    is_resolved BOOLEAN NOT NULL DEFAULT false,
    parent_comment_id UUID REFERENCES public.document_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_documents_workspace ON public.documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_parent ON public.documents(parent_document_id);
CREATE INDEX IF NOT EXISTS idx_documents_content_gin ON public.documents USING gin (content);
CREATE INDEX IF NOT EXISTS idx_document_collaborators_user ON public.document_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_document_collaborators_doc ON public.document_collaborators(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_doc ON public.document_comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_comments_block ON public.document_comments(block_id);

-- Enable Row-Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user has access to a workspace
CREATE OR REPLACE FUNCTION public.check_user_workspace_access(workspace_id TEXT, user_id UUID)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.members 
        WHERE members.user_id = check_user_workspace_access.user_id 
        AND check_user_workspace_access.workspace_id = ANY(members.workspace_ids)
    );
END;
$$ LANGUAGE plpgsql;

-- Helper function to check if a user is a collaborator with specific roles
CREATE OR REPLACE FUNCTION public.check_user_document_collaborator(document_id UUID, user_id UUID, check_roles TEXT[])
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.document_collaborators 
        WHERE document_collaborators.document_id = check_user_document_collaborator.document_id 
        AND document_collaborators.user_id = check_user_document_collaborator.user_id
        AND document_collaborators.role = ANY(check_roles)
    );
END;
$$ LANGUAGE plpgsql;

-- Drop existing policies if they exist to prevent errors on rerun
DROP POLICY IF EXISTS "Users can read documents in their workspace or if shared" ON public.documents;
DROP POLICY IF EXISTS "Users can insert documents in their workspace" ON public.documents;
DROP POLICY IF EXISTS "Users can update documents in their workspace or if editors/owners" ON public.documents;
DROP POLICY IF EXISTS "Users can delete documents they own or if they are owner collaborators" ON public.documents;
DROP POLICY IF EXISTS "Users can read collaborator list if they have access to document" ON public.document_collaborators;
DROP POLICY IF EXISTS "Owners and editors can modify collaborators" ON public.document_collaborators;
DROP POLICY IF EXISTS "Users can read comments if they can read the document" ON public.document_comments;
DROP POLICY IF EXISTS "Users can insert comments if they can comment on the document" ON public.document_comments;
DROP POLICY IF EXISTS "Users can modify their own comments" ON public.document_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.document_comments;

-- RLS Policies for public.documents
CREATE POLICY "Users can read documents in their workspace or if shared" ON public.documents
    FOR SELECT
    USING (
        public.check_user_workspace_access(workspace_id, auth.uid()) OR
        public.check_user_document_collaborator(id, auth.uid(), ARRAY['owner', 'editor', 'commenter', 'viewer']) OR
        is_published = true
    );

CREATE POLICY "Users can insert documents in their workspace" ON public.documents
    FOR INSERT
    WITH CHECK (
        public.check_user_workspace_access(workspace_id, auth.uid()) AND
        auth.uid() = user_id
    );

CREATE POLICY "Users can update documents in their workspace or if editors/owners" ON public.documents
    FOR UPDATE
    USING (
        public.check_user_workspace_access(workspace_id, auth.uid()) OR
        public.check_user_document_collaborator(id, auth.uid(), ARRAY['owner', 'editor'])
    );

CREATE POLICY "Users can delete documents they own or if they are owner collaborators" ON public.documents
    FOR DELETE
    USING (
        auth.uid() = user_id OR
        public.check_user_document_collaborator(id, auth.uid(), ARRAY['owner'])
    );

-- RLS Policies for public.document_collaborators
CREATE POLICY "Users can read collaborator list if they have access to document" ON public.document_collaborators
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents 
            WHERE documents.id = document_collaborators.document_id AND
            (
                public.check_user_workspace_access(documents.workspace_id, auth.uid()) OR
                public.check_user_document_collaborator(documents.id, auth.uid(), ARRAY['owner', 'editor', 'commenter', 'viewer'])
            )
        )
    );

CREATE POLICY "Owners and editors can modify collaborators" ON public.document_collaborators
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.documents 
            WHERE documents.id = document_collaborators.document_id AND
            (
                documents.user_id = auth.uid() OR
                public.check_user_document_collaborator(documents.id, auth.uid(), ARRAY['owner'])
            )
        )
    );

-- RLS Policies for public.document_comments
CREATE POLICY "Users can read comments if they can read the document" ON public.document_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.documents 
            WHERE documents.id = document_comments.document_id AND
            (
                public.check_user_workspace_access(documents.workspace_id, auth.uid()) OR
                public.check_user_document_collaborator(documents.id, auth.uid(), ARRAY['owner', 'editor', 'commenter', 'viewer'])
            )
        )
    );

CREATE POLICY "Users can insert comments if they can comment on the document" ON public.document_comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.documents 
            WHERE documents.id = document_comments.document_id AND
            (
                public.check_user_workspace_access(documents.workspace_id, auth.uid()) OR
                public.check_user_document_collaborator(documents.id, auth.uid(), ARRAY['owner', 'editor', 'commenter'])
            )
        ) AND
        auth.uid() = user_id
    );

CREATE POLICY "Users can modify their own comments" ON public.document_comments
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.document_comments
    FOR DELETE
    USING (auth.uid() = user_id);
