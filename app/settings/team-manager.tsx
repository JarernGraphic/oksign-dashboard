'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Check,
  CheckCircle2,
  Clock,
  Crown,
  MoreVertical,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import {
  approveMemberAction,
  deleteMemberAction,
  toggleMemberStatusAction,
  updateMemberRoleAction,
} from './actions';

export type RoleOption = {
  id: string;
  code: string;
  name_th: string;
  description?: string | null;
};

export type TeamMember = {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
  role_id: string;
  role: { id: string; code: string; name_th: string } | null;
  created_at?: string;
};

export function TeamManager({
  members,
  roles,
  currentUserId,
  isOwner,
}: {
  members: TeamMember[];
  roles: RoleOption[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const [memberList, setMemberList] = useState<TeamMember[]>(members);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isPending, startTransition] = useTransition();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync state if server props change
  useEffect(() => {
    setMemberList(members);
  }, [members]);

  const pendingCount = memberList.filter((m) => !m.is_active).length;
  const activeCount = memberList.filter((m) => m.is_active).length;

  const filteredMembers = memberList.filter((m) => {
    if (filter === 'PENDING') return !m.is_active;
    if (filter === 'ACTIVE') return m.is_active;
    if (filter === 'INACTIVE') return !m.is_active;
    return true;
  });

  const handleApprove = (memberId: string) => {
    setActiveActionId(memberId);
    setFeedbackMessage(null);
    setMemberList((prev) => prev.map((m) => (m.id === memberId ? { ...m, is_active: true } : m)));

    startTransition(async () => {
      const res = await approveMemberAction(memberId);
      setActiveActionId(null);
      if (res.error) {
        setFeedbackMessage({ type: 'error', text: res.error });
        setMemberList(members); // Rollback
      } else {
        setFeedbackMessage({ type: 'success', text: 'อนุมัติสิทธิ์สมาชิกสำเร็จแล้ว' });
      }
    });
  };

  const handleRoleChange = (memberId: string, newRoleId: string) => {
    setActiveActionId(memberId);
    setFeedbackMessage(null);
    const targetRole = roles.find((r) => r.id === newRoleId) || null;
    setMemberList((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role_id: newRoleId, role: targetRole } : m))
    );

    startTransition(async () => {
      const res = await updateMemberRoleAction(memberId, newRoleId);
      setActiveActionId(null);
      if (res.error) {
        setFeedbackMessage({ type: 'error', text: res.error });
        setMemberList(members); // Rollback
      } else {
        setFeedbackMessage({ type: 'success', text: 'เปลี่ยนตำแหน่งสมาชิกสำเร็จแล้ว' });
      }
    });
  };

  const handleToggleStatus = (memberId: string, currentStatus: boolean) => {
    setActiveActionId(memberId);
    setFeedbackMessage(null);
    setMemberList((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, is_active: !currentStatus } : m))
    );

    startTransition(async () => {
      const res = await toggleMemberStatusAction(memberId, !currentStatus);
      setActiveActionId(null);
      if (res.error) {
        setFeedbackMessage({ type: 'error', text: res.error });
        setMemberList(members); // Rollback
      } else {
        setFeedbackMessage({
          type: 'success',
          text: !currentStatus ? 'เปิดใช้งานสมาชิกแล้ว' : 'ระงับการใช้งานสมาชิกแล้ว',
        });
      }
    });
  };

  const handleDelete = (memberId: string, memberName: string) => {
    if (!confirm(`คุณต้องการลบสมาชิก "${memberName}" ออกจากทีมใช่หรือไม่?`)) return;
    setActiveActionId(memberId);
    setFeedbackMessage(null);
    // Optimistically remove from list
    setMemberList((prev) => prev.filter((m) => m.id !== memberId));

    startTransition(async () => {
      const res = await deleteMemberAction(memberId);
      setActiveActionId(null);
      if (res.error) {
        setFeedbackMessage({ type: 'error', text: res.error });
        setMemberList(members); // Rollback on error
      } else {
        setFeedbackMessage({ type: 'success', text: `ลบสมาชิก ${memberName} เรียบร้อยแล้ว` });
      }
    });
  };


  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Top summary stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          onClick={() => setFilter('ALL')}
          className={`team-stat-card ${filter === 'ALL' ? 'active-filter' : ''}`}
        >
          <div className="stat-label">สมาชิกทั้งหมด</div>
          <div className="stat-value">
            {members.length}
          </div>
        </div>

        <div
          onClick={() => setFilter('PENDING')}
          className={`team-stat-card pending-card ${filter === 'PENDING' ? 'active-filter' : ''}`}
        >
          <div className="stat-label pending-label">
            <Clock size={13} />
            <span>รอการอนุมัติ</span>
          </div>
          <div className="stat-value pending-value">
            {pendingCount}
          </div>
        </div>

        <div
          onClick={() => setFilter('ACTIVE')}
          className={`team-stat-card active-card ${filter === 'ACTIVE' ? 'active-filter' : ''}`}
        >
          <div className="stat-label active-label">ใช้งานอยู่</div>
          <div className="stat-value active-value">
            {activeCount}
          </div>
        </div>
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: feedbackMessage.type === 'success' ? '#052e16' : '#450a0a',
            border: `1px solid ${feedbackMessage.type === 'success' ? '#166534' : '#991b1b'}`,
            color: feedbackMessage.type === 'success' ? '#86efac' : '#fca5a5',
            fontSize: '13px',
          }}
        >
          {feedbackMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Member Table / List */}
      <div className="team-list-card">
        <div className="team-list-header">
          <div className="team-list-title">
            รายชื่อทีมงาน ({filteredMembers.length} คน)
          </div>
          {isOwner && (
            <Link
              href="/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <UserPlus size={14} />
              <span>เพิ่มพนักงานใหม่</span>
            </Link>
          )}
        </div>

        <div>
          {filteredMembers.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#a1a1aa', fontSize: '13px' }}>
              ไม่พบรายชื่อสมาชิกในหมวดหมู่นี้
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isSelf = member.id === currentUserId;
              const isMemberOwner = member.role?.code === 'OWNER';
              const isRowProcessing = isPending && activeActionId === member.id;

              return (
                <div
                  key={member.id}
                  className={`team-member-row ${!member.is_active ? 'row-pending' : ''}`}
                  style={{
                    opacity: isRowProcessing ? 0.6 : 1,
                  }}
                >
                  {/* Left: Avatar & Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid rgba(220, 38, 38, 0.3)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: isMemberOwner ? '#fee2e2' : '#f4f4f5',
                          color: isMemberOwner ? '#dc2626' : '#52525b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '15px',
                        }}
                      >
                        {member.full_name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong className="member-name">{member.full_name}</strong>
                        {isSelf && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              fontWeight: 700,
                            }}
                          >
                            คุณ
                          </span>
                        )}
                        {isMemberOwner && <Crown size={14} color="#dc2626" />}
                      </div>

                      {/* Status indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        {!member.is_active ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 650,
                              color: '#fbbf24',
                              backgroundColor: '#451a03',
                              padding: '2px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            <Clock size={11} /> รอการอนุมัติสิทธิ์
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#4ade80',
                            }}
                          >
                            <Check size={12} /> ใช้งานได้ปกติ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Role Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isOwner && !isSelf ? (
                      <select
                        defaultValue={member.role?.id || member.role_id}
                        disabled={isRowProcessing}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="member-role-select"
                      >
                        {roles
                          .filter((r) => r.code !== 'ACCOUNTING')
                          .map((r) => {
                            let displayName = r.name_th;
                            if (r.code === 'OWNER') displayName = 'เจ้าของร้าน';
                            if (r.code === 'ADMIN') displayName = 'แอดมิน (รวมบัญชี)';
                            if (r.code === 'GRAPHIC') displayName = 'กราฟิก';
                            if (r.code === 'PRODUCTION') displayName = 'ช่าง';

                            return (
                              <option key={r.id} value={r.id}>
                                {displayName} ({r.code})
                              </option>
                            );
                          })}
                      </select>
                    ) : (
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: isMemberOwner ? '#dc2626' : '#52525b',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#f4f4f5',
                        }}
                      >
                        {(() => {
                          const code = member.role?.code;
                          if (code === 'OWNER') return 'เจ้าของร้าน';
                          if (code === 'ADMIN') return 'แอดมิน (รวมบัญชี)';
                          if (code === 'GRAPHIC') return 'กราฟิก';
                          if (code === 'PRODUCTION') return 'ช่าง';
                          if (code === 'ACCOUNTING') return 'แอดมิน (รวมบัญชี)';
                          return member.role?.name_th || 'ไม่ระบุตำแหน่ง';
                        })()}
                      </span>
                    )}
                  </div>

                  {/* Right: Action Buttons */}
                  {isOwner && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* If pending: prominent Approve button */}
                      {!member.is_active && (
                        <button
                          type="button"
                          disabled={isRowProcessing}
                          onClick={() => handleApprove(member.id)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '32px',
                            padding: '0 12px',
                            borderRadius: '6px',
                            backgroundColor: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(22, 163, 74, 0.3)',
                          }}
                        >
                          <Check size={14} />
                          <span>อนุมัติเข้าใช้งาน</span>
                        </button>
                      )}

                      {/* Toggle Active / Suspend button */}
                      {!isSelf && member.is_active && (
                        <button
                          type="button"
                          disabled={isRowProcessing}
                          onClick={() => handleToggleStatus(member.id, member.is_active)}
                          title="ระงับการใช้งานชั่วคราว"
                          style={{
                            height: '32px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            backgroundColor: '#f4f4f5',
                            color: '#52525b',
                            border: '1px solid #e4e4e7',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          ระงับการใช้งาน
                        </button>
                      )}

                      {/* Delete button */}
                      {!isSelf && (
                        <button
                          type="button"
                          disabled={isRowProcessing}
                          onClick={() => handleDelete(member.id, member.full_name)}
                          title="ลบสมาชิกออกจากทีม"
                          style={{
                            height: '32px',
                            width: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            backgroundColor: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
