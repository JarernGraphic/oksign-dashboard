begin;

-- 1. Enable RLS and add policies for notifications and design proofs
alter table public.job_design_proofs enable row level security;
alter table public.notifications enable row level security;

drop policy if exists job_design_proofs_org_all on public.job_design_proofs;
create policy job_design_proofs_org_all on public.job_design_proofs
  for all to authenticated
  using (organization_id = public.current_organization_id())
  with check (organization_id = public.current_organization_id());

drop policy if exists notifications_org_all on public.notifications;
create policy notifications_org_all on public.notifications
  for all to authenticated
  using (organization_id = public.current_organization_id())
  with check (organization_id = public.current_organization_id());

-- 2. Update create_job_from_brief to ALWAYS set initial stage to 'ADMIN'
create or replace function public.create_job_from_brief(
  target_customer_id uuid, job_title text, brief_requirements text,
  brief_dimensions text, brief_material text, brief_quantity integer,
  target_deadline timestamptz, target_priority text, total_satang bigint,
  target_graphic_id uuid default null
) returns uuid language plpgsql set search_path = '' as $$
declare target_organization uuid := public.current_organization_id(); new_brief_id uuid; new_job_id uuid;
begin
  if auth.uid() is null or target_organization is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.customers where id = target_customer_id and organization_id = target_organization and deleted_at is null) then raise exception 'customer_not_found'; end if;
  insert into public.briefs (organization_id, customer_id, title, requirements, dimensions, material, quantity, deadline, status, created_by)
  values (target_organization, target_customer_id, job_title, brief_requirements, nullif(brief_dimensions,''), nullif(brief_material,''), brief_quantity, target_deadline, 'CONVERTED', auth.uid()) returning id into new_brief_id;
  
  -- ALWAYS set initial stage to 'ADMIN' (รับงาน) so that it requires Graphic to click Accept Job to move to 'DESIGN'
  insert into public.jobs (organization_id, job_number, customer_id, brief_id, title, stage, design_status, priority, deadline, assigned_admin_id, assigned_graphic_id, grand_total_satang, created_by)
  values (target_organization, '', target_customer_id, new_brief_id, job_title, 'ADMIN', 'WAITING_DESIGN', target_priority, target_deadline, auth.uid(), target_graphic_id, total_satang, auth.uid()) returning id into new_job_id;
  
  insert into public.activity_logs (organization_id, entity_type, entity_id, action, user_id, metadata)
  values (target_organization, 'JOB', new_job_id, 'JOB_CREATED', auth.uid(), jsonb_build_object('brief_id', new_brief_id));
  return new_job_id;
end;
$$;

-- 3. Correct any existing jobs that haven't been accepted yet to be at stage 'ADMIN'
update public.jobs
set stage = 'ADMIN', design_status = 'WAITING_DESIGN'
where accepted_at is null and stage = 'DESIGN';

commit;
