'use server';

import { redirect } from 'next/navigation';
import { loginSchema } from '../../features/auth/schema';
import { identifierToEmail } from '../../lib/auth-identifier';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type LoginState = { error?: string };

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ identifier: formData.get('identifier'), password: formData.get('password') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: identifierToEmail(parsed.data.identifier),
      password: parsed.data.password,
    });
    if (error?.code === 'email_not_confirmed') {
      return {
        error: 'บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณาเปิดลิงก์ยืนยันในอีเมลก่อนเข้าสู่ระบบ',
      };
    }
    if (error?.code === 'over_request_rate_limit') {
      return { error: 'ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' };
    }
    if (error) return { error: 'ชื่อผู้ใช้ อีเมล หรือรหัสผ่านไม่ถูกต้อง' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้' };
  }

  redirect('/');
}
