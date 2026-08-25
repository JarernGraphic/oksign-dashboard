'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { LockKeyhole, UserRound } from 'lucide-react';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  return <form action={formAction} className="login-form">
    <label><span>ชื่อผู้ใช้หรืออีเมล Owner</span><div><UserRound size={18} /><input name="identifier" autoComplete="username" placeholder="เช่น graphic01" required /></div></label>
    <label><span>รหัสผ่าน</span><div><LockKeyhole size={18} /><input name="password" type="password" autoComplete="current-password" placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} required /></div></label>
    <div className="login-options"><span /> <Link href="/forgot-password">ลืมรหัสผ่าน?</Link></div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button type="submit" disabled={pending}>{pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
  </form>;
}
