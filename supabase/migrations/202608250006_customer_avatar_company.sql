-- 202608250006_customer_avatar_company.sql
-- Add company_name, avatar_url, and website to customers table

alter table public.customers add column if not exists company_name text;
alter table public.customers add column if not exists avatar_url text;
alter table public.customers add column if not exists website text;
