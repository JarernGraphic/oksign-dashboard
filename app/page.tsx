import Link from 'next/link';
import { AlertTriangle, Boxes, BriefcaseBusiness, CircleDollarSign, Clock3, Paintbrush, Users } from 'lucide-react';
import { AppShell } from '../components/app-shell';
import { getCurrentProfile } from '../lib/current-profile';
import { createSupabaseServerClient } from '../lib/supabase/server';

type RecentJob = {
  id: string; job_number: string; title: string; stage: string; priority: string;
  deadline: string | null; grand_total_satang: number; paid_amount_satang: number;
  customer: { name: string } | null;
};
const stageLabels: Record<string, string> = { ADMIN: 'รับงาน', DESIGN: 'ออกแบบ', PRODUCTION: 'ผลิต', DELIVERY: 'ส่งมอบ', COMPLETE: 'เสร็จสิ้น' };
const priorityLabels: Record<string, string> = { LOW: 'ต่ำ', NORMAL: 'ปกติ', HIGH: 'สูง', URGENT: 'ด่วน' };
const money = (satang: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(satang / 100);

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const today = new Date();
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString();
  const todayStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString();
  const [active, waiting, design, production, customers, jobsResult, monthJobs, todayJobs] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'OPEN'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('stage', 'ADMIN').eq('status', 'OPEN'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('stage', 'DESIGN').eq('status', 'OPEN'),
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('stage', 'PRODUCTION').eq('status', 'OPEN'),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase.from('jobs').select('id,job_number,title,stage,priority,deadline,grand_total_satang,paid_amount_satang,customer:customers(name)').order('created_at', { ascending: false }).limit(6),
    supabase.from('jobs').select('grand_total_satang,paid_amount_satang').gte('created_at', monthStart),
    supabase.from('jobs').select('grand_total_satang').gte('created_at', todayStart),
  ]);
  const recentJobs = (jobsResult.data ?? []) as unknown as RecentJob[];
  const monthTotal = (monthJobs.data ?? []).reduce((sum, row) => sum + Number(row.grand_total_satang), 0);
  const outstanding = (monthJobs.data ?? []).reduce((sum, row) => sum + Number(row.grand_total_satang) - Number(row.paid_amount_satang), 0);
  const todayTotal = (todayJobs.data ?? []).reduce((sum, row) => sum + Number(row.grand_total_satang), 0);
  const deadlineSoon = recentJobs.filter((job) => job.deadline && new Date(job.deadline).getTime() < today.getTime() + 3 * 86400000 && job.stage !== 'COMPLETE');
  const cards = [
    { label: 'งานที่กำลังดำเนินการ', value: active.count ?? 0, note: `ลูกค้าทั้งหมด ${customers.count ?? 0} ราย`, tone: 'blue', icon: BriefcaseBusiness },
    { label: 'รอประเมิน / รับงาน', value: waiting.count ?? 0, note: 'งานในขั้น Admin', tone: 'amber', icon: Clock3 },
    { label: 'งานออกแบบ', value: design.count ?? 0, note: 'กำลังอยู่กับฝ่าย Graphic', tone: 'violet', icon: Paintbrush },
    { label: 'งานผลิต', value: production.count ?? 0, note: 'กำลังอยู่กับฝ่าย Production', tone: 'cyan', icon: Boxes },
  ];
  return <AppShell profile={profile} active="/">
    <div className="page-heading"><div><p>{new Intl.DateTimeFormat('th-TH', { dateStyle: 'full', timeZone: 'Asia/Bangkok' }).format(today)}</p><h1>สวัสดี, {profile.full_name}</h1><span>ข้อมูลจริงจาก {profile.organization.name}</span></div><Link className="secondary-button" href="/customers/new"><Users size={17} />เพิ่มลูกค้า</Link></div>
    <section className="summary-grid">{cards.map((card) => { const Icon = card.icon; return <article className="summary-card" key={card.label}><div className={`metric-icon ${card.tone}`}><Icon size={20} /></div><div className="metric-copy"><p>{card.label}</p><strong>{card.value}</strong><span>{card.note}</span></div></article>; })}</section>
    <section className="financial-strip"><div className="financial-heading"><CircleDollarSign size={20} /><div><strong>ภาพรวมการเงิน</strong><span>คำนวณจาก Job ที่บันทึกจริง</span></div></div><div className="financial-item"><span>ยอดขายวันนี้</span><strong>{money(todayTotal)}</strong></div><div className="financial-item"><span>ยอดขายเดือนนี้</span><strong>{money(monthTotal)}</strong></div><div className="financial-item outstanding"><span>ยอดค้างชำระเดือนนี้</span><strong>{money(outstanding)}</strong></div></section>
    <div className="dashboard-grid"><section className="panel jobs-panel"><div className="panel-header"><div><h2>งานล่าสุด</h2><p>ข้อมูล Job ที่ทีมบันทึกในระบบ</p></div><Link href="/jobs">ดูทั้งหมด</Link></div>{recentJobs.length ? <div className="table-wrap"><table><thead><tr><th>งาน / ลูกค้า</th><th>ขั้นตอน</th><th>กำหนดส่ง</th><th>ความสำคัญ</th><th>ยอดงาน</th></tr></thead><tbody>{recentJobs.map((job) => <tr key={job.id}><td><Link href={`/jobs/${job.id}`}>{job.job_number}</Link><strong>{job.title}</strong><span>{job.customer?.name ?? '-'}</span></td><td><span className="badge blue"><i />{stageLabels[job.stage]}</span></td><td>{job.deadline ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(job.deadline)) : '-'}</td><td><span className={`priority ${job.priority === 'URGENT' ? 'red' : job.priority === 'HIGH' ? 'orange' : 'gray'}`}>{priorityLabels[job.priority]}</span></td><td>{money(job.grand_total_satang)}</td></tr>)}</tbody></table></div> : <div className="empty-state"><BriefcaseBusiness /><h3>ยังไม่มี Job</h3><p>เพิ่มลูกค้าแล้วเปิดงานแรกของคุณได้ทันที</p><Link className="primary-button" href="/jobs/new">เปิด Job แรก</Link></div>}</section><aside className="side-stack"><section className="panel urgent-panel"><div className="panel-header compact"><div><h2><AlertTriangle size={18} />กำหนดส่งใกล้ถึง</h2><p>ภายใน 3 วันข้างหน้า</p></div><span className="count-pill">{deadlineSoon.length}</span></div>{deadlineSoon.length ? deadlineSoon.map((job) => <Link href={`/jobs/${job.id}`} className="urgent-item" key={job.id}><span className="urgent-dot" /><div><strong>{job.job_number}</strong><p>{job.title}</p><small>{job.customer?.name}</small></div></Link>) : <div className="mini-empty">ยังไม่มีงานที่ใกล้ถึงกำหนด</div>}</section></aside></div>
  </AppShell>;
}
