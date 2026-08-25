import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { getCurrentProfile } from '../../../lib/current-profile';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { QuotationForm } from './quotation-form';

export default async function NewQuotationPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const { data: customers } = await supabase.from('customers').select('id,name').order('name');
  if (!customers?.length) return <AppShell profile={profile} active="/quotations"><div className="section-heading"><div><h1>สร้างใบเสนอราคา</h1><span>ต้องมีข้อมูลลูกค้าก่อน</span></div></div><div className="empty-state standalone"><h3>ยังไม่มีลูกค้า</h3><p>เพิ่มลูกค้าก่อนเริ่มสร้างใบเสนอราคา</p><Link className="primary-button" href="/customers/new">เพิ่มลูกค้า</Link></div></AppShell>;
  return <AppShell profile={profile} active="/quotations"><div className="section-heading"><div><p>งานขาย</p><h1>สร้างใบเสนอราคา</h1><span>ส่วนลด VAT และหัก ณ ที่จ่ายคำนวณอัตโนมัติ</span></div></div><section className="panel form-panel"><QuotationForm customers={customers} /></section></AppShell>;
}

