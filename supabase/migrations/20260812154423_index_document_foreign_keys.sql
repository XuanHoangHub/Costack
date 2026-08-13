create index if not exists idx_document_comments_document_created
  on public.document_comments (document_id, created_at);
create index if not exists idx_document_comments_parent
  on public.document_comments (parent_comment_id)
  where parent_comment_id is not null;
create index if not exists idx_document_comments_user
  on public.document_comments (user_id);
create index if not exists idx_document_versions_created_by
  on public.document_versions (created_by)
  where created_by is not null;
