'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

function getSignupErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('rate limit')) return 'ส่งอีเมลยืนยันบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  if (normalized.includes('invalid') && normalized.includes('email')) return 'กรุณาใช้อีเมลที่ใช้งานได้จริง';
  if (normalized.includes('already registered')) return 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ';
  return message;
}

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError('');
    setMessage('');
    setPending(true);

    const formData = new FormData(form);
    const fullName = String(formData.get('fullName') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (fullName.length < 2 || password.length < 8) {
      setError('กรุณากรอกชื่อและรหัสผ่านอย่างน้อย 8 ตัวอักษร');
      setPending(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/setup`,
        },
      });

      if (signupError) {
        setError(getSignupErrorMessage(signupError.message));
        return;
      }

      if (data.session) {
        router.replace('/setup');
        router.refresh();
        return;
      }

      setMessage('สมัครสำเร็จ กรุณาเปิดอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ');
      form.reset();
    } catch (cause) {
      console.error('Supabase signup request failed', cause);
      setError(cause instanceof Error ? cause.message : 'ไม่สามารถเชื่อมต่อระบบสมัครสมาชิกได้');
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={handleSubmit} className="login-form">
    <label><span>ชื่อ–นามสกุล</span><div><input name="fullName" placeholder="ชื่อผู้ดูแลระบบ" required /></div></label>
    <label><span>อีเมล</span><div><input name="email" type="email" placeholder="name@company.com" required /></div></label>
    <label><span>รหัสผ่าน</span><div><input name="password" type="password" minLength={8} placeholder="อย่างน้อย 8 ตัวอักษร" required /></div></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {message ? <p className="form-success" role="status">{message}</p> : null}
    <button type="submit" disabled={pending}>{pending ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี Owner'}</button>
  </form>;
}
