'use server';

import { redirect } from 'next/navigation';
import { loginSchema } from '../../features/auth/schema';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type LoginState = { error?: string };

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get('email'), password: formData.get('password') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'ไม่สามารถเข้าสู่ระบบได้' };
  }

  redirect('/');
}
