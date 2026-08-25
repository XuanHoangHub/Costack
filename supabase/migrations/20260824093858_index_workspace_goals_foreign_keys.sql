create index if not exists goals_created_by_idx
  on public.goals (created_by);

create index if not exists goals_owner_id_idx
  on public.goals (owner_id)
  where owner_id is not null;

create index if not exists goal_key_results_owner_id_idx
  on public.goal_key_results (owner_id)
  where owner_id is not null;
