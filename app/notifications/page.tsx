import Link from 'next/link';
import { Bell, CalendarClock } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { thaiDate } from '../../lib/format';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

type Job={id:string;job_number:string;title:string;deadline:string;stage:string;customer:{name:string}|null};
export default async function NotificationsPage(){const profile=await getCurrentProfile();const supabase=await createSupabaseServerClient();const now=new Date();const limit=new Date(now);limit.setDate(limit.getDate()+7);const {data}=await supabase.from('jobs').select('id,job_number,title,deadline,stage,customer:customers(name)').eq('status','OPEN').not('deadline','is',null).lte('deadline',limit.toISOString()).order('deadline');const jobs=(data??[]) as unknown as Job[];const nowTime=now.getTime();return <AppShell profile={profile} active="/notifications"><div className="section-heading"><div><p>งานของทีม</p><h1>แจ้งเตือน</h1><span>งานเกินกำหนดและใกล้ถึงกำหนดใน 7 วัน</span></div></div><section className="panel notification-list">{jobs.length?jobs.map((job)=>{const overdue=new Date(job.deadline).getTime()<nowTime;return <Link href={`/jobs/${job.id}`} key={job.id}><span className={`notification-icon ${overdue?'danger':''}`}><CalendarClock size={18}/></span><span><strong>{overdue?'เกินกำหนด':'ใกล้ถึงกำหนด'} · {job.job_number}</strong><small>{job.title} · {job.customer?.name??'-'}</small></span><b>{thaiDate(job.deadline,true)}</b></Link>}):<div className="empty-state"><Bell/><h3>ไม่มีงานที่ต้องแจ้งเตือน</h3><p>ยังไม่มีงานเกินกำหนดหรือครบกำหนดใน 7 วัน</p></div>}</section></AppShell>;}
