-- 202608250005_7digit_job_number.sql
-- Update next_running_number to generate 7-digit Job Numbers: YYMMNNN (e.g. 6908001 - 6908999)
-- YY = Buddhist Era Year 2-digit (e.g. 2569 -> 69)
-- MM = Month 2-digit (e.g. 08)
-- NNN = 3-digit running sequence (001 - 999) per month

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
