begin;

create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  address text,
  phone text,
  tax_id text,
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  code text not null check (code in ('OWNER','ADMIN','GRAPHIC','PRODUCTION','ACCOUNTING')),
  name_th text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  module text not null,
  action text not null check (action in ('READ','CREATE','UPDATE','DELETE','APPROVE','MANAGE')),
  description text,
  created_at timestamptz not null default now()
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  organization_id uuid not null references public.organizations(id),
  role_id uuid not null references public.roles(id),
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index profiles_organization_id_idx on public.profiles (organization_id) where deleted_at is null;
create index roles_organization_id_idx on public.roles (organization_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_set_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles
for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.current_organization_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select organization_id from public.profiles
  where id = auth.uid() and is_active and deleted_at is null;
$$;

create or replace function public.current_role_code()
returns text language sql stable security definer set search_path = '' as $$
  select r.code from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid() and p.is_active and p.deleted_at is null;
$$;

create or replace function public.has_permission(required_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.role_permissions rp on rp.role_id = p.role_id
    join public.permissions permission on permission.id = rp.permission_id
    where p.id = auth.uid() and p.is_active and p.deleted_at is null
      and permission.code = required_permission
  );
$$;

insert into public.permissions (code, module, action, description) values
  ('dashboard.read','dashboard','READ','ดูหน้า Dashboard'),
  ('organization.read','organization','READ','ดูข้อมูลองค์กร'),
  ('organization.update','organization','UPDATE','แก้ไขข้อมูลองค์กร'),
  ('users.read','users','READ','ดูผู้ใช้งาน'),
  ('users.manage','users','MANAGE','จัดการผู้ใช้งานและสิทธิ์'),
  ('customers.read','customers','READ','ดูข้อมูลลูกค้า'),
  ('customers.create','customers','CREATE','สร้างลูกค้า'),
  ('customers.update','customers','UPDATE','แก้ไขลูกค้า'),
  ('jobs.read','jobs','READ','ดูรายการงาน'),
  ('jobs.create','jobs','CREATE','สร้างงาน'),
  ('jobs.update','jobs','UPDATE','อัปเดตงาน'),
  ('artwork.read','artwork','READ','ดูงานออกแบบ'),
  ('artwork.update','artwork','UPDATE','อัปเดตงานออกแบบ'),
  ('production.read','production','READ','ดูคิวผลิต'),
  ('production.update','production','UPDATE','อัปเดตการผลิต'),
  ('payments.read','payments','READ','ดูข้อมูลการชำระเงิน'),
  ('payments.create','payments','CREATE','บันทึกการชำระเงิน'),
  ('reports.read','reports','READ','ดูรายงาน');

create or replace function public.bootstrap_organization(
  organization_name text,
  organization_slug text,
  owner_full_name text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  new_organization_id uuid;
  owner_role_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'profile_already_exists'; end if;

  insert into public.organizations (name, slug) values (organization_name, organization_slug)
  returning id into new_organization_id;

  insert into public.roles (organization_id, code, name_th, description) values
    (new_organization_id, 'OWNER', 'เจ้าของ', 'เข้าถึงและจัดการได้ทุกส่วน'),
    (new_organization_id, 'ADMIN', 'แอดมิน', 'ดูแลลูกค้า Brief ใบเสนอราคา และงาน'),
    (new_organization_id, 'GRAPHIC', 'กราฟิก', 'รับงานออกแบบและจัดการ Revision'),
    (new_organization_id, 'PRODUCTION', 'ฝ่ายผลิต', 'จัดการคิวและสถานะการผลิต'),
    (new_organization_id, 'ACCOUNTING', 'บัญชี', 'จัดการข้อมูลการรับชำระเงิน');

  select id into owner_role_id from public.roles
  where organization_id = new_organization_id and code = 'OWNER';

  insert into public.role_permissions (role_id, permission_id)
  select owner_role_id, id from public.permissions;

  insert into public.profiles (id, organization_id, role_id, full_name)
  values (auth.uid(), new_organization_id, owner_role_id, owner_full_name);

  return new_organization_id;
end;
$$;

revoke all on function public.bootstrap_organization(text,text,text) from public;
grant execute on function public.bootstrap_organization(text,text,text) to authenticated;

alter table public.organizations enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;

create policy organizations_select_same_org on public.organizations for select to authenticated
using (id = public.current_organization_id());
create policy organizations_update_authorized on public.organizations for update to authenticated
using (id = public.current_organization_id() and public.has_permission('organization.update'))
with check (id = public.current_organization_id());

create policy roles_select_same_org on public.roles for select to authenticated
using (organization_id = public.current_organization_id());
create policy permissions_select_authenticated on public.permissions for select to authenticated using (true);
create policy role_permissions_select_same_org on public.role_permissions for select to authenticated
using (exists (select 1 from public.roles r where r.id = role_id and r.organization_id = public.current_organization_id()));

create policy profiles_select_same_org on public.profiles for select to authenticated
using (organization_id = public.current_organization_id());
create policy profiles_update_self_or_manager on public.profiles for update to authenticated
using (organization_id = public.current_organization_id() and (id = auth.uid() or public.has_permission('users.manage')))
with check (organization_id = public.current_organization_id());

commit;
