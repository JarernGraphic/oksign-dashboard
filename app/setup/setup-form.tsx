'use client';

import { useActionState } from 'react';
import { setupAction, type SetupState } from './actions';

export function SetupForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState(setupAction, {} as SetupState);
  return <form action={action} className="login-form"><label><span>ชื่อองค์กร</span><div><input name="name" defaultValue="OKSIGN" required /></div></label><label><span>รหัสองค์กร</span><div><input name="slug" defaultValue="oksign" pattern="[a-z0-9-]+" required /></div></label><label><span>ชื่อ Owner</span><div><input name="fullName" defaultValue={defaultName} required /></div></label>{state.error ? <p className="form-error">{state.error}</p> : null}<button disabled={pending}>{pending ? 'กำลังตั้งค่า…' : 'สร้างองค์กรและเริ่มใช้งาน'}</button></form>;
}
