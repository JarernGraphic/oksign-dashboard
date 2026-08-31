'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  CalendarDays, CheckCircle2, Eye, Grid2X2, ImageOff, LayoutGrid, List,
  Wrench, ZoomIn, X, Check, Flame, Sparkles
} from 'lucide-react';
import { confirmTechnicianAssemblyAction } from '../jobs/actions';

type Brief = {
  quantity: number;
  dimensions: string | null;
  material: string | null;
  requirements: string | null;
} | null;

type Job = {
  id: string;
  job_number: string;
  title: string;
  priority?: string | null;
  deadline: string | null;
  completed_at?: string | null;
  customer: { name: string } | null;
  brief: Brief;
};

function details(brief: Brief) {
  if (!brief?.requirements) {
    return {
      materials: brief?.material ? [brief.material] : [],
      finishing: [] as string[],
      shapes: [] as string[],
    };
  }
  try {
    const spec = JSON.parse(brief.requirements);
    return {
      materials: spec.materials || [],
      finishing: spec.finishing || [],
      shapes: spec.shapes || [],
    };
  } catch {
    return {
      materials: brief?.material ? [brief.material] : [],
      finishing: [],
      shapes: [],
    };
  }
}

function formatDim(dim?: string | null) {
  if (!dim) return '';
  const trimmed = dim.trim();
  if (trimmed.endsWith('ซม.') || trimmed.endsWith('ซม') || trimmed.endsWith('cm') || trimmed.endsWith('ม.') || trimmed.endsWith('เมตร')) {
    return trimmed;
  }
  return `${trimmed} ซม.`;
}

export function TechnicianJobsView({
  pendingJobs,
  completedJobs,
  thumbnails,
}: {
  pendingJobs: Job[];
  completedJobs: Job[];
  thumbnails: Record<string, string>;
}) {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  // Default to 'compact' (การ์ดย่อ) so mobile view starts in 2-column compact grid automatically
  const [view, setView] = useState<'cards' | 'compact' | 'list'>('compact');
  const [modalImage, setModalImage] = useState<{ url: string; title: string; num: string } | null>(null);
  const [confirmJob, setConfirmJob] = useState<{ id: string; num: string; title: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentJobs = activeTab === 'pending' ? pendingJobs : completedJobs;

  return (
    <>
      {/* PROMINENT SIDE-BY-SIDE TABS & VIEW TOGGLE TOOLBAR */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1, minWidth: '260px', maxWidth: '420px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '9px 10px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              backgroundColor: activeTab === 'pending' ? '#ffffff' : '#dc2626',
              color: activeTab === 'pending' ? '#dc2626' : '#ffffff',
              border: activeTab === 'pending' ? '2px solid #dc2626' : '1px solid #dc2626',
              boxShadow: activeTab === 'pending' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <Wrench size={14} /> งานรอประกอบ ({pendingJobs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            style={{
              padding: '9px 10px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              backgroundColor: activeTab === 'completed' ? '#ffffff' : '#dc2626',
              color: activeTab === 'completed' ? '#dc2626' : '#ffffff',
              border: activeTab === 'completed' ? '2px solid #dc2626' : '1px solid #dc2626',
              boxShadow: activeTab === 'completed' ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <CheckCircle2 size={14} /> งานเสร็จแล้ว ({completedJobs.length})
          </button>
        </div>

        <div className="jobs-view-toggle" role="group" aria-label="รูปแบบการแสดงผล" style={{ margin: 0 }}>
          <button
            type="button"
            className={view === 'cards' ? 'active' : ''}
            onClick={() => setView('cards')}
          >
            <Grid2X2 size={14} /> การ์ดใหญ่
          </button>
          <button
            type="button"
            className={view === 'compact' ? 'active' : ''}
            onClick={() => setView('compact')}
            title="ย่อขนาดการ์ดงานเพื่อแสดงหลายรายการพร้อมกันในจอเดียว"
          >
            <LayoutGrid size={14} /> การ์ดย่อ
          </button>
          <button
            type="button"
            className={view === 'list' ? 'active' : ''}
            onClick={() => setView('list')}
          >
            <List size={14} /> รายการ
          </button>
        </div>
      </div>

      {currentJobs.length === 0 ? (
        <div className="panel empty-state" style={{ padding: '50px 20px', textAlign: 'center', borderRadius: '12px', background: '#fff' }}>
          {activeTab === 'pending' ? (
            <>
              <CheckCircle2 size={36} style={{ color: '#059669', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '17px', color: '#0f172a', margin: '0 0 4px', fontWeight: 700 }}>ไม่มีงานที่รอประกอบ</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>เมื่องานผลิตพร้อมแล้ว งานจะแสดงในหน้านี้</p>
            </>
          ) : (
            <>
              <Wrench size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: '17px', color: '#0f172a', margin: '0 0 4px', fontWeight: 700 }}>ยังไม่มีงานที่คุณประกอบเสร็จแล้ว</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>เมื่องานประกอบเสร็จสิ้นและกดยืนยัน งานจะมาแสดงในหน้านี้</p>
            </>
          )}
        </div>
      ) : view === 'cards' || view === 'compact' ? (
        <div className={`customer-job-cards ${view === 'compact' ? 'compact-grid-view' : ''}`}>
          {currentJobs.map((job) => {
            const d = details(job.brief);
            const imageUrl = thumbnails[job.id];
            const isCompletedTab = activeTab === 'completed';
            const isUrgent = job.priority === 'URGENT';
            const isHigh = job.priority === 'HIGH';

            return (
              <article
                className={`customer-job-card ${isUrgent ? 'urgent-highlight-card' : isHigh ? 'high-highlight-card' : ''}`}
                key={job.id}
                style={
                  isUrgent
                    ? { border: '2px solid #ef4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.22)' }
                    : isHigh
                    ? { border: '1.5px solid #f59e0b' }
                    : {}
                }
              >
                {/* UNCROPPED FULL IMAGE BOX */}
                <div
                  className="customer-job-card-image technician-uncropped-box"
                  onClick={() => {
                    if (imageUrl) {
                      setModalImage({ url: imageUrl, title: job.title, num: job.job_number });
                    }
                  }}
                  title={imageUrl ? 'คลิกเพื่อขยายรูปภาพแบบร่างขนาดเต็ม' : undefined}
                >
                  {imageUrl ? (
                    <>
                      <img src={imageUrl} alt={`แบบร่าง ${job.title}`} />
                      <div className="img-hover-overlay">
                        <ZoomIn size={20} />
                        <span>ขยายรูป</span>
                      </div>
                    </>
                  ) : (
                    <div className="no-img-placeholder">
                      <ImageOff size={28} />
                      <span>ยังไม่มีรูปภาพแบบร่าง</span>
                    </div>
                  )}

                  {isCompletedTab ? (
                    <span className="badge green customer-job-card-stage" style={{ backgroundColor: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }}>
                      <Check size={11} /> ประกอบเสร็จแล้ว
                    </span>
                  ) : (
                    <span className="badge amber customer-job-card-stage">รอประกอบ</span>
                  )}

                  {/* URGENT HIGHLIGHT BADGE TOP RIGHT */}
                  {isUrgent ? (
                    <span className="badge red customer-job-card-stage" style={{ right: '6px', left: 'auto', backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Flame size={11} /> ด่วนที่สุด
                    </span>
                  ) : isHigh ? (
                    <span className="badge amber customer-job-card-stage" style={{ right: '6px', left: 'auto', backgroundColor: '#ffedd5', color: '#ea580c', border: '1px solid #fed7aa', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Sparkles size={11} /> งานด่วน
                    </span>
                  ) : null}
                </div>

                <div className="customer-job-card-body">
                  <div className="customer-job-card-top">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="technician-job-number-link"
                    >
                      #{job.job_number}
                    </Link>
                    <Link href={`/jobs/${job.id}`} className="view-detail-link" title="ดูรายละเอียดใบงาน">
                      <Eye size={15} /> ดูใบงาน
                    </Link>
                  </div>

                  <h3 className="technician-job-title">
                    <Link href={`/jobs/${job.id}`}>{job.title}</Link>
                  </h3>

                  <div className="technician-job-primary-specs">
                    <span className="spec-pill quantity-pill" title="จำนวนชิ้น">
                      <strong>{job.brief?.quantity ?? 1} ชิ้น</strong>
                    </span>
                    {job.brief?.dimensions && (
                      <span className="spec-pill dim-pill" title="ขนาด">
                        <strong>{formatDim(job.brief.dimensions)}</strong>
                      </span>
                    )}
                  </div>

                  <div className="technician-job-specs">
                    {[...d.materials, ...d.finishing, ...d.shapes].map((item: string) => (
                      <span key={item} className="spec-pill">
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="customer-job-card-meta">
                    <span>{job.customer?.name ?? 'ไม่ระบุลูกค้า'}</span>
                    <span>
                      <CalendarDays size={14} />{' '}
                      {isCompletedTab && job.completed_at
                        ? `เสร็จเมื่อ ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(job.completed_at))}`
                        : job.deadline
                        ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(job.deadline))
                        : 'ไม่ระบุกำหนดส่ง'}
                    </span>
                  </div>

                  {!isCompletedTab && (
                    <button
                      type="button"
                      className="primary-button"
                      style={{ width: '100%', justifyContent: 'center', backgroundColor: '#dc2626', fontWeight: 700, marginTop: '12px' }}
                      onClick={() => setConfirmJob({ id: job.id, num: job.job_number, title: job.title })}
                    >
                      <CheckCircle2 size={16} /> ยืนยันประกอบงาน
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>เลขที่งาน</th>
                <th>ชื่องาน</th>
                <th>รูปภาพ</th>
                <th>รายละเอียดผลิต</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {currentJobs.map((job) => {
                const d = details(job.brief);
                const imageUrl = thumbnails[job.id];
                const isCompletedTab = activeTab === 'completed';
                return (
                  <tr key={job.id}>
                    <td>
                      <Link href={`/jobs/${job.id}`} className="technician-job-number-link">
                        #{job.job_number}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/jobs/${job.id}`} className="technician-job-title-link">
                        {job.title}
                      </Link>
                    </td>
                    <td>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={job.title}
                          onClick={() => setModalImage({ url: imageUrl, title: job.title, num: job.job_number })}
                          style={{ width: '48px', height: '48px', objectFit: 'contain', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}
                        />
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>ไม่มีรูป</span>
                      )}
                    </td>
                    <td>
                      <strong>{job.brief?.quantity ?? 1} ชิ้น</strong> · {formatDim(job.brief?.dimensions) || '-'} · {[...d.materials, ...d.finishing, ...d.shapes].join(', ') || '-'}
                    </td>
                    <td>
                      {!isCompletedTab ? (
                        <button
                          type="button"
                          className="primary-button"
                          style={{ backgroundColor: '#dc2626', fontWeight: 700 }}
                          onClick={() => setConfirmJob({ id: job.id, num: job.job_number, title: job.title })}
                        >
                          <CheckCircle2 size={16} /> ยืนยันประกอบงาน
                        </button>
                      ) : (
                        <span style={{ color: '#15803d', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={14} /> เสร็จสิ้น
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FULL IMAGE MODAL */}
      {modalImage && (
        <div className="custom-modal-backdrop" onClick={() => setModalImage(null)}>
          <div
            className="custom-modal-card"
            style={{ maxWidth: '850px', width: '92%', padding: '20px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>
                  <span style={{ color: '#dc2626', marginRight: '8px' }}>#{modalImage.num}</span>
                  {modalImage.title}
                </h3>
                <small style={{ color: '#64748b' }}>รูปภาพแบบร่างสำหรับประกอบงาน</small>
              </div>
              <button
                type="button"
                className="secondary-button"
                style={{ padding: '6px', borderRadius: '50%', minWidth: 0 }}
                onClick={() => setModalImage(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: '70vh', overflow: 'hidden' }}>
              <img
                src={modalImage.url}
                alt={modalImage.title}
                style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '6px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL BEFORE ASSEMBLY COMPLETE */}
      {confirmJob && (
        <div className="custom-modal-backdrop" onClick={() => !isPending && setConfirmJob(null)}>
          <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-header">
              <div
                className="custom-modal-icon-circle"
                style={{
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wrench size={22} />
              </div>
              <div>
                <h3 className="custom-modal-title">ยืนยันการประกอบงานเสร็จสิ้น</h3>
                <p className="custom-modal-subtitle">
                  เลขงาน <strong style={{ color: '#dc2626' }}>#{confirmJob.num}</strong> — {confirmJob.title}
                </p>
              </div>
            </div>

            <div className="custom-modal-body">
              <p style={{ margin: 0, fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
                คุณต้องการยืนยันว่างานชิ้นนี้ผลิตและประกอบงานเสร็จสิ้นเรียบร้อยแล้วใช่หรือไม่? เมื่อยืนยันแล้ว สถานะจะถูกเปลี่ยนเป็น <strong>"เสร็จสิ้น"</strong> ทันที
              </p>
            </div>

            <div className="custom-modal-footer">
              <button
                type="button"
                className="secondary-button"
                disabled={isPending}
                onClick={() => setConfirmJob(null)}
              >
                ยกเลิก
              </button>

              <form
                action={(formData) => {
                  startTransition(async () => {
                    await confirmTechnicianAssemblyAction(formData);
                    setConfirmJob(null);
                  });
                }}
              >
                <input type="hidden" name="jobId" value={confirmJob.id} />
                <button
                  type="submit"
                  disabled={isPending}
                  className="primary-button"
                  style={{ backgroundColor: '#dc2626', fontWeight: 700 }}
                >
                  <CheckCircle2 size={16} />
                  {isPending ? 'กำลังบันทึก...' : 'ยืนยันประกอบงานเสร็จสิ้น'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
