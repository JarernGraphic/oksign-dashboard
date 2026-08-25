begin;

create table public.running_counters (
  organization_id uuid not null references public.organizations(id),
  counter_type text not null check (counter_type in ('CUSTOMER','JOB','QUOTATION')),
  counter_year integer not null default 0,
  current_value integer not null default 0 check (current_value >= 0),
  updated_at timestamptz not null default now(),
  primary key (organization_id, counter_type, counter_year)
);

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  name text not null check (char_length(name) between 1 and 80),
  source_type text not null default 'OTHER' check (source_type in ('LINE','FACEBOOK','PHONE','WALK_IN','OTHER')),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, name)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  customer_number text not null,
  customer_type text not null default 'PERSON' check (customer_type in ('PERSON','BUSINESS')),
  name text not null check (char_length(name) between 2 and 160),
  phone text,
  email text,
  line_name text,
  facebook_name text,
  tax_id text,
  address text,
  lead_source_id uuid references public.lead_sources(id),
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, customer_number)
);

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  customer_id uuid not null references public.customers(id),
  title text not null check (char_length(title) between 2 and 180),
  requirements text not null,
  dimensions text,
  material text,
  quantity integer not null default 1 check (quantity > 0),
  budget_satang bigint check (budget_satang is null or budget_satang >= 0),
  deadline timestamptz,
  status text not null default 'DRAFT' check (status in ('DRAFT','PRICED','ACCEPTED','CONVERTED','CANCELLED')),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  job_number text not null,
  customer_id uuid not null references public.customers(id),
  brief_id uuid references public.briefs(id),
  title text not null check (char_length(title) between 2 and 180),
  stage text not null default 'ADMIN' check (stage in ('ADMIN','DESIGN','PRODUCTION','DELIVERY','COMPLETE')),
  status text not null default 'OPEN' check (status in ('OPEN','ON_HOLD','COMPLETED','CANCELLED')),
  design_status text not null default 'WAITING_DESIGN' check (design_status in ('WAITING_DESIGN','DESIGNING','WAITING_CUSTOMER','REVISION','APPROVED')),
  priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  deadline timestamptz,
  assigned_admin_id uuid references public.profiles(id),
  assigned_graphic_id uuid references public.profiles(id),
  grand_total_satang bigint not null default 0 check (grand_total_satang >= 0),
  paid_amount_satang bigint not null default 0 check (paid_amount_satang >= 0 and paid_amount_satang <= grand_total_satang),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  deleted_at timestamptz,
  unique (organization_id, job_number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  job_id uuid not null references public.jobs(id),
  amount_satang bigint not null check (amount_satang > 0),
  method text not null check (method in ('CASH','BANK_TRANSFER','PROMPTPAY','OTHER')),
  paid_at timestamptz not null default now(),
  reference text,
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  user_id uuid not null references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index customers_org_created_idx on public.customers (organization_id, created_at desc) where deleted_at is null;
create index customers_search_idx on public.customers (organization_id, name, phone) where deleted_at is null;
create index briefs_org_created_idx on public.briefs (organization_id, created_at desc) where deleted_at is null;
create index jobs_org_created_idx on public.jobs (organization_id, created_at desc) where deleted_at is null;
create index jobs_org_stage_idx on public.jobs (organization_id, stage, status) where deleted_at is null;
create index jobs_org_deadline_idx on public.jobs (organization_id, deadline) where deleted_at is null and status = 'OPEN';
create index payments_job_idx on public.payments (job_id, paid_at desc) where deleted_at is null;
create index activity_entity_idx on public.activity_logs (entity_type, entity_id, created_at desc);

create trigger lead_sources_set_updated_at before update on public.lead_sources for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger briefs_set_updated_at before update on public.briefs for each row execute function public.set_updated_at();
create trigger jobs_set_updated_at before update on public.jobs for each row execute function public.set_updated_at();

create or replace function public.next_running_number(target_organization_id uuid, target_type text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  buddhist_year_2digit text;
  month_2digit text;
  counter_period integer;
  next_value integer;
begin
  if target_organization_id <> public.current_organization_id() then raise exception 'organization_mismatch'; end if;
  if target_type not in ('CUSTOMER','JOB','QUOTATION') then raise exception 'invalid_counter_type'; end if;

  if target_type = 'JOB' then
    -- 7 digits format: YYMMNNN (e.g. 6908001)
    buddhist_year_2digit := lpad(((extract(year from now() at time zone 'Asia/Bangkok')::integer + 543) % 100)::text, 2, '0');
    month_2digit := lpad(extract(month from now() at time zone 'Asia/Bangkok')::text, 2, '0');
    counter_period := (extract(year from now() at time zone 'Asia/Bangkok')::integer * 100) + extract(month from now() at time zone 'Asia/Bangkok')::integer;

    insert into public.running_counters (organization_id, counter_type, counter_year, current_value)
    values (target_organization_id, target_type, counter_period, 1)
    on conflict (organization_id, counter_type, counter_year)
    do update set current_value = public.running_counters.current_value + 1, updated_at = now()
    returning current_value into next_value;

    return buddhist_year_2digit || month_2digit || lpad(next_value::text, 3, '0');
  elsif target_type = 'CUSTOMER' then
    insert into public.running_counters (organization_id, counter_type, counter_year, current_value)
    values (target_organization_id, target_type, 0, 1)
    on conflict (organization_id, counter_type, counter_year)
    do update set current_value = public.running_counters.current_value + 1, updated_at = now()
    returning current_value into next_value;

    return 'CUS-' || lpad(next_value::text, 6, '0');
  else
    -- QUOTATION: QT-YYYY-XXXX
    counter_period := extract(year from now() at time zone 'Asia/Bangkok')::integer;
    insert into public.running_counters (organization_id, counter_type, counter_year, current_value)
    values (target_organization_id, target_type, counter_period, 1)
    on conflict (organization_id, counter_type, counter_year)
    do update set current_value = public.running_counters.current_value + 1, updated_at = now()
    returning current_value into next_value;

    return 'QT-' || counter_period::text || '-' || lpad(next_value::text, 4, '0');
  end if;
end;
$$;

create or replace function public.set_customer_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.customer_number is null or new.customer_number = '' then
    new.customer_number := public.next_running_number(new.organization_id, 'CUSTOMER');
  end if;
  return new;
end;
$$;

create or replace function public.set_job_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.job_number is null or new.job_number = '' then
    new.job_number := public.next_running_number(new.organization_id, 'JOB');
  end if;
  return new;
end;
$$;

create trigger customers_set_number before insert on public.customers for each row execute function public.set_customer_number();
create trigger jobs_set_number before insert on public.jobs for each row execute function public.set_job_number();

create or replace function public.recalculate_job_paid_amount()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_job_id uuid := coalesce(new.job_id, old.job_id);
begin
  update public.jobs set paid_amount_satang = coalesce((
    select sum(amount_satang) from public.payments where job_id = target_job_id and deleted_at is null
  ), 0) where id = target_job_id;
  return coalesce(new, old);
end;
$$;

create trigger payments_recalculate_job after insert or update or delete on public.payments
for each row execute function public.recalculate_job_paid_amount();

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
  insert into public.jobs (organization_id, job_number, customer_id, brief_id, title, stage, priority, deadline, assigned_admin_id, assigned_graphic_id, grand_total_satang, created_by)
  values (target_organization, '', target_customer_id, new_brief_id, job_title, case when target_graphic_id is null then 'ADMIN' else 'DESIGN' end, target_priority, target_deadline, auth.uid(), target_graphic_id, total_satang, auth.uid()) returning id into new_job_id;
  insert into public.activity_logs (organization_id, entity_type, entity_id, action, user_id, metadata)
  values (target_organization, 'JOB', new_job_id, 'JOB_CREATED', auth.uid(), jsonb_build_object('brief_id', new_brief_id));
  return new_job_id;
end;
$$;

create or replace function public.bootstrap_organization(organization_name text, organization_slug text, owner_full_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_organization_id uuid; owner_role_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'profile_already_exists'; end if;
  insert into public.organizations (name, slug) values (organization_name, organization_slug) returning id into new_organization_id;
  insert into public.roles (organization_id, code, name_th, description) values
    (new_organization_id,'OWNER','เจ้าของ','เข้าถึงและจัดการได้ทุกส่วน'),
    (new_organization_id,'ADMIN','แอดมิน','ดูแลลูกค้า Brief ใบเสนอราคา และงาน'),
    (new_organization_id,'GRAPHIC','กราฟิก','รับงานออกแบบและจัดการ Revision'),
    (new_organization_id,'PRODUCTION','ฝ่ายผลิต','จัดการคิวและสถานะการผลิต'),
    (new_organization_id,'ACCOUNTING','บัญชี','จัดการข้อมูลการรับชำระเงิน');
  select id into owner_role_id from public.roles where organization_id = new_organization_id and code = 'OWNER';
  insert into public.role_permissions (role_id, permission_id) select owner_role_id, id from public.permissions;
  insert into public.profiles (id, organization_id, role_id, full_name) values (auth.uid(), new_organization_id, owner_role_id, owner_full_name);
  insert into public.lead_sources (organization_id, name, source_type, created_by) values
    (new_organization_id,'LINE OA','LINE',auth.uid()),
    (new_organization_id,'Facebook','FACEBOOK',auth.uid()),
    (new_organization_id,'โทรศัพท์','PHONE',auth.uid()),
    (new_organization_id,'หน้าร้าน','WALK_IN',auth.uid()),
    (new_organization_id,'อื่น ๆ','OTHER',auth.uid());
  return new_organization_id;
end;
$$;

alter table public.running_counters enable row level security;
alter table public.lead_sources enable row level security;
alter table public.customers enable row level security;
alter table public.briefs enable row level security;
alter table public.jobs enable row level security;
alter table public.payments enable row level security;
alter table public.activity_logs enable row level security;

create policy lead_sources_org_all on public.lead_sources for all to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy customers_org_select on public.customers for select to authenticated using (organization_id = public.current_organization_id() and deleted_at is null);
create policy customers_org_insert on public.customers for insert to authenticated with check (organization_id = public.current_organization_id() and created_by = auth.uid());
create policy customers_org_update on public.customers for update to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy briefs_org_all on public.briefs for all to authenticated using (organization_id = public.current_organization_id() and deleted_at is null) with check (organization_id = public.current_organization_id());
create policy jobs_org_select on public.jobs for select to authenticated using (organization_id = public.current_organization_id() and deleted_at is null);
create policy jobs_org_insert on public.jobs for insert to authenticated with check (organization_id = public.current_organization_id() and created_by = auth.uid());
create policy jobs_org_update on public.jobs for update to authenticated using (organization_id = public.current_organization_id()) with check (organization_id = public.current_organization_id());
create policy payments_org_all on public.payments for all to authenticated using (organization_id = public.current_organization_id() and deleted_at is null) with check (organization_id = public.current_organization_id());
create policy activity_logs_org_select on public.activity_logs for select to authenticated using (organization_id = public.current_organization_id());
create policy activity_logs_org_insert on public.activity_logs for insert to authenticated with check (organization_id = public.current_organization_id() and user_id = auth.uid());

grant select, insert, update on public.lead_sources, public.customers, public.briefs, public.jobs, public.payments, public.activity_logs to authenticated;
grant select on public.roles, public.permissions, public.role_permissions, public.organizations, public.profiles to authenticated;
grant update on public.profiles, public.organizations to authenticated;
grant execute on function public.next_running_number(uuid,text) to authenticated;
grant execute on function public.create_job_from_brief(uuid,text,text,text,text,integer,timestamptz,text,bigint,uuid) to authenticated;

commit;
