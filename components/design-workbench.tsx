'use client';

import { useActionState, useState, useRef, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle, ArrowLeft, BellRing, CheckCircle2, Clock, Copy, Download, FileCheck, History, Image as ImageIcon,
  MessageSquare, MessageSquarePlus, Plus, RefreshCw, Send, Sparkles, Trash2, Upload, UploadCloud, UserCheck, X
} from 'lucide-react';
import {
  acceptJobAction,
  confirmCustomerApproveAction,
  confirmProofImageAction,
  confirmProductionReadyAction,
  deleteDesignProofAction,
  notifyGraphicRevisionAction,
  sendProofToCustomerAction,
  syncProofsFromFolderAction,
  uploadDesignProofAction,
  type DesignProofFormState
} from '../app/jobs/actions';
import { createSupabaseBrowserClient } from '../lib/supabase/client';

export type DesignProof = {
  id: string;
  version: number;
  image_url: string;
  note: string | null;
  created_at: string;
  creator?: { full_name: string } | null;
};

interface DesignWorkbenchProps {
  jobId: string;
  jobNumber?: string;
  stage: string;
  designStatus: string;
  assignedGraphicName?: string;
  isGraphicAssignee?: boolean;
  isAssignedGraphic?: boolean;
  isOwnerOrAdmin: boolean;
  proofs?: DesignProof[];
}

export function DesignWorkbench({
  jobId,
  jobNumber,
  stage,
  designStatus,
  assignedGraphicName,
  isGraphicAssignee,
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
  const [isUploadingNew, setIsUploadingNew] = useState<boolean>(proofs.length === 0);
  const [syncState, setSyncState] = useState<{ loading: boolean; msg?: string; error?: string }>({ loading: false });
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showRevisionModal, setShowRevisionModal] = useState<boolean>(false);
  const [revisionNote, setRevisionNote] = useState<string>('');
  const [isSubmittingRevision, setIsSubmittingRevision] = useState<boolean>(false);
  const [fullImageModalUrl, setFullImageModalUrl] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeProof = selectedProof || proofs[0] || null;

  const handleNotifyRevision = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingRevision(true);
    try {
      const formData = new FormData();
      formData.append('jobId', jobId);
      formData.append('note', revisionNote);
      await notifyGraphicRevisionAction(formData);
      setShowRevisionModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Revision error:', err);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  const handleDeleteProof = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDeleting(true);
    try {
      const formData = new FormData(e.currentTarget);
      await deleteDesignProofAction(formData);
      setShowDeleteModal(false);
      window.location.reload();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncFromFolder = async () => {
    setSyncState({ loading: true, msg: undefined, error: undefined });
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { session } } = await supabase.auth.getSession();

      const res = await fetch('/api/sync-proofs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ jobId, jobNum: jobNumber || '' }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || data?.error) {
        setSyncState({ loading: false, error: data?.error || 'เกิดข้อผิดพลาดในการซิงก์' });
      } else {
        setSyncState({ loading: false, msg: data?.success });
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      setSyncState({ loading: false, error: err?.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' });
    }
  };

  // Confirm proof image state
  const [isConfirmingProof, startConfirmProofTransition] = useTransition();
  const [confirmedProofId, setConfirmedProofId] = useState<string | null>(null);

  const handleConfirmProof = (proofId: string, imageUrl: string) => {
    const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('proofId', proofId);
    formData.append('imageUrl', imageUrl);

    startConfirmProofTransition(async () => {
      const res = await confirmProofImageAction(formData);
      if (res?.success) {
        setConfirmedProofId(proofId);
        window.location.reload();
      }
    });
  };

  // Dropzone, Drag & Drop, and Paste States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Auto upload state
  const [isUploadingAuto, setIsUploadingAuto] = useState<boolean>(false);

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setIsUploadingAuto(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (typeof e.target?.result === 'string') {
        let finalData = e.target.result;
        const img = new Image();
        img.onload = async () => {
          let { width, height } = img;
          const maxDimension = 2400;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              finalData = canvas.toDataURL('image/jpeg', 0.88);
            }
          }

          // Auto submit upload server action directly
          const formData = new FormData();
          formData.append('jobId', jobId);
          formData.append('imageData', finalData);
          formData.append('fileName', file.name);

          try {
            await uploadDesignProofAction({}, formData);
            window.location.reload();
          } catch (err) {
            console.error('Auto upload error:', err);
            setIsUploadingAuto(false);
          }
        };
        img.onerror = async () => {
          const formData = new FormData();
          formData.append('jobId', jobId);
          formData.append('imageData', finalData);
          formData.append('fileName', file.name);
          try {
            await uploadDesignProofAction({}, formData);
            window.location.reload();
          } catch (err) {
            setIsUploadingAuto(false);
          }
        };
        img.src = finalData;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBase64Data(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Support Ctrl + V Paste anywhere on page
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleFileSelected(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const getStatusBadge = () => {
    if (stage === 'ADMIN' || designStatus === 'WAITING_DESIGN') {
      return <span className="badge amber"><Clock size={13} /> รอยืนยัน</span>;
    }
    switch (designStatus) {
      case 'DESIGNING':
        return <span className="badge blue"><Sparkles size={13} /> กำลังออกแบบ</span>;
      case 'REVISION':
        return <span className="badge orange" style={{ background: '#fff7ed', color: '#ea580c', borderColor: '#ffedd5' }}><AlertCircle size={13} /> แก้ไขแบบ</span>;
      case 'WAITING_CUSTOMER':
        return <span className="badge red" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}><Send size={13} /> ส่งแบบ</span>;
      case 'APPROVED':
        return <span className="badge orange" style={{ background: '#ffedd5', color: '#c2410c', borderColor: '#fed7aa' }}>ผลิต</span>;
      default:
        return <span className="badge gray">{designStatus}</span>;
    }
  };

  return (
    <section className="panel detail-card design-workbench-card">
      <div className="panel-header design-workbench-header">
        <div className="header-info-group">
          <div className="header-title-row">
            <ImageIcon size={20} className="header-icon text-primary" />
            <h2 className="header-title">ระบบงานออกแบบ & ส่งแบบร่าง (Design Proofs)</h2>
          </div>
          <span className="graphic-assignee-tag">
            กราฟิกผู้รับผิดชอบ: <strong>{assignedGraphicName || 'ยังไม่ได้ระบุ'}</strong>
          </span>
        </div>
        <div className="header-status-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isOwnerOrAdmin && (
            <button
              type="button"
              onClick={handleSyncFromFolder}
              disabled={syncState.loading}
              className="secondary-button compact"
              title="ดึงรูปภาพที่มีเลขงานนี้จากโฟลเดอร์เซิร์ฟเวอร์ LAN อัตโนมัติ"
            >
              <RefreshCw size={13} style={syncState.loading ? { animation: 'spin 1s linear infinite' } : undefined} />
              {syncState.loading ? 'กำลังซิงก์...' : 'ซิงก์รูปจากโฟลเดอร์'}
            </button>
          )}

          <form action={confirmProductionReadyAction} style={{ display: 'inline-flex' }}>
            <input type="hidden" name="jobId" value={jobId} />
            <button
              type="submit"
              className="primary-button compact"
              style={{
                backgroundColor: '#ea580c',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '12.5px',
                padding: '5px 12px',
                borderRadius: '8px',
                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                border: 'none',
                cursor: 'pointer',
              }}
              title="กดยืนยันเมื่อส่งไฟล์พิมพ์เข้ากระบวนการผลิตเรียบร้อยแล้ว"
            >
              <FileCheck size={14} />
              ยืนยันการส่งผลิตแล้ว
            </button>
          </form>

          {getStatusBadge()}
        </div>
      </div>

      {syncState.error ? (
        <div className="workbench-workflow-banner red-banner" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 16px', fontSize: '12.5px' }}>
          {syncState.error}
        </div>
      ) : null}
      {syncState.msg ? (
        <div className="workbench-workflow-banner green-banner" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', padding: '10px 16px', fontSize: '12.5px' }}>
          {syncState.msg}
        </div>
      ) : null}

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

      {stage === 'DESIGN' && designStatus === 'REVISION' ? (
        <div className="workbench-workflow-banner orange-banner" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c' }}>
          <div>
            <strong>
              <AlertCircle size={15} /> ลูกค้าแจ้งแก้ไขแบบร่าง
            </strong>
            <p>กราฟิกกำลังดำเนินการปรับปรุงแก้ไขแบบร่างตามบรีฟที่ลูกค้าแจ้ง</p>
          </div>
        </div>
      ) : null}

      {stage === 'DESIGN' && designStatus === 'WAITING_CUSTOMER' ? (
        <div className="workbench-workflow-banner blue-banner">
          <div>
            <strong>
              <MessageSquare size={15} /> ส่งแบบให้ลูกค้าแล้ว (รอลูกค้าตรวจอนุมัติ)
            </strong>
            <p>แอดมินสามารถคัดลอกรูปส่งให้ลูกค้าใน LINE ได้ เมื่อลูกค้าตกลงแล้วกดปุ่มด้านขวา</p>
          </div>
          <form action={confirmCustomerApproveAction}>
            <input type="hidden" name="jobId" value={jobId} />
            <button className="primary-button" style={{ backgroundColor: '#16a34a' }}>
              <CheckCircle2 size={16} /> ลูกค้ายืนยันแบบแล้ว
            </button>
          </form>
        </div>
      ) : null}

      {stage === 'PRODUCTION' || designStatus === 'APPROVED' ? (
        <div className="workbench-workflow-banner green-banner" style={{ background: '#ffedd5', border: '1px solid #fed7aa', color: '#c2410c' }}>
          <div>
            <strong>
              <CheckCircle2 size={15} /> ลูกค้ายืนยันแบบแล้ว - อยู่ในขั้นตอนผลิต
            </strong>
            <p>กราฟิกสามารถส่งไฟล์พิมพ์ได้เลย และงานถูกส่งไปยังแผนกช่างสำหรับประกอบงานเรียบร้อยแล้ว</p>
          </div>
        </div>
      ) : null}

      {/* SINGLE UNIFIED SQUARE WORKSPACE */}
      <div className="single-proof-wrapper">
        {isUploadingNew || !activeProof ? (
          isOwnerOrAdmin && proofs.length === 0 ? (
            /* ADMIN VIEW WHEN NO PROOFS EXIST */
            <div className="square-upload-card" style={{ padding: '48px 24px', textAlign: 'center', backgroundColor: '#f8fafc', border: '2px dashed #cbd5e1', borderRadius: '12px' }}>
              <div className="square-dropzone-icon-circle" style={{ margin: '0 auto 16px', backgroundColor: '#e2e8f0', color: '#64748b' }}>
                <ImageIcon size={38} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>ยังไม่มีรูปภาพแบบร่าง</h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
                รอกราฟิกผู้รับผิดชอบ ({assignedGraphicName || 'ฝ่ายกราฟิก'}) อัปโหลดแบบร่างหรือซิงก์ไฟล์งานเข้าสู่ระบบ
              </p>
            </div>
          ) : (
            /* UPLOAD / DROPZONE SQUARE BOX FOR GRAPHIC */
            <div className="square-upload-card">
              {proofs.length > 0 && (
                <div className="upload-card-top-bar">
                  <button
                    type="button"
                    className="secondary-button compact"
                    onClick={() => {
                      setIsUploadingNew(false);
                      handleClearFile();
                    }}
                  >
                    <ArrowLeft size={14} /> กลับไปดูแบบร่าง
                  </button>
                </div>
              )}

              <div className="square-upload-form">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="proofFile"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                />

                {/* AUTO UPLOADING DROPZONE SQUARE */}
                <div
                  className={`square-dropzone-box ${isDragging ? 'dragging' : ''}`}
                  onClick={() => !isUploadingAuto && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isUploadingAuto) setIsDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file && !isUploadingAuto) handleFileSelected(file);
                  }}
                >
                  <div className="square-dropzone-icon-circle" style={isUploadingAuto ? { backgroundColor: '#eff6ff', color: '#2563eb' } : undefined}>
                    <RefreshCw size={42} style={isUploadingAuto ? { animation: 'spin 1s linear infinite' } : undefined} />
                  </div>
                  <h3 className="square-dropzone-title">
                    {isUploadingAuto ? 'กำลังอัปโหลดแบบร่างอัตโนมัติ...' : 'คลิกเลือกไฟล์ หรือลากรูปมาวางที่นี่'}
                  </h3>
                  <p className="square-dropzone-sub">
                    {isUploadingAuto ? 'กรุณารอสักครู่ ระบบกำลังบันทึกแบบร่างขึ้นระบบ' : 'รองรับ PNG, JPG, WEBP หรือกด Ctrl + V เพื่อวางรูปภาพ'}
                  </p>
                </div>
              </div>
            </div>
          )
        ) : (
          /* DISPLAY ACTIVE PROOF SQUARE BOX */
          <div className="square-active-proof-card">
            <div className="proof-active-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#1e293b' }}>
                รูปภาพแบบร่าง
              </span>
              <small className="proof-uploader-tag">
                {activeProof.creator?.full_name || 'กราฟิก'} · {new Date(activeProof.created_at).toLocaleDateString('th-TH')}
              </small>
            </div>

            <div className="proof-img-frame square-frame" style={{ cursor: 'pointer' }} onClick={() => setFullImageModalUrl(activeProof.image_url)} title="คลิกเพื่อเปิดดูรูปภาพขนาดเต็ม">
              <img
                src={activeProof.image_url}
                alt={activeProof.note || 'รูปภาพแบบร่าง'}
              />
            </div>

            {activeProof.note ? (
              <div className="proof-note-callout">
                <MessageSquare size={14} /> <span>{activeProof.note}</span>
              </div>
            ) : null}

            <div className="proof-actions-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {/* ALWAYS: คัดลอกรูป */}
              <button
                type="button"
                onClick={() => handleCopy(activeProof.image_url)}
                className="secondary-button"
                style={{ flex: 1, minWidth: '130px', justifyContent: 'center' }}
              >
                <Copy size={15} />
                {copiedUrl === activeProof.image_url ? 'คัดลอกรูปแล้ว!' : 'คัดลอกรูป'}
              </button>

              {/* ADMIN ONLY: แจ้งเตือนลูกค้าแก้ไขงาน (ข้างๆ คัดลอกรูป) */}
              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowRevisionModal(true)}
                  className="primary-button"
                  style={{
                    backgroundColor: '#ea580c',
                    flex: 1.5,
                    minWidth: '190px',
                    justifyContent: 'center',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
                  }}
                  title="แจ้งเตือนกราฟิกว่าลูกค้าต้องการแก้ไขแบบร่าง"
                >
                  <BellRing size={16} />
                  แจ้งเตือนลูกค้าแก้ไขงาน
                </button>
              )}

              {/* GRAPHIC ONLY: ลบ และ อัปโหลดใหม่ */}
              {!isOwnerOrAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="danger-button"
                    title="ลบรูปภาพแบบร่างนี้"
                  >
                    <Trash2 size={15} /> ลบ
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsUploadingNew(true)}
                    className="primary-button"
                  >
                    <Plus size={15} /> อัปโหลดใหม่
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CUSTOM REVISION NOTIFICATION MODAL (FOR ADMIN) */}
      {showRevisionModal && mounted && createPortal(
        <div className="custom-modal-backdrop" onClick={() => setShowRevisionModal(false)}>
          <div className="custom-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="custom-modal-header">
              <div className="custom-modal-icon-circle" style={{ backgroundColor: '#ffedd5', color: '#ea580c' }}>
                <BellRing size={22} />
              </div>
              <div>
                <h3 className="custom-modal-title">แจ้งเตือนลูกค้าแก้ไขงาน</h3>
                <p className="custom-modal-subtitle">ส่งการแจ้งเตือนไปยังกราฟิกผู้รับผิดชอบ</p>
              </div>
            </div>

            <form onSubmit={handleNotifyRevision}>
              <div className="custom-modal-body">
                <div className="note-field-group">
                  <label style={{ fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                    รายละเอียดที่ลูกค้าต้องการแก้ไข (ถ้ามี):
                  </label>
                  <textarea
                    name="revisionNote"
                    rows={3}
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    placeholder="เช่น ลูกค้าขอเปลี่ยนฟอนต์ข้อความ และปรับสีพื้นหลังเป็นสีแดง..."
                    className="text-input-compact"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
                    autoFocus
                  />
                </div>
                <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '8px' }}>
                  ระบบจะเปลี่ยนสถานะแบบร่างเป็น <strong>"แก้ไขแบบ" (REVISION)</strong> และแจ้งเตือนกราฟิกให้ทราบทันที
                </p>
              </div>

              <div className="custom-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowRevisionModal(false)}
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingRevision}
                  className="primary-button"
                  style={{ backgroundColor: '#ea580c' }}
                >
                  <BellRing size={15} /> {isSubmittingRevision ? 'กำลังส่งแจ้งเตือน...' : 'ยืนยันแจ้งเตือนกราฟิก'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {showDeleteModal && activeProof && (
        <div className="custom-modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-header">
              <div className="custom-modal-icon-circle danger">
                <Trash2 size={22} />
              </div>
              <div>
                <h3 className="custom-modal-title">ยืนยันการลบแบบร่าง</h3>
                <p className="custom-modal-subtitle">รูปภาพแบบร่างนี้</p>
              </div>
            </div>

            <div className="custom-modal-body">
              <p>คุณต้องการลบรูปภาพแบบร่างนี้ออกจากระบบใช่หรือไม่? เมื่อลบแล้วจะไม่สามารถกู้คืนได้</p>
              {activeProof.note && (
                <div className="modal-proof-preview-snippet">
                  <small>หมายเหตุ:</small> <span>{activeProof.note}</span>
                </div>
              )}
            </div>

            <div className="custom-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowDeleteModal(false)}
              >
                ยกเลิก
              </button>

              <form onSubmit={handleDeleteProof}>
                <input type="hidden" name="jobId" value={jobId} />
                <input type="hidden" name="proofId" value={activeProof.id} />
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="primary-button"
                  style={{ backgroundColor: '#dc2626' }}
                >
                  <Trash2 size={15} /> {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* FULL IMAGE LIGHTBOX MODAL */}
      {fullImageModalUrl && mounted && createPortal(
        <div
          className="custom-modal-backdrop"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setFullImageModalUrl(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setFullImageModalUrl(null)}
              style={{
                position: 'absolute',
                top: -16,
                right: -16,
                backgroundColor: '#ffffff',
                color: '#0f172a',
                border: 'none',
                borderRadius: '50%',
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                zIndex: 10,
                transition: 'transform 0.15s ease',
              }}
              title="ปิดหน้าต่างรูปภาพ"
            >
              <X size={20} />
            </button>

            <img
              src={fullImageModalUrl}
              alt="Full size view"
              style={{
                maxWidth: '100%',
                maxHeight: '88vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}