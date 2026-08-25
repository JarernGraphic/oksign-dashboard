begin;

alter table public.organizations
  add column if not exists email text,
  add column if not exists vat_registered boolean not null default true,
  add column if not exists default_vat_rate numeric(5,2) not null default 7,
  add column if not exists allow_withholding_tax boolean not null default true,
  add column if not exists quotation_note text,
  add column if not exists promptpay_name text,
  add column if not exists promptpay_number text,
  add column if not exists bank_name text,
  add column if not exists bank_account_name text,
  add column if not exists bank_account_number text;

alter table public.payments
  add column if not exists payment_type text not null default 'INSTALLMENT'
    check (payment_type in ('DEPOSIT','INSTALLMENT','FINAL')),
  add column if not exists slip_path text;

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  quotation_number text not null,
  customer_id uuid not null references public.customers(id),
  job_id uuid references public.jobs(id),
  title text not null check (char_length(title) between 2 and 180),
  status text not null default 'DRAFT' check (status in ('DRAFT','SENT','ACCEPTED','REJECTED','CANCELLED')),
  valid_until date,
  subtotal_satang bigint not null default 0 check (subtotal_satang >= 0),
  discount_satang bigint not null default 0 check (discount_satang >= 0),
  vat_rate numeric(5,2) not null default 7 check (vat_rate >= 0 and vat_rate <= 100),
  vat_satang bigint not null default 0 check (vat_satang >= 0),
  withholding_tax_rate numeric(5,2) not null default 0 check (withholding_tax_rate >= 0 and withholding_tax_rate <= 100),
  withholding_tax_satang bigint not null default 0 check (withholding_tax_satang >= 0),
  grand_total_satang bigint not null default 0 check (grand_total_satang >= 0),
  note text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organization_id, quotation_number)
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations(id) on delete cascade,
  description text not null check (char_length(description) between 1 and 300),
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'งาน',
  unit_price_satang bigint not null check (unit_price_satang >= 0),
  line_total_satang bigint not null check (line_total_satang >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  token uuid not null unique default gen_random_uuid(),
  email text,
  role_id uuid not null references public.roles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index quotations_org_created_idx on public.quotations (organization_id, created_at desc) where deleted_at is null;
create index quotations_customer_idx on public.quotations (customer_id, created_at desc) where deleted_at is null;
create index quotation_items_quotation_idx on public.quotation_items (quotation_id, sort_order);
create index organization_invites_org_idx on public.organization_invites (organization_id, created_at desc);

create trigger quotations_set_updated_at before update on public.quotations
for each row execute function public.set_updated_at();

create or replace function public.set_quotation_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.quotation_number is null or new.quotation_number = '' then
    new.quotation_number := public.next_running_number(new.organization_id, 'QUOTATION');
  end if;
  return new;
end;
$$;

create trigger quotations_set_number before insert on public.quotations
for each row execute function public.set_quotation_number();

create or replace function public.create_quotation(
  target_customer_id uuid,
  quotation_title text,
  target_valid_until date,
  discount_satang bigint,
  include_vat boolean,
  target_withholding_rate numeric,
  quotation_note text,
  quotation_items jsonb
) returns uuid language plpgsql set search_path = '' as $$
declare
  target_organization uuid := public.current_organization_id();
  new_quotation_id uuid;
  item jsonb;
  item_quantity numeric;
  item_unit_price bigint;
  item_total bigint;
  subtotal bigint := 0;
  taxable bigint;
  vat bigint;
  withholding bigint;
begin
  if auth.uid() is null or target_organization is null then raise exception 'authentication_required'; end if;
  if not exists (select 1 from public.customers where id = target_customer_id and organization_id = target_organization and deleted_at is null) then raise exception 'customer_not_found'; end if;
  if jsonb_typeof(quotation_items) <> 'array' or jsonb_array_length(quotation_items) = 0 then raise exception 'quotation_items_required'; end if;

  for item in select value from jsonb_array_elements(quotation_items)
  loop
    item_quantity := (item->>'quantity')::numeric;
    item_unit_price := (item->>'unit_price_satang')::bigint;
    if coalesce(item->>'description','') = '' or item_quantity <= 0 or item_unit_price < 0 then raise exception 'invalid_quotation_item'; end if;
    item_total := round(item_quantity * item_unit_price)::bigint;
    subtotal := subtotal + item_total;
  end loop;

  taxable := greatest(subtotal - greatest(discount_satang, 0), 0);
  vat := case when include_vat then round(taxable * 0.07)::bigint else 0 end;
  withholding := round(taxable * greatest(target_withholding_rate, 0) / 100)::bigint;

  insert into public.quotations (
    organization_id, quotation_number, customer_id, title, valid_until,
    subtotal_satang, discount_satang, vat_rate, vat_satang,
    withholding_tax_rate, withholding_tax_satang, grand_total_satang,
    note, created_by
  ) values (
    target_organization, '', target_customer_id, quotation_title, target_valid_until,
    subtotal, greatest(discount_satang, 0), case when include_vat then 7 else 0 end, vat,
    greatest(target_withholding_rate, 0), withholding, greatest(taxable + vat - withholding, 0),
    nullif(quotation_note,''), auth.uid()
  ) returning id into new_quotation_id;

  for item in select value from jsonb_array_elements(quotation_items)
  loop
    item_quantity := (item->>'quantity')::numeric;
    item_unit_price := (item->>'unit_price_satang')::bigint;
    insert into public.quotation_items (quotation_id, description, quantity, unit, unit_price_satang, line_total_satang, sort_order)
    values (new_quotation_id, item->>'description', item_quantity, coalesce(nullif(item->>'unit',''),'งาน'), item_unit_price, round(item_quantity * item_unit_price)::bigint, coalesce((item->>'sort_order')::integer, 0));
  end loop;

  insert into public.activity_logs (organization_id, entity_type, entity_id, action, user_id, metadata)
  values (target_organization, 'QUOTATION', new_quotation_id, 'QUOTATION_CREATED', auth.uid(), '{}'::jsonb);
  return new_quotation_id;
end;
$$;

create or replace function public.create_job_from_quotation(target_quotation_id uuid)
returns uuid language plpgsql set search_path = '' as $$
declare
  target_organization uuid := public.current_organization_id();
  quotation_record public.quotations%rowtype;
  new_brief_id uuid;
  new_job_id uuid;
  brief_text text;
begin
  select * into quotation_record from public.quotations
  where id = target_quotation_id and organization_id = target_organization and deleted_at is null for update;
  if quotation_record.id is null then raise exception 'quotation_not_found'; end if;
  if quotation_record.job_id is not null then return quotation_record.job_id; end if;
  if quotation_record.status not in ('SENT','ACCEPTED') then raise exception 'quotation_must_be_sent_or_accepted'; end if;

  select string_agg(description || ' x ' || quantity::text || ' ' || unit, E'\n' order by sort_order)
  into brief_text from public.quotation_items where quotation_id = target_quotation_id;

  insert into public.briefs (organization_id, customer_id, title, requirements, quantity, status, created_by)
  values (target_organization, quotation_record.customer_id, quotation_record.title, coalesce(brief_text, quotation_record.title), 1, 'CONVERTED', auth.uid())
  returning id into new_brief_id;

  insert into public.jobs (organization_id, job_number, customer_id, brief_id, title, stage, priority, grand_total_satang, created_by, assigned_admin_id)
  values (target_organization, '', quotation_record.customer_id, new_brief_id, quotation_record.title, 'ADMIN', 'NORMAL', quotation_record.grand_total_satang, auth.uid(), auth.uid())
  returning id into new_job_id;

  update public.quotations set status = 'ACCEPTED', job_id = new_job_id where id = target_quotation_id;
  insert into public.activity_logs (organization_id, entity_type, entity_id, action, user_id, metadata)
  values (target_organization, 'JOB', new_job_id, 'JOB_CREATED_FROM_QUOTATION', auth.uid(), jsonb_build_object('quotation_id', target_quotation_id));
  return new_job_id;
end;
$$;

create or replace function public.record_job_payment(
  target_job_id uuid,
  payment_amount_satang bigint,
  target_method text,
  target_payment_type text,
  target_reference text,
  target_note text,
  target_slip_path text
) returns uuid language plpgsql set search_path = '' as $$
declare
  target_organization uuid := public.current_organization_id();
  job_total bigint;
  job_paid bigint;
  new_payment_id uuid;
begin
  select grand_total_satang, paid_amount_satang into job_total, job_paid
  from public.jobs where id = target_job_id and organization_id = target_organization and deleted_at is null for update;
  if job_total is null then raise exception 'job_not_found'; end if;
  if payment_amount_satang <= 0 or payment_amount_satang > job_total - job_paid then raise exception 'payment_exceeds_remaining'; end if;
  insert into public.payments (organization_id, job_id, amount_satang, method, payment_type, reference, note, slip_path, created_by)
  values (target_organization, target_job_id, payment_amount_satang, target_method, target_payment_type, nullif(target_reference,''), nullif(target_note,''), nullif(target_slip_path,''), auth.uid())
  returning id into new_payment_id;
  insert into public.activity_logs (organization_id, entity_type, entity_id, action, user_id, metadata)
  values (target_organization, 'JOB', target_job_id, 'PAYMENT_RECORDED', auth.uid(), jsonb_build_object('payment_id', new_payment_id, 'amount_satang', payment_amount_satang));
  return new_payment_id;
end;
$$;

create or replace function public.get_organization_invite(invite_token uuid)
returns table (organization_name text, role_name text, invite_email text, expires_at timestamptz, is_valid boolean)
language sql stable security definer set search_path = '' as $$
  select o.name, r.name_th, i.email, i.expires_at, i.used_at is null and i.expires_at > now()
  from public.organization_invites i
  join public.organizations o on o.id = i.organization_id
  join public.roles r on r.id = i.role_id
  where i.token = invite_token;
$$;

create or replace function public.accept_organization_invite(invite_token uuid, member_full_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invite_record public.organization_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'profile_already_exists'; end if;
  select * into invite_record from public.organization_invites where token = invite_token for update;
  if invite_record.id is null or invite_record.used_at is not null or invite_record.expires_at <= now() then raise exception 'invite_invalid_or_expired'; end if;
  if invite_record.email is not null and lower(invite_record.email) <> lower(coalesce(auth.jwt()->>'email','')) then raise exception 'invite_email_mismatch'; end if;
  insert into public.profiles (id, organization_id, role_id, full_name)
  values (auth.uid(), invite_record.organization_id, invite_record.role_id, member_full_name);
  update public.organization_invites set used_at = now() where id = invite_record.id;
  return invite_record.organization_id;
end;
$$;

alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;
alter table public.organization_invites enable row level security;

create policy quotations_org_all on public.quotations for all to authenticated
using (organization_id = public.current_organization_id())
with check (organization_id = public.current_organization_id());

create policy quotation_items_org_all on public.quotation_items for all to authenticated
using (exists (select 1 from public.quotations q where q.id = quotation_id and q.organization_id = public.current_organization_id()))
with check (exists (select 1 from public.quotations q where q.id = quotation_id and q.organization_id = public.current_organization_id()));

create policy organization_invites_org_select on public.organization_invites for select to authenticated
using (organization_id = public.current_organization_id());
create policy organization_invites_owner_insert on public.organization_invites for insert to authenticated
with check (organization_id = public.current_organization_id() and public.current_role_code() = 'OWNER');
create policy organization_invites_owner_update on public.organization_invites for update to authenticated
using (organization_id = public.current_organization_id() and public.current_role_code() = 'OWNER')
with check (organization_id = public.current_organization_id() and public.current_role_code() = 'OWNER');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-slips', 'payment-slips', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy payment_slips_select on storage.objects for select to authenticated
using (bucket_id = 'payment-slips' and split_part(name, '/', 1) = public.current_organization_id()::text);
create policy payment_slips_insert on storage.objects for insert to authenticated
with check (bucket_id = 'payment-slips' and split_part(name, '/', 1) = public.current_organization_id()::text);
create policy payment_slips_delete on storage.objects for delete to authenticated
using (bucket_id = 'payment-slips' and split_part(name, '/', 1) = public.current_organization_id()::text);

grant select, insert, update on public.quotations, public.quotation_items, public.organization_invites to authenticated;
grant execute on function public.create_quotation(uuid,text,date,bigint,boolean,numeric,text,jsonb) to authenticated;
grant execute on function public.create_job_from_quotation(uuid) to authenticated;
grant execute on function public.record_job_payment(uuid,bigint,text,text,text,text,text) to authenticated;
grant execute on function public.get_organization_invite(uuid) to anon, authenticated;
grant execute on function public.accept_organization_invite(uuid,text) to authenticated;

commit;
