'use client';

import { useActionState } from 'react';
import { createCustomerAction, type CustomerFormState } from '../actions';

type LeadSource = { id: string; name: string };
export function CustomerForm({ leadSources }: { leadSources: LeadSource[] }) {
  const [state, action, pending] = useActionState(createCustomerAction, {} as CustomerFormState);
  return <form action={action} className="data-form">
    <div className="form-grid"><label className="span-2"><span>ชื่อบุคคล / ชื่อบริษัท *</span><input name="name" required /></label><label><span>ประเภทลูกค้า</span><select name="customerType"><option value="PERSON">บุคคล</option><option value="BUSINESS">บริษัท / ร้านค้า</option></select></label><label><span>เบอร์โทร</span><input name="phone" inputMode="tel" /></label><label><span>LINE Name</span><input name="lineName" /></label><label><span>Facebook Name</span><input name="facebookName" /></label><label><span>อีเมล</span><input name="email" type="email" /></label><label><span>ช่องทางที่ติดต่อมา</span><select name="leadSourceId"><option value="">ไม่ระบุ</option>{leadSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></label><label className="span-2"><span>หมายเหตุ</span><textarea name="note" rows={4} /></label></div>
    {state.error ? <p className="form-error">{state.error}</p> : null}<div className="form-actions"><a href="/customers" className="secondary-button">ยกเลิก</a><button className="primary-button" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึกลูกค้า'}</button></div>
  </form>;
}
