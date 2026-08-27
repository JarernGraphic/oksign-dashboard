'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Briefcase, CheckCircle2, Clock, Filter,
  Palette, Search, Sparkles, UserCheck, Users, Edit3, Shield, Factory
} from 'lucide-react';
import { UserProfileModal } from '../../components/user-profile-modal';

export type StaffMember = {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at?: string;
  role?: {
    id: string;
    code: string;
    name_th: string;
  } | null;
  stats: {
    totalJobs: number;
    inProgressJobs: number;
    completedJobs: number;
  };
};

interface StaffViewProps {
  members: StaffMember[];
  currentUserId: string;
  currentUserRole: string;
}

export function StaffView({ members, currentUserId, currentUserRole }: StaffViewProps) {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
  const [editingProfile, setEditingProfile] = useState<StaffMember | null>(null);

  // Compute summary stats
  const totalStaff = members.length;
  const graphicCount = members.filter((m) => m.role?.code === 'GRAPHIC').length;
  const adminCount = members.filter((m) => ['ADMIN', 'OWNER'].includes(m.role?.code || '')).length;
  const productionCount = members.filter((m) => m.role?.code === 'PRODUCTION').length;

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        !search.trim() ||
        m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (m.role?.name_th && m.role.name_th.toLowerCase().includes(search.toLowerCase()));

      let matchRole = true;
      if (selectedRole === 'GRAPHIC') matchRole = m.role?.code === 'GRAPHIC';
      else if (selectedRole === 'ADMIN') matchRole = ['ADMIN', 'OWNER'].includes(m.role?.code || '');
      else if (selectedRole === 'PRODUCTION') matchRole = m.role?.code === 'PRODUCTION';

      return matchSearch && matchRole;
    });
  }, [members, search, selectedRole]);

  const getRoleBadgeStyle = (code?: string) => {
    switch (code) {
      case 'OWNER':
        return { bg: '#fef2f2', border: '#fecaca', color: '#dc2626', label: 'เจ้าของร้าน (Owner)' };
      case 'ADMIN':
        return { bg: '#eff6ff', border: '#bfdbfe', color: '#2563eb', label: 'แอดมิน / บัญชี (Admin)' };
      case 'GRAPHIC':
        return { bg: '#f5f3ff', border: '#ddd6fe', color: '#7c3aed', label: 'กราฟิกดีไซเนอร์' };
      case 'PRODUCTION':
        return { bg: '#fff7ed', border: '#fed7aa', color: '#ea580c', label: 'ฝ่ายผลิต / ช่าง' };
      default:
        return { bg: '#f1f5f9', border: '#cbd5e1', color: '#475569', label: 'พนักงาน' };
    }
  };

  return (
    <div style={{ display: 'grid', gap: '24px' }}>
      {/* Top Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div className="panel" style={{ padding: '18px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>พนักงานทั้งหมด</span>
            <strong style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)', display: 'block' }}>
              {totalStaff} <span style={{ fontSize: '13px', fontWeight: 500 }}>คน</span>
            </strong>
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#f5f3ff',
              color: '#7c3aed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Palette size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>กราฟิกดีไซเนอร์</span>
            <strong style={{ fontSize: '22px', fontWeight: 800, color: '#7c3aed', display: 'block' }}>
              {graphicCount} <span style={{ fontSize: '13px', fontWeight: 500 }}>คน</span>
            </strong>
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>แอดมิน & เจ้าของร้าน</span>
            <strong style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a', display: 'block' }}>
              {adminCount} <span style={{ fontSize: '13px', fontWeight: 500 }}>คน</span>
            </strong>
          </div>
        </div>

        <div className="panel" style={{ padding: '18px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '10px',
              backgroundColor: '#fff7ed',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Factory size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 600 }}>ฝ่ายผลิต / ช่าง</span>
            <strong style={{ fontSize: '22px', fontWeight: 800, color: '#ea580c', display: 'block' }}>
              {productionCount} <span style={{ fontSize: '13px', fontWeight: 500 }}>คน</span>
            </strong>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div
        className="panel"
        style={{
          padding: '16px 20px',
          borderRadius: '12px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
        }}
      >
        {/* Search box */}
        <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '380px' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="ค้นหาชื่อเล่น หรือชื่อพนักงาน..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              height: '40px',
              paddingLeft: '38px',
              paddingRight: '14px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '14px',
              color: 'var(--text)',
              outline: 'none',
              boxSizing: 'border-box',
              background: 'var(--surface)',
            }}
          />
        </div>

        {/* Role filter buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedRole('ALL')}
            className={`secondary-button compact ${selectedRole === 'ALL' ? 'active' : ''}`}
            style={selectedRole === 'ALL' ? { backgroundColor: '#1e293b', color: '#ffffff', borderColor: '#1e293b' } : {}}
          >
            ทั้งหมด ({totalStaff})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('GRAPHIC')}
            className={`secondary-button compact ${selectedRole === 'GRAPHIC' ? 'active' : ''}`}
            style={selectedRole === 'GRAPHIC' ? { backgroundColor: '#7c3aed', color: '#ffffff', borderColor: '#7c3aed' } : {}}
          >
            <Palette size={13} /> กราฟิก ({graphicCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('ADMIN')}
            className={`secondary-button compact ${selectedRole === 'ADMIN' ? 'active' : ''}`}
            style={selectedRole === 'ADMIN' ? { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' } : {}}
          >
            <Shield size={13} /> แอดมิน ({adminCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('PRODUCTION')}
            className={`secondary-button compact ${selectedRole === 'PRODUCTION' ? 'active' : ''}`}
            style={selectedRole === 'PRODUCTION' ? { backgroundColor: '#ea580c', color: '#ffffff', borderColor: '#ea580c' } : {}}
          >
            <Factory size={13} /> ช่าง ({productionCount})
          </button>
        </div>
      </div>

      {/* Staff Cards Grid */}
      {filteredMembers.length === 0 ? (
        <div className="panel empty-state" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: '12px' }}>
          <Users size={36} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '17px', color: 'var(--text)', margin: '0 0 4px' }}>ไม่พบรายชื่อพนักงาน</h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', margin: 0 }}>ลองค้นหาด้วยคำอื่น หรือเลือกตัวกรองทั้งหมด</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {filteredMembers.map((member) => {
            const isMe = member.id === currentUserId;
            const badgeStyle = getRoleBadgeStyle(member.role?.code);

            return (
              <div
                key={member.id}
                className="panel"
                style={{
                  borderRadius: '14px',
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: isMe ? '2px solid #3b82f6' : '1px solid var(--line, #e2e8f0)',
                  boxShadow: isMe ? '0 4px 18px rgba(59, 130, 246, 0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
                  position: 'relative',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                }}
              >
                {/* Is Me Badge */}
                {isMe && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      fontSize: '11px',
                      fontWeight: 750,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    คุณ (Me)
                  </span>
                )}

                {/* Card Header: Avatar + Name + Role */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '62px',
                      height: '62px',
                      borderRadius: '50%',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: '2px solid #ffffff',
                      flexShrink: 0,
                    }}
                  >
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          backgroundColor: '#e2e8f0',
                          color: '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '22px',
                          fontWeight: 800,
                        }}
                      >
                        {member.full_name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    {/* Active Status Dot */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        backgroundColor: '#22c55e',
                        border: '2px solid #ffffff',
                      }}
                      title="กำลังปฏิบัติงาน (Active)"
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0, paddingRight: isMe ? 40 : 0 }}>
                    <strong
                      style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: 'var(--text)',
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {member.full_name}
                    </strong>
                    <div style={{ marginTop: '4px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          backgroundColor: badgeStyle.bg,
                          borderColor: badgeStyle.border,
                          color: badgeStyle.color,
                          border: `1px solid ${badgeStyle.border}`,
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        {badgeStyle.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Stats Strip */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--surface-muted, #f8fafc)',
                    border: '1px solid var(--line, #e2e8f0)',
                    textAlign: 'center',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>งานทั้งหมด</span>
                    <strong style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                      {member.stats.totalJobs}
                    </strong>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '11px', color: '#d97706', display: 'block' }}>กำลังทำ</span>
                    <strong style={{ fontSize: '15px', fontWeight: 800, color: '#d97706' }}>
                      {member.stats.inProgressJobs}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#16a34a', display: 'block' }}>เสร็จสิ้น</span>
                    <strong style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a' }}>
                      {member.stats.completedJobs}
                    </strong>
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                  <Link
                    href={member.role?.code === 'GRAPHIC' ? `/jobs?graphicId=${member.id}` : `/jobs`}
                    className="secondary-button"
                    style={{
                      flex: 1,
                      fontSize: '13px',
                      textDecoration: 'none',
                      justifyContent: 'center',
                      height: '38px',
                    }}
                  >
                    <Briefcase size={14} /> ดูรายการงาน
                  </Link>

                  {/* Edit profile button if own profile or owner */}
                  {(isMe || currentUserRole === 'OWNER') && (
                    <button
                      type="button"
                      onClick={() => setEditingProfile(member)}
                      className="secondary-button compact"
                      style={{ height: '38px', padding: '0 12px' }}
                      title="แก้ไขชื่อหรือรูปโปรไฟล์"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <UserProfileModal
          isOpen={true}
          onClose={() => setEditingProfile(null)}
          profile={{
            id: editingProfile.id,
            full_name: editingProfile.full_name,
            avatar_url: editingProfile.avatar_url,
            role: {
              code: editingProfile.role?.code || 'GRAPHIC',
              name_th: editingProfile.role?.name_th || 'พนักงาน',
            },
          }}
        />
      )}
    </div>
  );
}
