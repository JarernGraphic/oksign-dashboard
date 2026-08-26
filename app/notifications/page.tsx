import Link from 'next/link';
import { Bell, CalendarClock, CheckCircle2, Sparkles } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { thaiDate } from '../../lib/format';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

type Job = {
  id: string;
  job_number: string;
  title: string;
  deadline: string;
  stage: string;
  customer: { name: string } | null;
};

type AppNotification = {
  id: string;
  title: string;
  message: string | null;
  notification_type: string;
  created_at: string;
  job_id: string | null;
  is_read: boolean;
};

export default async function NotificationsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const limit = new Date(now);
  limit.setDate(limit.getDate() + 7);

  const [{ data: deadlineJobsData }, { data: appNotifsData }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id,job_number,title,deadline,stage,customer:customers(name)')
      .eq('status', 'OPEN')
      .not('deadline', 'is', null)
      .lte('deadline', limit.toISOString())
      .order('deadline'),
    supabase
      .from('notifications')
      .select('id, title, message, notification_type, created_at, job_id, is_read')
      .eq('recipient_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);

  const jobs = (deadlineJobsData ?? []) as unknown as Job[];
  const appNotifs = (appNotifsData ?? []) as AppNotification[];
  const nowTime = now.getTime();

  if (appNotifs.some((n) => !n.is_read)) {
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', profile.id).eq('is_read', false);
    } catch {}
  }

  return (
    <AppShell profile={profile} active="/notifications">
      <div className="section-heading">
        <div>
          <p>งานของทีม & การแจ้งเตือน</p>
          <h1>แจ้งเตือนทั้งหมด</h1>
          <span>งานที่ได้รับมอบหมาย อนุมัติแบบ และงานใกล้ถึงกำหนด</span>
        </div>
      </div>

      {/* RECENT NOTIFICATIONS SECTION */}
      {appNotifs.length > 0 ? (
        <section className="panel notification-list" style={{ marginBottom: '24px' }}>
          <div className="panel-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={18} /> การแจ้งเตือนงานของคุณ ({appNotifs.length})
            </h3>
          </div>
          {appNotifs.map((n) => (
            <Link href={n.job_id ? `/jobs/${n.job_id}` : '/notifications'} key={n.id}>
              <span className="notification-icon" style={{ background: n.notification_type === 'CUSTOMER_APPROVED' ? '#dcfce7' : '#e0f2fe', color: n.notification_type === 'CUSTOMER_APPROVED' ? '#15803d' : '#0369a1' }}>
                {n.notification_type === 'CUSTOMER_APPROVED' ? <CheckCircle2 size={18} /> : <Sparkles size={18} />}
              </span>
              <span>
                <strong>{n.title}</strong>
                <small>{n.message}</small>
              </span>
              <b style={{ fontSize: '11px', color: '#71717a' }}>{thaiDate(n.created_at, true)}</b>
            </Link>
          ))}
        </section>
      ) : null}

      {/* DEADLINE NOTIFICATIONS */}
      <section className="panel notification-list">
        <div className="panel-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CalendarClock size={18} /> งานเกินกำหนดและใกล้ถึงกำหนดใน 7 วัน
          </h3>
        </div>
        {jobs.length ? (
          jobs.map((job) => {
            const overdue = new Date(job.deadline).getTime() < nowTime;
            return (
              <Link href={`/jobs/${job.id}`} key={job.id}>
                <span className={`notification-icon ${overdue ? 'danger' : ''}`}>
                  <CalendarClock size={18} />
                </span>
                <span>
                  <strong>{overdue ? 'เกินกำหนด' : 'ใกล้ถึงกำหนด'} · {job.job_number}</strong>
                  <small>{job.title} · {job.customer?.name ?? '-'}</small>
                </span>
                <b>{thaiDate(job.deadline, true)}</b>
              </Link>
            );
          })
        ) : (
          <div className="empty-state">
            <Bell />
            <h3>ไม่มีงานเกินกำหนด</h3>
            <p>ยังไม่มีงานเกินกำหนดหรือครบกำหนดใน 7 วัน</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
