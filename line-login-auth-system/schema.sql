-- ==========================================================
-- SUPABASE DATABASE SETUP FOR LINE LOGIN & USER ROLES
-- รันโค้ด SQL นี้ใน Supabase SQL Editor ของคุณ
-- ==========================================================

-- 1. Organizations (ร้าน/องค์กร)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Roles (ตำแหน่งและสิทธิ์)
create table if not exists roles (
  id text primary key,
  name_th text not null,
  description text
);

insert into roles (id, name_th, description) values
  ('OWNER', 'เจ้าของร้าน', 'สิทธิ์สูงสุด เข้าถึงได้ทุกฟังก์ชัน'),
  ('ADMIN', 'แอดมิน / งานขาย', 'ดูแลใบเสนอราคา ลูกค้า และรายการงาน'),
  ('DESIGNER', 'กราฟิก / ออกแบบ', 'ดูแลคิวงานออกแบบและอัปโหลดไฟล์งาน'),
  ('TECHNICIAN', 'ช่างผลิต / ติดตั้ง', 'ดูคิวผลิตและอัปเดตสถานะงาน')
on conflict (id) do nothing;

-- 3. Profiles (โปรไฟล์สมาชิกที่ผูกกับ LINE / Supabase Auth)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid references organizations(id),
  full_name text not null,
  avatar_url text,
  phone text,
  role_id text references roles(id) default 'ADMIN',
  is_approved boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. เปิดใช้งาน RLS (Row Level Security)
alter table organizations enable row level security;
alter table roles enable row level security;
alter table profiles enable row level security;

-- Policy ตัวอย่าง
create policy "Allow all read roles" on roles for select using (true);
create policy "Allow users to read their profile" on profiles for select using (true);
create policy "Allow users to update their profile" on profiles for update using (auth.uid() = id);
