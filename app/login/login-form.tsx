'use client';

import { useActionState } from 'react';
import { Eye, LockKeyhole, Mail } from 'lucide-react';
import { loginAction, type LoginState } from './actions';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  return <form action={formAction} className="login-form">
    <label><span>อีเมล</span><div><Mail size={18} /><input name="email" type="email" autoComplete="email" placeholder="name@oksign.co.th" required /></div></label>
    <label><span>รหัสผ่าน</span><div><LockKeyhole size={18} /><input name="password" type="password" autoComplete="current-password" placeholder="อย่างน้อย 8 ตัวอักษร" minLength={8} required /><Eye size={17} /></div></label>
    <div className="login-options"><label><input type="checkbox" name="remember" /> จดจำการเข้าสู่ระบบ</label><a href="#">ลืมรหัสผ่าน?</a></div>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    <button type="submit" disabled={pending}>{pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
  </form>;
}
