'use client';

import { useActionState, useState } from 'react';
import {
  CheckCircle2, Clock, Copy, Download, FileCheck, History, Image as ImageIcon,
  MessageSquare, Send, Sparkles, Upload, UserCheck
} from 'lucide-react';
import {
  acceptJobAction,
  confirmCustomerApproveAction,
  confirmProductionReadyAction,
  uploadDesignProofAction,
  type DesignProofFormState
} from '../app/jobs/actions';

export type DesignProof = {
  id: string;
  version: number;
  image_url: string;
  note: string | null;
  created_at: string;
  creator?: { full_name: string } | null;
};

export type DesignWorkbenchProps = {
  jobId: string;
  stage: string;
  designStatus: string;
  acceptedAt: string | null;
  approvedAt: string | null;
  assignedGraphicName?: string | null;
  isAssignedGraphic: boolean;
  isOwnerOrAdmin: boolean;
  proofs: DesignProof[];
};

export function DesignWorkbench({
  jobId,
  stage,
  designStatus,
  acceptedAt,
  approvedAt,
  assignedGraphicName,
  isAssignedGraphic,
  isOwnerOrAdmin,
  proofs = [],
}: DesignWorkbenchProps) {
  const [proofState, proofAction, pending] = useActionState<DesignProofFormState, FormData>(
    uploadDesignProofAction,
    {}
  );

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<DesignProof | null>(proofs[0] || null);

  const activeProof = selectedProof || proofs[0];

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const getStatusBadge = () => {
    switch (designStatus) {
      case 'WAITING_DESIGN':
        return <span className="badge amber"><Clock size={13} /> รอกราฟิกรัยงาน</span>;
      case 'DESIGNING':
        return <span className="badge blue"><Sparkles size={13} /> กำลังออกแบบ</span>;
      case 'WAITING_CUSTOMER':
        return <span className="badge cyan"><Send size={13} /> ส่งแบบแล้ว - รออนุมัติ</span>;
      case 'APPROVED':
        return <span className="badge green"><FileCheck size={13} /> ผ่านการอนุมัติแบบแล้ว</span>;
      default:
        return <span className="badge gray">{designStatus}</span>;
    }
  };

  return (
    <section className="panel detail-card design-workbench-panel">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={20} className="text-primary" />
            ระบบงานออกแบบ & จัดการส่งแบบร่าง (Design Proofs)
          </h2>
          <p>
            กราฟิก: <strong>{assignedGraphicName || 'ยังไม่ได้ระบุ'}</strong>
            {acceptedAt ? ` · ยืนยันรับงานเมื่อ ${new Date(acceptedAt).toLocaleDateString('th-TH')}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getStatusBadge()}
        </div>
      </div>

      {/* ACTION BAR BASED ON WORKFLOW */}
      <div className="design-action-bar" style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* STEP 1: GRAPHIC ACCEPTANCE */}
        {!acceptedAt && (designStatus === 'WAITING_DESIGN' || stage === 'ADMIN') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={15} /> งานใหม่รอกราฟิกรัยงาน
              </strong>
              <small>กราฟิกผู้รับผิดชอบต้องกดยืนยันเพื่อเริ่มดำเนินงานออกแบบ</small>
            </div>
            <form action={acceptJobAction}>
              <input type="hidden" name="jobId" value={jobId} />
              <button className="primary-button" style={{ backgroundColor: '#16a34a' }}>
                <UserCheck size={16} />
                กดยืนยันรับงาน
              </button>
            </form>
          </div>
        ) : null}

        {/* STEP 2: ADMIN CONFIRMS CUSTOMER APPROVAL */}
        {acceptedAt && designStatus === 'WAITING_CUSTOMER' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageSquare size={15} /> อยู่ระหว่างส่งแบบให้ลูกค้าพิจารณา
              </strong>
              <small>แอดมินสามารถคัดลอกรูปส่งให้ลูกค้าใน LINE ได้ เมื่อลูกค้าตกลงแล้วกดปุ่มเพื่อแจ้งกราฟิก</small>
            </div>
            <form action={confirmCustomerApproveAction}>
              <input type="hidden" name="jobId" value={jobId} />
              <button className="primary-button" style={{ backgroundColor: '#0284c7' }}>
                <CheckCircle2 size={16} />
                ลูกค้ายืนยันแบบแล้ว
              </button>
            </form>
          </div>
        ) : null}

        {/* STEP 3: GRAPHIC CONFIRMS PRODUCTION READY */}
        {designStatus === 'APPROVED' && stage === 'DESIGN' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
            <div>
              <strong style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={15} /> แบบผ่านการอนุมัติแล้ว!
              </strong>
              <small>กราฟิกส่งไฟล์เข้าโฟลเดอร์ผลิตของร้าน แล้วกดยืนยันส่งต่อฝ่ายผลิตได้เลย</small>
            </div>
            <form action={confirmProductionReadyAction}>
              <input type="hidden" name="jobId" value={jobId} />
              <button className="primary-button" style={{ backgroundColor: '#15803d' }}>
                <FileCheck size={16} />
                ยืนยันการผลิต (ส่งไฟล์แล้ว)
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {/* PROOF DISPLAY & UPLOAD GRID */}
      <div className="proof-grid" style={{ display: 'grid', gridTemplateColumns: proofs.length > 0 ? '1fr 340px' : '1fr', gap: '20px' }}>
        {/* LEFT COLUMN: ACTIVE PROOF DISPLAY */}
        <div>
          {activeProof ? (
            <div className="proof-active-card" style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span className="badge blue" style={{ fontSize: '13px', padding: '4px 10px' }}>
                  รูปตัวอย่างแบบ เวอร์ชัน v{activeProof.version}
                </span>
                <small style={{ color: '#64748b' }}>
                  อัปโหลดโดย {activeProof.creator?.full_name || 'กราฟิก'} · {new Date(activeProof.created_at).toLocaleDateString('th-TH')}
                </small>
              </div>

              <div className="image-wrapper" style={{
                background: '#0f172a',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                minHeight: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                <img
                  src={activeProof.image_url}
                  alt={`Proof v${activeProof.version}`}
                  style={{ maxHeight: '450px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }}
                />
              </div>

              {activeProof.note ? (
                <p style={{ marginTop: '12px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={15} /> <strong>หมายเหตุแบบ:</strong> {activeProof.note}
                </p>
              ) : null}

              {/* ADMIN COPY & DOWNLOAD ACTION BUTTONS */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                <button
                  type="button"
                  onClick={() => handleCopy(activeProof.image_url)}
                  className="secondary-button"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  <Copy size={16} />
                  {copiedUrl === activeProof.image_url ? 'คัดลอกรูปภาพแล้ว!' : 'คัดลอกรูป/ลิงก์ส่งลูกค้า'}
                </button>
                <a
                  href={activeProof.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                  style={{ textDecoration: 'none', justifyContent: 'center' }}
                >
                  <Download size={16} />
                  เปิดรูปขนาดเต็ม
                </a>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px', border: '2px dashed #cbd5e1', borderRadius: '10px' }}>
              <ImageIcon size={40} style={{ color: '#94a3b8' }} />
              <h3>ยังไม่มีการอัปโหลดแบบร่าง</h3>
              <p>กราฟิกสามารถอัปโหลดรูปภาพแบบร่าง v1 ให้แอดมินนำส่งลูกค้าได้จากฟอร์มด้านขวา</p>
            </div>
          )}

          {/* HISTORY OF OLD PROOF VERSIONS */}
          {proofs.length > 1 ? (
            <div className="proof-history" style={{ marginTop: '20px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={16} /> ประวัติแบบร่างทั้งหมด ({proofs.length} เวอร์ชัน)
              </h4>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                {proofs.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProof(p)}
                    style={{
                      border: (activeProof?.id === p.id) ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '6px',
                      background: '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minWidth: '110px',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: (activeProof?.id === p.id) ? '#2563eb' : '#334155' }}>
                      เวอร์ชัน v{p.version}
                    </div>
                    <small style={{ fontSize: '10px', color: '#64748b' }}>
                      {new Date(p.created_at).toLocaleDateString('th-TH')}
                    </small>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* RIGHT COLUMN: UPLOAD NEW PROOF FORM */}
        <div>
          <div className="panel" style={{ background: '#fafafa', border: '1px solid #e4e4e7', padding: '16px', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={18} className="text-primary" />
              อัปโหลดแบบร่าง (เวอร์ชันใหม่)
            </h3>

            <form action={proofAction} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="hidden" name="jobId" value={jobId} />

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  ไฟล์รูปภาพแบบร่าง (.png, .jpg, .webp):
                </label>
                <input
                  type="file"
                  name="proofFile"
                  accept="image/*"
                  style={{ width: '100%', fontSize: '12px' }}
                />
              </div>

              <div style={{ textAlign: 'center', fontSize: '11px', color: '#71717a' }}>— หรือ —</div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  ลิงก์รูปภาพแบบร่าง (URL):
                </label>
                <input
                  type="url"
                  name="proofUrl"
                  placeholder="https://..."
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #d4d4d8', borderRadius: '6px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', display: 'block', marginBottom: '4px' }}>
                  หมายเหตุแบบ (เช่น รายละเอียดที่แก้ไข):
                </label>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="เช่น ปรับแก้ฟอนต์ตามบรีฟลูกค้า..."
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12px', border: '1px solid #d4d4d8', borderRadius: '6px' }}
                />
              </div>

              {proofState?.error ? (
                <p style={{ color: '#dc2626', fontSize: '12px', margin: 0 }}>{proofState.error}</p>
              ) : null}
              {proofState?.success ? (
                <p style={{ color: '#16a34a', fontSize: '12px', margin: 0 }}>{proofState.success}</p>
              ) : null}

              <button
                type="submit"
                className="primary-button"
                disabled={pending}
                style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
              >
                <Upload size={16} />
                {pending ? 'กำลังอัปโหลด...' : 'อัปโหลดแบบร่างใหม่'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
