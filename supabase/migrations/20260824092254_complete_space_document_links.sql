alter table public.docs
  add column if not exists workspace_id text,
  add column if not exists space_id text,
  add column if not exists folder_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint constraint_record
    join pg_attribute column_record
      on column_record.attrelid = constraint_record.conrelid
      and column_record.attnum = any (constraint_record.conkey)
    where constraint_record.conrelid = 'public.docs'::regclass
      and constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.workspaces'::regclass
      and column_record.attname = 'workspace_id'
  ) then
    alter table public.docs
      add constraint docs_workspace_id_fkey
      foreign key (workspace_id)
      references public.workspaces(id)
      on delete cascade
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint constraint_record
    join pg_attribute column_record
      on column_record.attrelid = constraint_record.conrelid
      and column_record.attnum = any (constraint_record.conkey)
    where constraint_record.conrelid = 'public.docs'::regclass
      and constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.spaces'::regclass
      and column_record.attname = 'space_id'
  ) then
    alter table public.docs
      add constraint docs_space_id_fkey
      foreign key (space_id)
      references public.spaces(id)
      on delete cascade;
  end if;
end
$$;

create index if not exists docs_workspace_space_idx
  on public.docs (workspace_id, space_id);

create index if not exists docs_space_folder_idx
  on public.docs (space_id, folder_id)
  where space_id is not null;
