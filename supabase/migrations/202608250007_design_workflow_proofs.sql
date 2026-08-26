begin;

-- 1. Add timestamps for acceptance & customer approval on jobs table
alter table public.jobs
  add column if not exists accepted_at timestamptz,
  add column if not exists approved_at timestamptz;

-- 2. Design proofs history table
create table if not exists public.job_design_proofs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  job_id uuid not null references public.jobs(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  image_url text not null,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists job_design_proofs_job_idx on public.job_design_proofs (job_id, version desc);

-- 3. Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid references public.profiles(id),
  job_id uuid references public.jobs(id) on delete cascade,
  notification_type text not null check (notification_type in ('JOB_ASSIGNED', 'CUSTOMER_APPROVED', 'REVISION_REQUESTED', 'GENERAL')),
  title text not null,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_read_idx on public.notifications (recipient_id, is_read, created_at desc);

commit;
