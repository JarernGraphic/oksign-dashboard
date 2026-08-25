begin;

create or replace function public.register_staff_member(
  member_full_name text,
  member_role_code text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  target_organization_id uuid;
  target_role_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'profile_already_exists'; end if;
  if char_length(trim(member_full_name)) < 2 then raise exception 'invalid_full_name'; end if;
  if member_role_code not in ('ADMIN', 'GRAPHIC') then raise exception 'invalid_role'; end if;

  select p.organization_id into target_organization_id
  from public.profiles p
  join public.roles r on r.id = p.role_id
  where r.code = 'OWNER' and p.is_active and p.deleted_at is null
  order by p.created_at
  limit 1;

  if target_organization_id is null then raise exception 'organization_not_ready'; end if;

  select id into target_role_id
  from public.roles
  where organization_id = target_organization_id and code = member_role_code;

  if target_role_id is null then raise exception 'role_not_found'; end if;

  insert into public.profiles (id, organization_id, role_id, full_name)
  values (auth.uid(), target_organization_id, target_role_id, trim(member_full_name));

  return target_organization_id;
end;
$$;

revoke all on function public.register_staff_member(text,text) from public;
grant execute on function public.register_staff_member(text,text) to authenticated;

commit;
