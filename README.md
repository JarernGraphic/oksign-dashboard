# OKSIGN Dashboard

ระบบบริหารงานภายในร้านป้าย โดยใช้ Job เป็นศูนย์กลาง ตั้งแต่รับลูกค้า ออกแบบ ผลิต ส่งมอบ จนถึงรับชำระเงิน

## MVP Core Flow

- Next.js App Router, TypeScript strict และ Tailwind CSS
- Dashboard ภาษาไทยที่อ่านข้อมูลจริงจาก Supabase
- สมัครบัญชี Owner, Login และตั้งค่าองค์กรครั้งแรก
- Supabase SSR client สำหรับ browser และ server
- Migration สำหรับ Organization, Profile, Role, Permission และ RLS
- Role เริ่มต้น: Owner, Admin, Graphic, Production และ Accounting
- Customer CRUD เบื้องต้นและ Lead Source
- เปิด Job จาก Customer พร้อม Brief, running number และ activity timeline
- เปลี่ยน Stage ตั้งแต่ Admin ถึง Complete และบันทึกรับชำระเงิน
- ใบเสนอราคาพร้อมส่วนลด VAT 7% และหัก ณ ที่จ่าย
- มัดจำ แบ่งชำระ แนบสลิป และหน้าการเงินรวม
- ตั้งค่าองค์กร/ช่องทางรับเงิน และเชิญทีม Admin หรือ Graphic
- ค้นหาทั้งระบบ แจ้งเตือนกำหนดส่ง และกู้คืนรหัสผ่าน

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

Dashboard และรายการงานใช้ข้อมูลจริงทั้งหมด ไม่มี mock data ในเส้นทางหลัก
