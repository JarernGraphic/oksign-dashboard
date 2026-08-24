import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { getCurrentProfile } from '../../../lib/current-profile';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { JobForm } from './job-form';

export default async function NewJobPage() {
  const profile = await getCurrentProfile(); const supabase = await createSupabaseServerClient();
  const [{ data: customers }, { data: graphics }] = await Promise.all([supabase.from('customers').select('id,name').order('name'), supabase.from('profiles').select('id,full_name').order('full_name')]);
  if (!customers?.length) return <AppShell profile={profile} active="/jobs"><div className="section-heading"><div><h1>เปิด Job ใหม่</h1><span>ต้องมีข้อมูลลูกค้าก่อน</span></div></div><div className="empty-state standalone"><h3>ยังไม่มีลูกค้า</h3><p>เพิ่มลูกค้าก่อน แล้วข้อมูลจะถูกนำมาเปิด Job โดยไม่ต้องกรอกซ้ำ</p><Link className="primary-button" href="/customers/new">เพิ่มลูกค้า</Link></div></AppShell>;
  return <AppShell profile={profile} active="/jobs"><div className="section-heading"><div><p>รายการงาน</p><h1>เปิด Job ใหม่</h1><span>สร้าง Brief, เลข Job และ Timeline อัตโนมัติ</span></div></div><section className="panel form-panel"><JobForm customers={customers as { id:string; name:string }[]} graphics={(graphics ?? []).map((g) => ({ id: g.id, name: g.full_name }))} /></section></AppShell>;
}
