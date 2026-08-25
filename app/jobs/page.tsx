import Link from 'next/link';
import { BriefcaseBusiness, Plus } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

type Job = {
  id: string;
  job_number: string;
  title: string;
  stage: string;
  status: string;
  priority: string;
  deadline: string | null;
  grand_total_satang: number;
  customer: { name: string } | null;
};

const stageLabels: Record<string, string> = {
  ADMIN: 'รับงาน',
  DESIGN: 'ออกแบบ',
  PRODUCTION: 'ผลิต',
  DELIVERY: 'ส่งมอบ',
  COMPLETE: 'เสร็จสิ้น',
};

const priorityLabels: Record<string, string> = {
  LOW: 'ต่ำ',
  NORMAL: 'ปกติ',
  HIGH: 'สูง',
  URGENT: 'ด่วน',
};

const stageHeadings: Record<string, { section: string; title: string; desc: string }> = {
  ADMIN: { section: 'งานขาย', title: 'งานรับงาน / รอประเมิน', desc: 'รายการงานที่เพิ่งเปิดใหม่และอยู่ในขั้นตอนรับงาน' },
  DESIGN: { section: 'การดำเนินงาน', title: 'งานออกแบบ', desc: 'ติดตามและจัดการงานออกแบบ (Graphic Design)' },
  PRODUCTION: { section: 'การดำเนินงาน', title: 'งานผลิต', desc: 'ติดตามและจัดการงานผลิตป้ายและชิ้นงาน (Production)' },
  DELIVERY: { section: 'การดำเนินงาน', title: 'จัดส่ง / ติดตั้ง', desc: 'ติดตามงานจัดส่งและงานติดตั้งนอกสถานที่ (Delivery & Installation)' },
  COMPLETE: { section: 'ภาพรวม', title: 'งานที่เสร็จสิ้น', desc: 'รายการงานทั้งหมดที่ส่งมอบและปิดงานเรียบร้อยแล้ว' },
};

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const stage = params.stage;

  let query = supabase
    .from('jobs')
    .select('id,job_number,title,stage,status,priority,deadline,grand_total_satang,customer:customers(name)')
    .order('created_at', { ascending: false });

  if (stage) {
    query = query.eq('stage', stage);
  }

  const { data, error } = await query;
  const jobs = (data ?? []) as unknown as Job[];

  const active = stage ? `/jobs?stage=${stage}` : '/jobs';
  const heading = (stage && stageHeadings[stage]) || {
    section: 'งานขาย',
    title: 'รายการงาน',
    desc: 'ติดตาม Job ตั้งแต่รับงานจนถึงปิดงาน',
  };

  return (
    <AppShell profile={profile} active={active}>
      <div className="section-heading">
        <div>
          <p>{heading.section}</p>
          <h1>{heading.title}</h1>
          <span>{heading.desc}</span>
        </div>
        <Link className="primary-button" href="/jobs/new">
          <Plus size={17} />
          เปิด Job
        </Link>
      </div>

      <div className="stage-filters">
        {[
          { v: '', l: 'ทั้งหมด' },
          { v: 'ADMIN', l: 'รับงาน' },
          { v: 'DESIGN', l: 'ออกแบบ' },
          { v: 'PRODUCTION', l: 'ผลิต' },
          { v: 'DELIVERY', l: 'ส่งมอบ' },
          { v: 'COMPLETE', l: 'เสร็จสิ้น' },
        ].map((f) => (
          <Link
            className={(stage ?? '') === f.v ? 'active' : ''}
            href={f.v ? `/jobs?stage=${f.v}` : '/jobs'}
            key={f.v}
          >
            {f.l}
          </Link>
        ))}
      </div>

      <section className="panel list-panel">
        {error ? (
          <div className="error-state">{error.message}</div>
        ) : jobs.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Job</th>
                  <th>ลูกค้า</th>
                  <th>ขั้นตอน</th>
                  <th>กำหนดส่ง</th>
                  <th>ความสำคัญ</th>
                  <th>ยอดงาน</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/jobs/${job.id}`}>
                        <strong>{job.job_number}</strong>
                      </Link>
                      <span>{job.title}</span>
                    </td>
                    <td>{job.customer?.name ?? '-'}</td>
                    <td>
                      <span className="badge blue">
                        <i />
                        {stageLabels[job.stage]}
                      </span>
                    </td>
                    <td>
                      {job.deadline
                        ? new Intl.DateTimeFormat('th-TH', {
                            dateStyle: 'medium',
                            timeZone: 'Asia/Bangkok',
                          }).format(new Date(job.deadline))
                        : '-'}
                    </td>
                    <td>
                      <span className={`priority ${job.priority === 'URGENT' ? 'red' : job.priority === 'HIGH' ? 'orange' : 'gray'}`}>
                        {priorityLabels[job.priority] ?? job.priority}
                      </span>
                    </td>
                    <td>
                      {new Intl.NumberFormat('th-TH', {
                        style: 'currency',
                        currency: 'THB',
                      }).format(job.grand_total_satang / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <BriefcaseBusiness />
            <h3>ยังไม่มี Job ในขั้นตอนนี้</h3>
            <p>เปิดงานแรกจากข้อมูลลูกค้าที่มีอยู่</p>
            <Link className="primary-button" href="/jobs/new">
              เปิด Job
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
