'use client';

import { useState, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2, Clock, Factory, MessageSquare, Palette,
  Send, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react';
import { updateJobStageAction } from '../app/jobs/actions';

interface StepInfo {
  index: number;
  name: string;
  desc: string;
  icon: any;
  color: string;
}

const STEPS: StepInfo[] = [
  {
    index: 1,
    name: 'รอยืนยัน',
    desc: 'งานใหม่รอกราฟิกกดยืนยันรับงาน หรือรอยืนยันรายละเอียด',
    icon: Clock,
    color: '#f59e0b',
  },
  {
    index: 2,
    name: 'กำลังออกแบบ',
    desc: 'กราฟิกกำลังดำเนินการออกแบบ หรือแก้ไขแบบร่างในระบบ',
    icon: Palette,
    color: '#2563eb',
  },
  {
    index: 3,
    name: 'ส่งแบบ',
    desc: 'ส่งแบบร่างให้ลูกค้าพิจารณาเรียบร้อยแล้ว (รอลูกค้าตรวจอนุมัติแบบ)',
    icon: Send,
    color: '#dc2626',
  },
  {
    index: 4,
    name: 'ผลิต',
    desc: 'ลูกค้าอนุมัติแบบแล้ว และส่งไฟล์เข้าสู่กระบวนการผลิตของร้าน',
    icon: Factory,
    color: '#ea580c',
  },
  {
    index: 5,
    name: 'เสร็จสิ้น',
    desc: 'งานผลิตและส่งมอบให้ลูกค้าเสร็จสิ้นสมบูรณ์',
    icon: CheckCircle2,
    color: '#16a34a',
  },
];

interface JobInteractiveStepperProps {
  jobId: string;
  stage: string;
  designStatus?: string | null;
  status?: string;
  jobNumber?: string;
  hasProofs?: boolean;
}

export function JobInteractiveStepper({
  jobId,
  stage,
  designStatus,
  status,
  jobNumber,
  hasProofs = false,
}: JobInteractiveStepperProps) {
  // Determine current active step index (1-5)
  const getCurrentStepIndex = (): number => {
    if (stage === 'ADMIN' || designStatus === 'WAITING_DESIGN') return 1;
    if (stage === 'DESIGN') {
      if (designStatus === 'WAITING_CUSTOMER') return 3;
      if (designStatus === 'APPROVED') return 4;
      return 2;
    }
    if (stage === 'PRODUCTION') return 4;
    if (stage === 'DELIVERY' || stage === 'COMPLETE' || status === 'COMPLETED') return 5;
    return 1;
  };

  const currentStep = getCurrentStepIndex();
  const [mounted, setMounted] = useState(false);
  const [selectedTargetStep, setSelectedTargetStep] = useState<StepInfo | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStepClick = (step: StepInfo) => {
    if (step.index === currentStep) return;
    setErrorMsg(null);
    setSelectedTargetStep(step);
  };

  const handleConfirmChange = () => {
    if (!selectedTargetStep) return;
    startTransition(async () => {
      const res = await updateJobStageAction(jobId, selectedTargetStep.index);
      if (res?.error) {
        setErrorMsg(res.error);
      } else {
        setSelectedTargetStep(null);
        window.location.reload();
      }
    });
  };

  const currentStepInfo = STEPS.find((s) => s.index === currentStep) || STEPS[0];

  return (
    <>
      <div className="interactive-stage-stepper-container">
        <div className="interactive-stepper-pills">
          {STEPS.map((step) => {
            const isPassed = step.index < currentStep;
            const isActive = step.index === currentStep;
            const isPulseGlow = step.index === 3 && currentStep === 2 && hasProofs;

            return (
              <button
                key={step.index}
                type="button"
                onClick={() => handleStepClick(step)}
                className={`interactive-stepper-btn ${isActive ? 'active' : ''} ${isPassed ? 'passed' : ''} ${isPulseGlow ? 'pulse-glow-step' : ''}`}
                title={
                  isPulseGlow
                    ? `มีรูปภาพแบบร่างแล้ว! คลิกเพื่อเปลี่ยนสถานะเป็น "${step.name}"`
                    : isActive
                    ? `สถานะปัจจุบัน: ${step.name}`
                    : `คลิกเพื่อเปลี่ยนสถานะเป็น "${step.name}"`
                }
              >
                <span className="step-badge-num">
                  {isPassed ? '✓' : step.index}
                </span>
                <span className="step-label-text">{step.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONFIRMATION STAGE CHANGE MODAL */}
      {selectedTargetStep && mounted && createPortal(
        <div className="custom-modal-backdrop" onClick={() => !isPending && setSelectedTargetStep(null)}>
          <div className="custom-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-header">
              <div
                className="custom-modal-icon-circle"
                style={{
                  backgroundColor: `${selectedTargetStep.color}18`,
                  color: selectedTargetStep.color,
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <selectedTargetStep.icon size={22} />
              </div>
              <div>
                <h3 className="custom-modal-title">ยืนยันการเปลี่ยนสถานะงาน</h3>
                <p className="custom-modal-subtitle">
                  {jobNumber ? `เลขงาน #${jobNumber}` : 'ใบงาน'}
                </p>
              </div>
            </div>

            <div className="custom-modal-body">
              {/* Transition Banner */}
              <div className="stage-transition-preview-box">
                <div className="stage-step-tag current">
                  <small>สถานะเดิม</small>
                  <strong>{currentStepInfo.name}</strong>
                </div>
                <ArrowRight size={18} className="transition-arrow" />
                <div
                  className="stage-step-tag target"
                  style={{ borderColor: selectedTargetStep.color, color: selectedTargetStep.color }}
                >
                  <small>สถานะใหม่</small>
                  <strong>{selectedTargetStep.name}</strong>
                </div>
              </div>

              <p style={{ margin: '14px 0 0', fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
                {selectedTargetStep.desc}
              </p>

              {errorMsg && (
                <p style={{ marginTop: 10, color: '#dc2626', fontSize: '12.5px' }}>
                  {errorMsg}
                </p>
              )}
            </div>

            <div className="custom-modal-footer">
              <button
                type="button"
                className="secondary-button"
                disabled={isPending}
                onClick={() => setSelectedTargetStep(null)}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={isPending}
                className="primary-button"
                style={{ backgroundColor: selectedTargetStep.color }}
                onClick={handleConfirmChange}
              >
                <CheckCircle2 size={16} />
                {isPending ? 'กำลังบันทึก...' : `ยืนยันเปลี่ยนเป็น "${selectedTargetStep.name}"`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
