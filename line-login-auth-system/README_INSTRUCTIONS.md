# 🚀 คู่มือการติดตั้งระบบ LINE Login และระบบสมาชิก (Plug & Play Guide)

แพ็กเกจนี้ประกอบด้วย **ระบบ LINE Login OAuth 2.0** และ **ระบบสมาชิก/สิทธิ์ผู้ใช้งาน (Roles & Profiles)** ที่สามารถนำไปวางทับในโปรเจกต์ Next.js เดิมของคุณในเครื่องหลักได้ทันที!

---

## 📁 1. โครงสร้างไฟล์ในแพ็กเกจนี้

```
line-login-system-package/
├── app/
│   └── api/
│       └── auth/
│           └── line/
│               ├── route.ts                 <-- (ตัวส่งผู้ใช้ไปยืนยันตัวตนที่ LINE)
│               └── callback/
│                   └── route.ts             <-- (ตัวรับ Token และบันทึกโปรไฟล์เข้า Supabase)
│
├── lib/
│   ├── current-profile.ts                   <-- (ฟังก์ชัน getCurrentProfile() เช็กสถานะการล็อกอินและสิทธิ์)
│   └── supabase/
│       ├── client.ts                        <-- (Supabase Client ฝั่ง Browser)
│       └── server.ts                        <-- (Supabase Server ฝั่ง Server Component / API)
│
├── components/
│   └── line-login-button.tsx                <-- (คอมโพเนนต์ปุ่มกดเข้าสู่ระบบด้วย LINE สำเร็จรูป)
│
├── schema.sql                               <-- (คำสั่งสร้างตาราง profiles, roles ใน Supabase)
├── .env.example                             <-- (ตัวอย่างตัวแปร Environment สำหรับ LINE & Supabase)
└── README_INSTRUCTIONS.md                   <-- (คู่มือฉบับนี้)
```

---

## 🛠️ 2. ขั้นตอนการนำไปใช้ในเครื่องหลัก (3 สเต็ปง่ายๆ)

### สเต็ป 1: ติดตั้งแพ็กเกจที่จำเป็นในโปรเจกต์ของคุณ
เปิด Terminal ในโฟลเดอร์โปรเจกต์ของคุณ แล้วรันคำสั่ง:
```bash
npm install @supabase/ssr @supabase/supabase-js
```

---

### สเต็ป 2: คัดลอกโฟลเดอร์ไปวางทับในโปรเจกต์ของคุณ
คัดลอกไฟล์จาก zip นี้ไปวางในโครงสร้างโปรเจกต์ของคุณ:
- วางโฟลเดอร์ `app/api/auth/line/` ลงใน `app/api/auth/` ของคุณ
- วางโฟลเดอร์ `lib/` ลงในโปรเจกต์ของคุณ
- วางโฟลเดอร์ `components/line-login-button.tsx` ลงในโฟลเดอร์ `components/` ของคุณ

---

### สเต็ป 3: ตั้งค่า `.env.local`
เปิดไฟล์ `.env.local` ในโปรเจกต์ของคุณ แล้วใส่ค่าเหล่านี้:

```env
# 1. Supabase Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 2. LINE Developers Console
LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
NEXT_PUBLIC_LINE_REDIRECT_URI=http://localhost:3000/api/auth/line/callback
```

> **📌 สำคัญมาก:** ในหน้าเว็บ [LINE Developers Console](https://developers.line.biz/)
> - ใน Channel LINE Login ของคุณ ให้ไปที่แท็บ **LINE Login**
> - ใส่ **Callback URL** ให้เป็น: `http://localhost:3000/api/auth/line/callback` (และเพิ่ม URL ของโดเมนจริงตอน Deploy)

---

## 💻 3. วิธีเรียกใช้งานในโค้ดของคุณ

### 3.1 วางปุ่ม LINE Login ในหน้าเข้าสู่ระบบ (Login Page)
```tsx
import { LineLoginButton } from '@/components/line-login-button';

export default function LoginPage() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>เข้าสู่ระบบ OKSIGN</h1>
        <p>กรุณาเข้าสู่ระบบด้วย LINE ของคุณ</p>
        <LineLoginButton />
      </div>
    </div>
  );
}
```

---

### 3.2 ตรวจสอบสถานะการล็อกอินและสิทธิ์ในหน้าเพจใดๆ (Server Component)
```tsx
import { getCurrentProfile } from '@/lib/current-profile';

export default async function DashboardPage() {
  // ดึงข้อมูลผู้ใช้ที่กำลังล็อกอินอยู่
  const profile = await getCurrentProfile();

  return (
    <div>
      <h1>สวัสดีคุณ: {profile.full_name}</h1>
      <p>ตำแหน่งของคุณ: {profile.role.name_th}</p>
      <img src={profile.avatar_url} alt="Profile" width={60} height={60} style={{ borderRadius: '50%' }} />
      
      {/* เช็กสิทธิ์การเข้าถึง */}
      {profile.role.id === 'OWNER' && (
        <div>เมนูเฉพาะเจ้าของร้าน (Owner Panel)</div>
      )}
    </div>
  );
}
```

---

### 3.3 การสร้างปุ่มออกจากระบบ (Logout)
ใน Server Action หรือ API ให้สั่งเคลียร์ Cookie ของ Supabase:
```ts
// app/actions.ts
'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```
