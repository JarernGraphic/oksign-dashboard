# OKSIGN Dashboard

ระบบบริหารงานภายในร้านป้าย โดยใช้ Job เป็นศูนย์กลาง ตั้งแต่รับลูกค้า ออกแบบ ผลิต ส่งมอบ จนถึงรับชำระเงิน

## Phase 1 Foundation

- Next.js App Router, TypeScript strict และ Tailwind CSS
- Dashboard ภาษาไทยแบบ desktop-first และ responsive
- หน้า Login พร้อม validation ด้วย Zod
- Supabase SSR client สำหรับ browser และ server
- Migration สำหรับ Organization, Profile, Role, Permission และ RLS
- Role เริ่มต้น: Owner, Admin, Graphic, Production และ Accounting

## เริ่มใช้งาน

1. คัดลอก `.env.example` เป็น `.env.local`
2. กรอก Supabase URL และ keys
3. รัน migration ใน `supabase/migrations`
4. ใช้ `npm run dev` สำหรับพัฒนา

Service role key ใช้เฉพาะฝั่ง server และห้ามตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_`

## โครงสร้าง

- `app/` routes และ UI
- `features/` validation และ business logic แยกตามโมดูล
- `lib/supabase/` Supabase clients
- `supabase/migrations/` schema, functions และ RLS policies

ข้อมูลตัวอย่างบน Dashboard เป็น representative data สำหรับวาง product direction ใน Phase 1 และจะเชื่อมกับตารางงานจริงใน Phase 3
