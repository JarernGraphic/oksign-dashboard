'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createJobAction, type JobFormState } from '../actions';

type Option = { id: string; name: string };
export function JobForm({ customers, graphics }: { customers: Option[]; graphics: Option[] }) {
  const [state, action, pending] = useActionState(createJobAction, {} as JobFormState);
  return <form action={action} className="data-form"><div className="form-grid"><label className="span-2"><span>ลูกค้า *</span><select name="customerId" required><option value="">เลือกลูกค้า</option>{customers.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><label className="span-2"><span>ชื่องาน *</span><input name="title" placeholder="เช่น ป้ายไฟหน้าร้าน" required /></label><label className="span-2"><span>Brief / ความต้องการ *</span><textarea name="requirements" rows={5} placeholder="รายละเอียดที่ลูกค้าต้องการ" required /></label><label><span>ขนาด</span><input name="dimensions" placeholder="เช่น 320 × 120 ซม." /></label><label><span>วัสดุ</span><input name="material" placeholder="เช่น อะคริลิก 5 มม." /></label><label><span>จำนวน</span><input name="quantity" type="number" min="1" defaultValue="1" required /></label><label><span>ราคาตกลง (บาท)</span><input name="totalBaht" type="number" min="0" step="0.01" defaultValue="0" required /></label><label><span>กำหนดส่ง</span><input name="deadline" type="datetime-local" /></label><label><span>ความสำคัญ</span><select name="priority" defaultValue="NORMAL"><option value="LOW">ต่ำ</option><option value="NORMAL">ปกติ</option><option value="HIGH">สูง</option><option value="URGENT">ด่วน</option></select></label><label className="span-2"><span>Assign Graphic</span><select name="graphicId"><option value="">ยังไม่ Assign</option>{graphics.map((g) => <option value={g.id} key={g.id}>{g.name}</option>)}</select></label></div>{state.error ? <p className="form-error">{state.error}</p> : null}<div className="form-actions"><Link href="/jobs" className="secondary-button">ยกเลิก</Link><button className="primary-button" disabled={pending}>{pending ? 'กำลังเปิด Job…' : 'เปิด Job'}</button></div></form>;
}
