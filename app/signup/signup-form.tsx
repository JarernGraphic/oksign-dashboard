'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isValidStaffUsername, staffUsernameToEmail } from '../../lib/auth-identifier';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';

function getSignupErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes('rate limit')) return 'ลองสมัครบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
  if (normalized.includes('already registered')) return 'ชื่อผู้ใช้นี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ';
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
    const username = String(formData.get('username') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const roleCode = String(formData.get('roleCode') ?? 'ADMIN');

    if (fullName.length < 2 || !isValidStaffUsername(username) || password.length < 8) {
      setError('ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข จุด ขีดกลาง หรือขีดล่าง 3–32 ตัว และรหัสผ่านอย่างน้อย 8 ตัว');
      setPending(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const email = staffUsernameToEmail(username);
      let { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, username: username.toLowerCase() },
        },
      });

      if (signupError?.message.toLowerCase().includes('already registered') || !data.session) {
        const loginResult = await supabase.auth.signInWithPassword({ email, password });
        data = loginResult.data;
        signupError = loginResult.error;
      }

      if (signupError || !data.session) {
        setError(getSignupErrorMessage(signupError?.message ?? 'ไม่สามารถเข้าสู่ระบบหลังสมัครได้'));
        return;
      }

      const user = data.session.user;

      // Query target role
      let { data: targetRole } = await supabase
        .from('roles')
        .select('id, organization_id')
        .eq('code', roleCode)
        .limit(1)
        .maybeSingle();

      if (!targetRole) {
        const { data: anyRole } = await supabase
          .from('roles')
          .select('id, organization_id')
          .limit(1)
          .maybeSingle();
        targetRole = anyRole;
      }

      const orgId = targetRole?.organization_id || 'a0000000-0000-0000-0000-000000000001';
      const roleId = targetRole?.id;

      // Save profile with is_active = false (requires Owner approval)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: user.id,
        organization_id: orgId,
        role_id: roleId,
        full_name: fullName,
        is_active: false,
      });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      setMessage('สร้างบัญชีสำเร็จแล้ว กำลังพาไปหน้ารอการอนุมัติ…');
      router.replace('/pending-approval');
      router.refresh();
    } catch (cause) {
      console.error('Supabase signup request failed', cause);
      setError(cause instanceof Error ? cause.message : 'ไม่สามารถเชื่อมต่อระบบสมัครสมาชิกได้');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <label>
        <span>ชื่อ–นามสกุล</span>
        <div>
          <input name="fullName" placeholder="ชื่อพนักงาน" required />
        </div>
      </label>
      <label>
        <span>ชื่อผู้ใช้</span>
        <div>
          <input
            name="username"
            autoComplete="username"
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9._-]+"
            placeholder="เช่น graphic01"
            required
          />
        </div>
      </label>
      <label>
        <span>รหัสผ่าน</span>
        <div>
          <input
            name="password"
            type="password"
            minLength={8}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            required
          />
        </div>
      </label>
      <label>
        <span>ตำแหน่งที่สมัคร</span>
        <div>
          <select name="roleCode" defaultValue="ADMIN">
            <option value="ADMIN">แอดมิน (รวมบัญชี)</option>
            <option value="GRAPHIC">กราฟิก</option>
            <option value="PRODUCTION">ช่าง</option>
          </select>
        </div>
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {message ? <p className="form-success" role="status">{message}</p> : null}
      <button type="submit" disabled={pending}>
        {pending ? 'กำลังสร้างบัญชี…' : 'สมัครสมาชิก'}
      </button>
    </form>
  );
}
