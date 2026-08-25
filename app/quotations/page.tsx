import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { money, thaiDate } from '../../lib/format';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

type Quotation = { id:string; quotation_number:string; title:string; status:string; grand_total_satang:number; valid_until:string|null; customer:{name:string}|null };
const statusLabel: Record<string,string> = { DRAFT:'ร่าง',SENT:'ส่งแล้ว',ACCEPTED:'อนุมัติ',REJECTED:'ไม่อนุมัติ',CANCELLED:'ยกเลิก' };

export default async function QuotationsPage() {
  const profile = await getCurrentProfile(); const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('quotations').select('id,quotation_number,title,status,grand_total_satang,valid_until,customer:customers(name)').order('created_at',{ascending:false});
  const quotations = (data ?? []) as unknown as Quotation[];
  return <AppShell profile={profile} active="/quotations"><div className="section-heading"><div><p>งานขาย</p><h1>ใบเสนอราคา</h1><span>สร้าง ส่งอนุมัติ และเปลี่ยนเป็น Job</span></div><Link className="primary-button" href="/quotations/new"><Plus size={17}/>สร้างใบเสนอราคา</Link></div><section className="panel list-panel">{error?<div className="error-state">{error.message}</div>:quotations.length?<div className="table-wrap"><table><thead><tr><th>เลขที่</th><th>ลูกค้า / หัวข้อ</th><th>สถานะ</th><th>ใช้ได้ถึง</th><th>ยอดสุทธิ</th></tr></thead><tbody>{quotations.map((quotation)=><tr key={quotation.id}><td><Link href={`/quotations/${quotation.id}`}><strong>{quotation.quotation_number}</strong></Link></td><td><strong>{quotation.customer?.name??'-'}</strong><span>{quotation.title}</span></td><td><span className={`badge ${quotation.status==='ACCEPTED'?'cyan':quotation.status==='REJECTED'?'amber':'blue'}`}>{statusLabel[quotation.status]}</span></td><td>{quotation.valid_until?thaiDate(quotation.valid_until):'-'}</td><td>{money(quotation.grand_total_satang)}</td></tr>)}</tbody></table></div>:<div className="empty-state"><FileText/><h3>ยังไม่มีใบเสนอราคา</h3><p>สร้างใบเสนอราคาแรกจากข้อมูลลูกค้า</p><Link className="primary-button" href="/quotations/new">สร้างใบเสนอราคา</Link></div>}</section></AppShell>;
}

