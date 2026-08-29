'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CalendarDays, Grid2X2, List, WalletCards, ImageOff } from 'lucide-react';
import { money } from '../lib/format';

type Job = {
  id: string; job_number: string; title: string; stage: string; design_status?: string | null; priority: string;
  deadline: string | null; grand_total_satang: number; paid_amount_satang: number;
};

const stageLabels: Record<string, string> = { ADMIN: 'รอจัดสรร', DESIGN: 'กำลังออกแบบ', PRODUCTION: 'รอผลิต', DELIVERY: 'จัดส่ง / ติดตั้ง', COMPLETE: 'เสร็จสมบูรณ์' };
const stageColors: Record<string, string> = { ADMIN: 'gray', DESIGN: 'blue', PRODUCTION: 'amber', DELIVERY: 'cyan', COMPLETE: 'green' };

export function CustomerJobsView({ jobs, thumbnails }: { jobs: Job[]; thumbnails: Record<string, string> }) {
  const [view, setView] = useState<'list' | 'cards'>('cards');
  return (
    <>
      <div className="jobs-view-toggle" role="group" aria-label="รูปแบบการแสดงผล">
        <button type="button" className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')}><Grid2X2 size={15} /> การ์ด</button>
        <button type="button" className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={15} /> รายการ</button>
      </div>
      {view === 'cards' ? (
        <div className="customer-job-cards">
          {jobs.map((job) => {
            const remaining = (job.grand_total_satang || 0) - (job.paid_amount_satang || 0);
            return <Link href={`/jobs/${job.id}`} className="customer-job-card" key={job.id}>
              <div className="customer-job-card-image">
                {thumbnails[job.id] ? <img src={thumbnails[job.id]} alt={`ภาพตัวอย่าง ${job.title}`} /> : <><ImageOff size={26} /><span>ยังไม่มีภาพตัวอย่าง</span></>}
                <span className={`badge ${stageColors[job.stage] || 'gray'} customer-job-card-stage`}>{job.stage === 'DESIGN' && job.design_status === 'APPROVED' ? 'ผลิต' : stageLabels[job.stage] || job.stage}</span>
              </div>
              <div className="customer-job-card-body">
                <div className="customer-job-card-top"><span>#{job.job_number}</span><WalletCards size={15} /></div>
                <h3>{job.title}</h3>
                <div className="customer-job-card-meta"><span><CalendarDays size={14} /> {job.deadline ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(job.deadline)) : 'ไม่ระบุกำหนดส่ง'}</span></div>
                <div className="customer-job-card-footer"><strong>{money(job.grand_total_satang)}</strong><span className={remaining <= 0 ? 'paid' : 'due'}>{remaining <= 0 ? 'ชำระครบ' : `ค้าง ${money(remaining)}`}</span></div>
              </div>
            </Link>;
          })}
        </div>
      ) : <div className="table-wrap"><table><thead><tr><th>รหัสงาน (7 หลัก)</th><th>ชื่องาน</th><th>ขั้นตอน</th><th>กำหนดส่ง</th><th>ยอดสุทธิ</th><th>สถานะชำระ</th></tr></thead><tbody>{jobs.map((job) => { const remaining = (job.grand_total_satang || 0) - (job.paid_amount_satang || 0); return <tr key={job.id}><td><Link href={`/jobs/${job.id}`} className="job-code-link"><strong>{job.job_number}</strong></Link></td><td><Link href={`/jobs/${job.id}`} className="job-title-link"><strong>{job.title}</strong></Link></td><td><span className={`badge ${stageColors[job.stage] || 'gray'}`}><i></i>{stageLabels[job.stage] || job.stage}</span></td><td>{job.deadline ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(job.deadline)) : '-'}</td><td><strong>{money(job.grand_total_satang)}</strong></td><td><span className={`badge ${remaining <= 0 ? 'green' : job.paid_amount_satang > 0 ? 'amber' : 'red'} mini`}>{remaining <= 0 ? 'ชำระครบ' : job.paid_amount_satang > 0 ? 'มัดจำแล้ว' : 'ยังไม่ชำระ'}</span></td></tr>; })}</tbody></table></div>}
    </>
  );
}
