'use client';

import { useActionState } from 'react';
import { signupAction, type SignupState } from './actions';

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, {} as SignupState);
  return <form action={action} className="login-form">
    <label><span>ชื่อ–นามสกุล</span><div><input name="fullName" placeholder="ชื่อผู้ดูแลระบบ" required /></div></label>
    <label><span>อีเมล</span><div><input name="email" type="email" placeholder="name@company.com" required /></div></label>
    <label><span>รหัสผ่าน</span><div><input name="password" type="password" minLength={8} placeholder="อย่างน้อย 8 ตัวอักษร" required /></div></label>
    {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    {state.message ? <p className="form-success" role="status">{state.message}</p> : null}
    <button type="submit" disabled={pending}>{pending ? 'กำลังสร้างบัญชี…' : 'สร้างบัญชี Owner'}</button>
  </form>;
}
