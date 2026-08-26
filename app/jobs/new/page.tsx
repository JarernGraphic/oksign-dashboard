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
    supabase.from('profiles').select('id,full_name,avatar_url,role:roles(code,name_th)').order('full_name'),
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

  return (
    <AppShell profile={profile} active="/jobs/new">
      <div className="job-order-container">
        <div className="section-heading">
          <div>
            <p>งานขาย</p>
            <h1>ใบรับงาน</h1>
            <span>กรอกข้อมูลใบรับงานและตัวเลือกการผลิต พร้อมดูพรีวิวสดและพิมพ์ใบงาน</span>
          </div>
        </div>
        <JobForm
          customers={(customers ?? []) as { id: string; name: string; phone?: string | null }[]}
          graphics={(graphics ?? [])
            .filter((g: any) => g.role?.code === 'GRAPHIC' || g.role?.name_th?.includes('กราฟิก'))
            .map((g: any) => ({
              id: g.id,
              name: g.full_name,
              avatar_url: g.avatar_url,
              role_code: g.role?.code,
              role_name: g.role?.name_th || 'กราฟิก',
            }))}
          currentProfileName={profile.full_name}
          nextJobNumber={nextJobNumber}
        />
      </div>
    </AppShell>
  );
}
