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
  acceptedAt?: string | null;
  approvedAt?: string | null;
  assignedGraphicName?: string | null;
  isAssignedGraphic: boolean;
  isOwnerOrAdmin: boolean;
  proofs: DesignProof[];
};

export function DesignWorkbench({
  jobId,
  stage,
  designStatus,
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
    if (stage === 'ADMIN' || designStatus === 'WAITING_DESIGN') {
      return <span className="badge amber"><Clock size={13} /> รอกราฟิกรับงาน</span>;
    }
    switch (designStatus) {
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
    <section className="panel detail-card design-workbench-card">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={18} className="text-primary" />
            ระบบงานออกแบบ & ส่งแบบร่าง (Design Proofs)
          </h2>
          <p>
            กราฟิก: <strong>{assignedGraphicName || 'ยังไม่ได้ระบุ'}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getStatusBadge()}
        </div>
      </div>

      {/* WORKFLOW STATUS NOTIFICATION & ACTION BAR */}
      {stage === 'ADMIN' || designStatus === 'WAITING_DESIGN' ? (
        <div className="workbench-workflow-banner amber-banner">
          <div>
            <strong>
              <Clock size={15} /> งานใหม่รอกราฟิกรับงาน
            </strong>
            <p>กราฟิกผู้รับผิดชอบต้องกดยืนยันเพื่อเริ่มดำเนินงานออกแบบ</p>
          </div>
          <form action={acceptJobAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <button className="primary-button" style={{ backgroundColor: '#16a34a' }}>
              <UserCheck size={16} /> กดยืนยันรับงาน
            </button>
          </form>
        </div>
      ) : null}

      {stage === 'DESIGN' && designStatus === 'WAITING_CUSTOMER' ? (
        <div className="workbench-workflow-banner blue-banner">
          <div>
            <strong>
              <MessageSquare size={15} /> อยู่ระหว่างส่งแบบให้ลูกค้าพิจารณา
            </strong>
            <p>แอดมินสามารถคัดลอกรูปส่งให้ลูกค้าใน LINE ได้ เมื่อลูกค้าตกลงแล้วกดปุ่มด้านขวา</p>
          </div>
          <form action={confirmCustomerApproveAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <button className="primary-button" style={{ backgroundColor: '#0284c7' }}>
              <CheckCircle2 size={16} /> ลูกค้ายืนยันแบบแล้ว
            </button>
          </form>
        </div>
      ) : null}

      {designStatus === 'APPROVED' && stage === 'DESIGN' ? (
        <div className="workbench-workflow-banner green-banner">
          <div>
            <strong>
              <CheckCircle2 size={15} /> แบบผ่านการอนุมัติแล้ว!
            </strong>
            <p>กราฟิกส่งไฟล์เข้าโฟลเดอร์ผลิตของร้าน แล้วกดยืนยันส่งต่อฝ่ายผลิตได้เลย</p>
          </div>
          <form action={confirmProductionReadyAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <button className="primary-button" style={{ backgroundColor: '#15803d' }}>
              <FileCheck size={16} /> ยืนยันการผลิต (ส่งไฟล์แล้ว)
            </button>
          </form>
        </div>
      ) : null}

      {/* PROOF DISPLAY & UPLOAD GRID */}
      <div className="proof-workspace-grid">
        {/* ACTIVE PROOF DISPLAY */}
        <div className="proof-display-pane">
          {activeProof ? (
            <div className="proof-active-box">
              <div className="proof-active-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge blue">เวอร์ชัน v{activeProof.version}</span>
                  {proofs.length > 1 ? (
                    <div className="proof-version-pills">
                      {proofs.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedProof(p)}
                          className={`ver-pill ${activeProof?.id === p.id ? 'active' : ''}`}
                        >
                          v{p.version}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <small className="proof-uploader-tag">
                  {activeProof.creator?.full_name || 'กราฟิก'} · {new Date(activeProof.created_at).toLocaleDateString('th-TH')}
                </small>
              </div>

              <div className="proof-img-frame">
                <img
                  src={activeProof.image_url}
                  alt={`Proof v${activeProof.version}`}
                />
              </div>

              {activeProof.note ? (
                <div className="proof-note-callout">
                  <MessageSquare size={14} /> <span>{activeProof.note}</span>
                </div>
              ) : null}

              <div className="proof-actions-row">
                <button
                  type="button"
                  onClick={() => handleCopy(activeProof.image_url)}
                  className="secondary-button"
                  style={{ flex: 1 }}
                >
                  <Copy size={15} />
                  {copiedUrl === activeProof.image_url ? 'คัดลอกรูปภาพแล้ว!' : 'คัดลอกรูปลิงก์ส่งลูกค้า'}
                </button>
                <a
                  href={activeProof.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="secondary-button"
                >
                  <Download size={15} /> เปิดรูปขนาดเต็ม
                </a>
              </div>
            </div>
          ) : (
            <div className="proof-empty-box">
              <ImageIcon size={32} />
              <h4>ยังไม่มีการอัปโหลดแบบร่าง</h4>
              <p>สามารถอัปโหลดภาพแบบร่าง v1 จากฟอร์มด้านข้างเพื่อให้แอดมินส่งลูกค้า</p>
            </div>
          )}
        </div>

        {/* UPLOAD NEW PROOF FORM */}
        <div className="proof-upload-pane">
          <div className="upload-form-card">
            <h3>
              <Upload size={16} className="text-primary" /> อัปโหลดแบบร่างใหม่
            </h3>

            <form action={proofAction} className="upload-form-body">
              <input type="hidden" name="jobId" value={jobId} />

              <div className="form-group">
                <label>ไฟล์รูปภาพแบบร่าง:</label>
                <input
                  type="file"
                  name="proofFile"
                  accept="image/*"
                  className="file-input-compact"
                />
              </div>

              <div className="or-divider"><span>หรือใส่ลิงก์ URL</span></div>

              <div className="form-group">
                <label>ลิงก์รูปภาพ (URL):</label>
                <input
                  type="url"
                  name="proofUrl"
                  placeholder="https://..."
                  className="text-input-compact"
                />
              </div>

              <div className="form-group">
                <label>หมายเหตุแบบ (ถ้ามี):</label>
                <textarea
                  name="note"
                  rows={2}
                  placeholder="เช่น ปรับแก้ฟอนต์ตามบรีฟลูกค้า..."
                  className="text-input-compact"
                />
              </div>

              {proofState?.error ? (
                <p className="form-msg error">{proofState.error}</p>
              ) : null}
              {proofState?.success ? (
                <p className="form-msg success">{proofState.success}</p>
              ) : null}

              <button
                type="submit"
                className="primary-button"
                disabled={pending}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Upload size={15} /> {pending ? 'กำลังอัปโหลด...' : 'อัปโหลดแบบร่าง'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}