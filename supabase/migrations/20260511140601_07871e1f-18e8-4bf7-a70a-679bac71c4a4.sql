-- Tables for "Folhas Acima da Espiga" evaluations
create table if not exists public.leaves_above_ear_evaluations (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null,
  org_id uuid not null,
  evaluation_date date not null,
  points_sampled int not null check (points_sampled > 0),
  avg_leaves numeric(5,2),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.leaves_above_ear_points (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.leaves_above_ear_evaluations(id) on delete cascade,
  point_number int not null,
  leaves_count numeric(5,2) not null,
  photo_url text,
  created_at timestamptz not null default now()
);

create index if not exists leaves_above_ear_eval_cycle_idx on public.leaves_above_ear_evaluations(cycle_id) where deleted_at is null;
create index if not exists leaves_above_ear_points_eval_idx on public.leaves_above_ear_points(evaluation_id);

alter table public.leaves_above_ear_evaluations enable row level security;
alter table public.leaves_above_ear_points enable row level security;

-- Evaluations RLS
create policy "rbac_select" on public.leaves_above_ear_evaluations
  for select to authenticated using (
    public.is_admin() or org_id = public.user_org_id()
  );
create policy "rbac_insert" on public.leaves_above_ear_evaluations
  for insert to authenticated with check (
    public.is_admin() or (
      org_id = public.user_org_id() and (
        public.has_role(auth.uid(), 'manager'::public.app_role) or
        public.has_role(auth.uid(), 'field_user'::public.app_role)
      )
    )
  );
create policy "rbac_update" on public.leaves_above_ear_evaluations
  for update to authenticated using (
    public.is_admin() or (
      org_id = public.user_org_id() and (
        public.has_role(auth.uid(), 'manager'::public.app_role) or
        public.has_role(auth.uid(), 'field_user'::public.app_role)
      )
    )
  );

-- Points RLS (inherit via parent)
create policy "rbac_select" on public.leaves_above_ear_points
  for select to authenticated using (
    exists (select 1 from public.leaves_above_ear_evaluations e
      where e.id = evaluation_id and (public.is_admin() or e.org_id = public.user_org_id()))
  );
create policy "rbac_insert" on public.leaves_above_ear_points
  for insert to authenticated with check (
    exists (select 1 from public.leaves_above_ear_evaluations e
      where e.id = evaluation_id and (public.is_admin() or e.org_id = public.user_org_id()))
  );
create policy "rbac_update" on public.leaves_above_ear_points
  for update to authenticated using (
    exists (select 1 from public.leaves_above_ear_evaluations e
      where e.id = evaluation_id and (public.is_admin() or e.org_id = public.user_org_id()))
  );