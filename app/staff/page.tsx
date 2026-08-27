import { redirect } from 'next/navigation';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { StaffView, type StaffMember } from './staff-view';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'ทีมงาน & พนักงาน — OKSIGN Dashboard',
};

export default async function StaffPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  const supabase = await createSupabaseServerClient();

  // 1. Query all profiles in the organization
  const { data: rawProfiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, is_active, created_at, role_id, role:roles(id, code, name_th)')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  // 2. Query all jobs to compute staff performance metrics
  const { data: rawJobs } = await supabase
    .from('jobs')
    .select('id, assigned_graphic_id, created_by, stage, status');

  const jobsList = rawJobs || [];

  // 3. Map members with calculated metrics
  const members: StaffMember[] = (rawProfiles || []).map((p: any) => {
    const isGraphic = p.role?.code === 'GRAPHIC';

    // Count jobs assigned to this graphic (or created by this admin/user)
    const userJobs = jobsList.filter((j) =>
      isGraphic ? j.assigned_graphic_id === p.id : (j.assigned_graphic_id === p.id || j.created_by === p.id)
    );

    const completedJobs = userJobs.filter(
      (j) => j.stage === 'COMPLETE' || j.status === 'COMPLETED'
    ).length;

    const inProgressJobs = userJobs.length - completedJobs;

    return {
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      is_active: p.is_active,
      created_at: p.created_at,
      role: p.role,
      stats: {
        totalJobs: userJobs.length,
        inProgressJobs: Math.max(0, inProgressJobs),
        completedJobs,
      },
    };
  });

  return (
    <AppShell profile={profile as any} active="/staff">
      <main className="main-content" style={{ display: 'grid', gap: '24px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={26} className="text-primary" /> ทีมงาน & พนักงาน
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              ข้อมูลการทำงาน การมอบหมายงาน และรายชื่อทีมงานทั้งหมดในร้าน OKSIGN
            </p>
          </div>
        </div>

        <StaffView
          members={members}
          currentUserId={profile.id}
          currentUserRole={profile.role?.code || 'GRAPHIC'}
        />
      </main>
    </AppShell>
  );
}
