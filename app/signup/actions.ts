'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type SignupState = { error?: string; message?: string };
const schema = z.object({
  fullName: z.string().trim().min(2, 'กรุณากรอกชื่อ'),
  email: z.string().trim().email('กรุณากรอกอีเมลให้ถูกต้อง'),
  password: z.string().min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'),
});

export async function signupAction(_state: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({ fullName: formData.get('fullName'), email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  const supabase = await createSupabaseServerClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const { data, error } = await supabase.auth.signUp({ email: parsed.data.email, password: parsed.data.password, options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: `${appUrl}/auth/callback?next=/setup` } });
  if (error) return { error: error.message };
  if (data.session) redirect('/setup');
  return { message: 'สมัครสำเร็จ กรุณาเปิดอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ' };
}
