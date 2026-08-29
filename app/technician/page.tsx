import { redirect } from 'next/navigation';
import { CheckCircle2, Factory, Wrench } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { TechnicianJobsView } from './technician-jobs-view';

export const metadata = { title: 'งานประกอบ — OKSIGN Dashboard' };

export default async function TechnicianPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const { data: jobs } = await supabase.from('jobs').select('id, job_number, title, deadline, customer:customers(name), brief:briefs(quantity, dimensions, material, requirements)').eq('organization_id', profile.organization_id).eq('stage', 'PRODUCTION').order('deadline', { ascending: true, nullsFirst: false });
  const ids = (jobs ?? []).map((j: any) => j.id);
  const { data: proofs } = ids.length ? await supabase.from('job_design_proofs').select('job_id,image_url,version').in('job_id', ids).order('version', { ascending: false }) : { data: [] };
  const thumbnails: Record<string, string> = {};
  (proofs ?? []).forEach((proof: any) => { if (!thumbnails[proof.job_id]) thumbnails[proof.job_id] = proof.image_url; });
  return <AppShell profile={profile} active="/technician"><div className="section-heading"><div><p>การดำเนินงาน</p><h1><Factory size={25} /> งานประกอบของช่าง</h1><span>เลือกงานที่ประกอบเสร็จแล้ว แล้วกดยืนยันเพื่อปิดงาน</span></div></div><section className="panel list-panel"><div className="panel-header"><div><h2><Wrench size={18} /> งานที่รอประกอบ</h2><p>{jobs?.length ?? 0} รายการ</p></div></div>{jobs?.length ? <TechnicianJobsView jobs={jobs as any} thumbnails={thumbnails} /> : <div className="empty-state"><CheckCircle2 size={30} /><h3>ไม่มีงานที่รอประกอบ</h3><p>เมื่องานผลิตพร้อมแล้ว งานจะแสดงในหน้านี้</p></div>}</section></AppShell>;
}
