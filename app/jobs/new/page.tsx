import Link from 'next/link';
import { AppShell } from '../../../components/app-shell';
import { getCurrentProfile } from '../../../lib/current-profile';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { JobForm } from './job-form';

export default async function NewJobPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const yy = String((now.getFullYear() + 543) % 100).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${yy}${mm}`;

  const [{ data: customers }, { data: graphics }, { data: latestJob }] = await Promise.all([
    supabase.from('customers').select('id,name,phone').order('name'),
    supabase.from('profiles').select('id,full_name').order('full_name'),
    supabase.from('jobs').select('job_number').like('job_number', `${prefix}%`).order('job_number', { ascending: false }).limit(1),
  ]);

  let nextSeq = 1;
  if (latestJob?.[0]?.job_number && latestJob[0].job_number.length === 7) {
    const lastSeq = parseInt(latestJob[0].job_number.slice(4), 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }
  const nextJobNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;

  if (!customers?.length) {
    return (
      <AppShell profile={profile} active="/jobs/new">
        <div className="section-heading">
          <div>
            <p>งานขาย</p>
            <h1>ใบรับงาน</h1>
            <span>ต้องมีข้อมูลลูกค้าก่อน</span>
          </div>
        </div>
        <div className="empty-state standalone">
          <h3>ยังไม่มีลูกค้า</h3>
          <p>เพิ่มลูกค้าก่อน แล้วข้อมูลจะถูกนำมาเปิด Job โดยไม่ต้องกรอกซ้ำ</p>
          <Link className="primary-button" href="/customers/new">เพิ่มลูกค้า</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell profile={profile} active="/jobs/new">
      <div className="job-order-container">
        <div className="section-heading">
          <div>
            <p>งานขาย</p>
            <h1>ใบรับงาน</h1>
            <span>กรอกข้อมูลใบรับงานและตัวเลือกการผลิต พร้อมดูพรีวิวสดและพิมพ์ใบงาน A5</span>
          </div>
        </div>
        <JobForm
          customers={customers as { id: string; name: string; phone?: string | null }[]}
          graphics={(graphics ?? []).map((g) => ({ id: g.id, name: g.full_name }))}
          currentProfileName={profile.full_name}
          nextJobNumber={nextJobNumber}
        />
      </div>
    </AppShell>
  );
}
