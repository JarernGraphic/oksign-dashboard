'use client';

import {
  AlertCircle, Banknote, CheckCircle2, Clock, Factory, FileText,
  History, Image as ImageIcon, MessageSquare, PlusCircle, Send,
  Sparkles, UserCheck, Wrench
} from 'lucide-react';

export type ActivityLogItem = {
  id: string;
  action: string;
  created_at: string;
  user: { full_name: string } | null;
  metadata?: any;
};

const ACTION_MAP: Record<string, { label: string; icon: any }> = {
  JOB_CREATED: { label: 'เปิดใบรับงานใหม่', icon: PlusCircle },
  JOB_CREATED_FROM_QUOTATION: { label: 'เปิดใบรับงานจากใบเสนอราคา', icon: FileText },
  GRAPHIC_ACCEPTED_JOB: { label: 'กราฟิกกดยืนยันรับงาน', icon: UserCheck },
  DESIGN_PROOF: { label: 'อัปโหลดแบบร่าง', icon: ImageIcon },
  DESIGN_PROOF_CONFIRMED: { label: 'ยืนยันแบบร่าง', icon: CheckCircle2 },
  DESIGN_PROOF_REMOVED: { label: 'ลบแบบร่าง', icon: Clock },
  PROOF_SENT_TO_CUSTOMER: { label: 'ส่งแบบให้ลูกค้าพิจารณา', icon: Send },
  CUSTOMER_APPROVED_DESIGN: { label: 'ลูกค้ายืนยันแบบแล้ว', icon: CheckCircle2 },
  CUSTOMER_REVISION_REQUESTED: { label: 'ลูกค้าแจ้งขอแก้ไขแบบ', icon: AlertCircle },
  GRAPHIC_CONFIRMED_PRODUCTION: { label: 'ยืนยันการส่งผลิตแล้ว', icon: Factory },
  TECHNICIAN_CONFIRMED_ASSEMBLY: { label: 'ช่างประกอบงานเสร็จสิ้น', icon: Wrench },
  PAYMENT_RECORDED: { label: 'บันทึกรับชำระเงิน', icon: Banknote },
  STAGE_CHANGED_STEP_1: { label: 'รอยืนยัน', icon: Clock },
  STAGE_CHANGED_STEP_2: { label: 'เข้าสู่ขั้นตอนออกแบบ', icon: Sparkles },
  STAGE_CHANGED_STEP_3: { label: 'ส่งแบบร่าง', icon: Send },
  STAGE_CHANGED_STEP_4: { label: 'เข้าสู่ขั้นตอนผลิต', icon: Factory },
  STAGE_CHANGED_STEP_5: { label: 'ปิด Job เสร็จสมบูรณ์', icon: CheckCircle2 },
};

export function JobTimeline({ activities = [] }: { activities: ActivityLogItem[] }) {
  if (!activities || activities.length === 0) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8' }}>
        <History size={24} style={{ color: '#cbd5e1', marginBottom: '6px' }} />
        <p style={{ fontSize: '13px', margin: 0 }}>ยังไม่มีบันทึกประวัติกิจกรรม</p>
      </div>
    );
  }

  // Deduplicate consecutive identical actions within 5 minutes
  const filteredActivities = activities.filter((act, idx) => {
    if (idx === 0) return true;
    const prev = activities[idx - 1];
    if (act.action === prev.action) {
      const prevUser = prev.user?.full_name || prev.metadata?.updated_by_name;
      const currUser = act.user?.full_name || act.metadata?.updated_by_name;
      if (prevUser === currUser) {
        const diff = Math.abs(new Date(act.created_at).getTime() - new Date(prev.created_at).getTime());
        if (diff < 5 * 60 * 1000) {
          return false;
        }
      }
    }
    return true;
  });

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Bangkok',
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ position: 'relative', padding: '6px 8px 12px 14px' }}>
      {/* Continuous Red Theme Vertical Line */}
      <div
        style={{
          position: 'absolute',
          left: '23px',
          top: '12px',
          bottom: '16px',
          width: '2px',
          backgroundColor: '#fecdd3',
        }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredActivities.map((item, index) => {
          const cfg = ACTION_MAP[item.action] || {
            label: item.metadata?.stage_label || item.action,
            icon: Clock,
          };
          const Icon = cfg.icon;
          const userName = item.user?.full_name || item.metadata?.updated_by_name || item.metadata?.requested_by || 'ระบบ';
          const noteText = item.metadata?.note || item.metadata?.message;
          const isLatest = index === 0;

          return (
            <div
              key={item.id || index}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
              }}
            >
              {/* Timeline Red Node Icon */}
              <div
                style={{
                  position: 'relative',
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: isLatest ? '#e11d48' : '#ffffff',
                  border: isLatest ? '2px solid #e11d48' : '2px solid #f43f5e',
                  color: isLatest ? '#ffffff' : '#e11d48',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  zIndex: 2,
                  boxShadow: isLatest ? '0 0 0 3px rgba(225, 29, 72, 0.15)' : 'none',
                }}
              >
                <Icon size={11} strokeWidth={isLatest ? 2.5 : 2} />
              </div>

              {/* Activity Content Row */}
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  paddingTop: '1px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '13.5px',
                        fontWeight: '700',
                        color: isLatest ? '#be123c' : '#1e293b',
                      }}
                    >
                      {cfg.label}
                    </span>

                    <span
                      style={{
                        fontSize: '13px',
                        color: '#64748b',
                        fontWeight: '500',
                      }}
                    >
                      - {userName}
                    </span>
                  </div>

                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '400' }}>
                    {formatTime(item.created_at)}
                  </span>
                </div>

                {/* Optional Note */}
                {noteText && (
                  <div
                    style={{
                      marginTop: '4px',
                      fontSize: '12px',
                      color: '#475569',
                      backgroundColor: '#fff1f2',
                      borderLeft: '3px solid #f43f5e',
                      padding: '4px 8px',
                      borderRadius: '0 4px 4px 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <MessageSquare size={12} style={{ color: '#e11d48', flexShrink: 0 }} />
                    <span>{noteText}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
