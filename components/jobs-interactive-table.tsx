'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, CheckCircle2, Clock, Factory,
  Layers, Palette, Phone, Send, User, UserCheck, Wrench
} from 'lucide-react';
import { JobTableRow } from './job-table-row';
import { ImageHoverPreview } from './image-hover-preview';

export type JobItem = {
  id: string;
  job_number: string;
  title: string;
  stage: string;
  status: string;
  design_status?: string;
  priority: string;
  deadline: string | null;
  grand_total_satang: number;
  assigned_graphic_id: string | null;
  created_by: string | null;
  created_at: string;
  customer: { name: string; phone?: string | null } | null;
};

const getJobStatusBadge = (job: JobItem) => {
  if (job.stage === 'ADMIN' || job.design_status === 'WAITING_DESIGN') {
    return {
      label: 'รอยืนยัน',
      icon: Clock,
      style: { backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
    };
  }
  if (job.stage === 'DESIGN') {
    if (job.design_status === 'WAITING_CUSTOMER') {
      return {
        label: 'ส่งแบบ/แก้ไข',
        icon: Send,
        style: { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }
      };
    }
    if (job.design_status === 'APPROVED') {
      return {
        label: 'ยืนยันการผลิต',
        icon: Factory,
        style: { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fed7aa' }
      };
    }
    return {
      label: 'ออกแบบ/แก้ไข',
      icon: Palette,
      style: { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }
    };
  }
  if (job.stage === 'PRODUCTION') {
    return {
      label: 'รอผลิต',
      icon: Factory,
      style: { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fed7aa' }
    };
  }
  if (job.stage === 'DELIVERY' || job.stage === 'COMPLETE' || job.status === 'COMPLETED') {
    return {
      label: 'เสร็จสิ้น',
      icon: CheckCircle2,
      style: { backgroundColor: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }
    };
  }
  return {
    label: 'เสร็จสิ้น',
    icon: CheckCircle2,
    style: { backgroundColor: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }
  };
};

const priorityLabels: Record<string, string> = {
  LOW: 'ต่ำ',
  NORMAL: 'ปกติ',
  HIGH: 'สูง',
  URGENT: 'ด่วนที่สุด',
};

export function JobsInteractiveTable({
  jobs,
  proofThumbnails,
  profileMap,
  technicianMap = {},
  isDesignPage = false,
  initialSort = 'date_desc',
}: {
  jobs: JobItem[];
  proofThumbnails: Record<string, string>;
  profileMap: Record<string, string>;
  technicianMap?: Record<string, string>;
  isDesignPage?: boolean;
  initialSort?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sort, setSort] = useState<string>(initialSort);

  const handleSortChange = (newSort: string) => {
    setSort(newSort);
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const sortedJobs = useMemo(() => {
    const list = [...jobs];
    if (sort === 'date_asc') {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sort === 'job_number_desc') {
      list.sort((a, b) => {
        const numA = parseInt(a.job_number.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.job_number.replace(/\D/g, '') || '0', 10);
        return numB - numA;
      });
    } else if (sort === 'job_number_asc') {
      list.sort((a, b) => {
        const numA = parseInt(a.job_number.replace(/\D/g, '') || '0', 10);
        const numB = parseInt(b.job_number.replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });
    } else {
      // date_desc (default)
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [jobs, sort]);

  return (
    <section className="panel list-panel" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden', background: '#fff' }}>
      {/* TOOLBAR TOP ROW */}
      <div style={{ padding: '14px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: '600' }}>
          รายการงาน ({sortedJobs.length} รายการ)
        </span>

        {/* SORT CONTROL DROPDOWN */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
          <ArrowUpDown size={14} style={{ color: '#64748b' }} />
          <span style={{ fontWeight: '500', color: '#64748b' }}>เรียงตาม:</span>
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value)}
            style={{
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12.5px',
              color: '#0f172a',
              fontWeight: '600',
              cursor: 'pointer',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <option value="date_desc">วันที่สร้าง (ล่าสุด)</option>
            <option value="date_asc">วันที่สร้าง (เก่าสุด)</option>
            <option value="job_number_desc">รหัสงาน (มากไปน้อย)</option>
            <option value="job_number_asc">รหัสงาน (น้อยไปมาก)</option>
          </select>
        </div>
      </div>

      {sortedJobs.length ? (
        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                <th style={{ width: '76px', padding: '14px 16px', textAlign: 'center', fontWeight: '600' }}>รูปงาน</th>
                <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '110px' }}>รหัสงาน</th>
                <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '110px' }}>วันที่สร้าง</th>
                <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '180px' }}>ชื่องาน</th>
                <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '150px' }}>ลูกค้า / เบอร์ติดต่อ</th>
                <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '140px' }}>สถานะงาน</th>
                {!isDesignPage ? <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '140px' }}>คนออกแบบ</th> : null}
                <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '130px' }}>Admin</th>
                <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '130px' }}>ช่าง</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', width: '100px' }}>ความสำคัญ</th>
                {!isDesignPage ? <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', width: '120px' }}>ยอดงาน</th> : null}
                <th style={{ width: '48px', padding: '14px 12px', textAlign: 'center' }}></th>
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job) => {
                const graphicName = job.assigned_graphic_id
                  ? profileMap[job.assigned_graphic_id] || 'ไม่ระบุ'
                  : 'ยังไม่ได้เลือก';
                const adminName = job.created_by
                  ? profileMap[job.created_by] || 'ระบบ'
                  : 'ไม่ระบุ';

                const thumbnailUrl = proofThumbnails[job.id];
                const isUrgent = job.priority === 'URGENT';
                const isHigh = job.priority === 'HIGH';
                const isLow = job.priority === 'LOW';

                return (
                  <JobTableRow key={job.id} jobId={job.id}>
                    {/* 1. รูป Thumbnail (ขยายรูปเมื่อเอาเมาส์ชี้) */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <ImageHoverPreview src={thumbnailUrl} alt={job.title} />
                    </td>

                    {/* 2. รหัสงาน (สีแดงเด่น ไม่มีกรอบ) */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span
                        style={{
                          fontWeight: '700',
                          color: '#dc2626',
                          fontSize: '15px',
                          letterSpacing: '0.2px',
                        }}
                      >
                        #{job.job_number}
                      </span>
                    </td>

                    {/* 3. วันที่สร้าง (แยกคอลัมน์) */}
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                        {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok' }).format(new Date(job.created_at))}
                      </span>
                    </td>

                    {/* 4. ชื่องาน และกำหนดส่ง */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <strong style={{ fontSize: '14.5px', color: '#0f172a', fontWeight: '600', lineHeight: 1.35 }}>
                          {job.title}
                        </strong>
                        {job.deadline && (
                          <span style={{ fontSize: '12px', color: '#e11d48', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} /> ส่ง {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(job.deadline))}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 5. ชื่อลูกค้า และเบอร์โทร */}
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                          {job.customer?.name ?? '-'}
                        </span>
                        {job.customer?.phone && (
                          <span style={{ fontSize: '12px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={11} /> {job.customer.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 6. สถานะงานแบบ Pill Badge */}
                    <td style={{ padding: '12px 16px' }}>
                      {(() => {
                        const badge = getJobStatusBadge(job);
                        const Icon = badge.icon;
                        return (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12.5px',
                              fontWeight: '600',
                              padding: '5px 12px',
                              borderRadius: '20px',
                              border: `1px solid ${badge.style.borderColor}`,
                              backgroundColor: badge.style.backgroundColor,
                              color: badge.style.color,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Icon size={13} />
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>

                    {/* 7. ชื่อคนออกแบบ (หน้ารายการงานเท่านั้น) */}
                    {!isDesignPage ? (
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: job.assigned_graphic_id ? '#0284c7' : '#94a3b8',
                            backgroundColor: job.assigned_graphic_id ? '#f0f9ff' : '#f8fafc',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: job.assigned_graphic_id ? '1px solid #e0f2fe' : '1px solid #e2e8f0',
                          }}
                        >
                          <User size={13} />
                          {graphicName}
                        </span>
                      </td>
                    ) : null}

                    {/* 8. ชื่อ Admin */}
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                        <UserCheck size={14} style={{ color: '#64748b' }} />
                        {adminName}
                      </span>
                    </td>

                    {/* 8.5. ชื่อช่าง (ที่กดยืนยันการผลิต/ประกอบแล้ว) */}
                    <td style={{ padding: '12px 16px' }}>
                      {technicianMap[job.id] ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#059669',
                            backgroundColor: '#ecfdf5',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            border: '1px solid #a7f3d0',
                          }}
                        >
                          <Wrench size={13} />
                          {technicianMap[job.id]}
                        </span>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>-</span>
                      )}
                    </td>

                    {/* 9. ความสำคัญ */}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '600',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          backgroundColor: isUrgent ? '#fee2e2' : isHigh ? '#ffedd5' : isLow ? '#f1f5f9' : '#f8fafc',
                          color: isUrgent ? '#dc2626' : isHigh ? '#ea580c' : isLow ? '#64748b' : '#475569',
                          border: isUrgent ? '1px solid #fecaca' : isHigh ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {priorityLabels[job.priority] ?? job.priority}
                      </span>
                    </td>

                    {/* 10. ยอดงาน */}
                    {!isDesignPage ? (
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>
                        {new Intl.NumberFormat('th-TH', {
                          style: 'currency',
                          currency: 'THB',
                        }).format(job.grand_total_satang / 100)}
                      </td>
                    ) : null}

                    {/* 11. ลูกศรดูรายละเอียดงาน */}
                    <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#f1f5f9',
                          color: '#64748b',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <ArrowUpRight size={15} />
                      </div>
                    </td>
                  </JobTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#94a3b8' }}>
            <Layers size={32} />
          </div>
          <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#1e293b', margin: '0 0 6px' }}>
            {isDesignPage ? 'ไม่พบคิวงานออกแบบที่ตรงกับเงื่อนไข' : 'ไม่พบรายการงานที่ตรงกับเงื่อนไข'}
          </h3>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            ลองปรับเปลี่ยนตัวกรองเดือน ปี หรือสถานะงาน เพื่อค้นหาข้อมูล
          </p>
        </div>
      )}
    </section>
  );
}
