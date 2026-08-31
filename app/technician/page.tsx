import { redirect } from 'next/navigation';
import { Factory } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { TechnicianJobsView } from './technician-jobs-view';

export const metadata = { title: 'งานประกอบ — OKSIGN Dashboard' };

export default async function TechnicianPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');

  const supabase = await createSupabaseServerClient();

  // 1. Pending assembly jobs (stage = PRODUCTION)
  const { data: pendingJobs } = await supabase
    .from('jobs')
    .select('id, job_number, title, priority, deadline, completed_at, customer:customers(name), brief:briefs(quantity, dimensions, material, requirements)')
    .eq('organization_id', profile.organization_id)
    .eq('stage', 'PRODUCTION')
    .order('deadline', { ascending: true, nullsFirst: false });

  // 2. Technician's own completed assembly jobs
  const { data: myTechLogs } = await supabase
    .from('activity_logs')
    .select('entity_id, created_at')
    .eq('organization_id', profile.organization_id)
    .eq('user_id', profile.id)
    .eq('action', 'TECHNICIAN_CONFIRMED_ASSEMBLY')
    .order('created_at', { ascending: false });

  const completedJobIds = Array.from(new Set((myTechLogs ?? []).map((l: any) => l.entity_id)));

  const { data: completedJobs } = completedJobIds.length
    ? await supabase
        .from('jobs')
        .select('id, job_number, title, priority, deadline, completed_at, customer:customers(name), brief:briefs(quantity, dimensions, material, requirements)')
        .in('id', completedJobIds)
        .order('completed_at', { ascending: false })
    : { data: [] };

  const allJobs = [...(pendingJobs ?? []), ...(completedJobs ?? [])];
  const allIds = Array.from(new Set(allJobs.map((j: any) => j.id)));

  const [{ data: proofs }, { data: activityLogs }] = allIds.length
    ? await Promise.all([
        supabase
          .from('job_design_proofs')
          .select('job_id, image_url, version')
          .in('job_id', allIds)
          .order('version', { ascending: false }),
        supabase
          .from('activity_logs')
          .select('entity_id, action, metadata, created_at')
          .in('entity_id', allIds)
          .in('action', ['DESIGN_PROOF', 'DESIGN_PROOF_CONFIRMED', 'DESIGN_PROOF_REMOVED', 'PROOF_SENT_TO_CUSTOMER'])
          .order('created_at', { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];

  const thumbnails: Record<string, string> = {};
  (proofs ?? []).forEach((proof: any) => {
    if (!thumbnails[proof.job_id] && proof.image_url) {
      thumbnails[proof.job_id] = proof.image_url;
    }
  });

  if (activityLogs && activityLogs.length > 0) {
    const deletedIds = new Set(
      activityLogs
        .filter((l: any) => l.action === 'DESIGN_PROOF_REMOVED')
        .map((l: any) => l.metadata?.deleted_proof_id)
        .filter(Boolean)
    );

    activityLogs.forEach((l: any) => {
      if (!thumbnails[l.entity_id] && !deletedIds.has(l.id)) {
        const imgUrl = l.metadata?.image_url || l.metadata?.publicUrl || l.metadata?.url;
        if (imgUrl) {
          thumbnails[l.entity_id] = imgUrl;
        }
      }
    });
  }

  return (
    <AppShell profile={profile} active="/technician">
      <div className="section-heading">
        <div>
          <p>ผลิต</p>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Factory size={25} /> งานประกอบของช่าง
          </h1>
          <span>เลือกงานที่ประกอบเสร็จแล้ว แล้วกดยืนยันเพื่อปิดงาน หรือตรวจสอบงานที่ประกอบเสร็จแล้ว</span>
        </div>
      </div>

      <TechnicianJobsView
        pendingJobs={(pendingJobs ?? []) as any}
        completedJobs={(completedJobs ?? []) as any}
        thumbnails={thumbnails}
      />
    </AppShell>
  );
}
