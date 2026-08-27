'use client';

import React, { useState } from 'react';
import { LogOut, Pencil, UserCheck } from 'lucide-react';
import { logoutAction } from '../app/actions';
import { UserProfileModal } from './user-profile-modal';

interface SidebarUserCardProps {
  profile: {
    id: string;
    organization_id: string;
    full_name: string;
    avatar_url?: string | null;
    role: { code: string; name_th: string };
  };
}

export function SidebarUserCard({ profile }: SidebarUserCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getRoleBadge = () => {
    const code = profile.role?.code;
    if (code === 'OWNER') return 'เจ้าของร้าน';
    if (code === 'ADMIN') return 'แอดมิน (รวมบัญชี)';
    if (code === 'GRAPHIC') return 'กราฟิก';
    if (code === 'PRODUCTION') return 'ช่าง';
    return profile.role?.name_th || 'เจ้าของร้าน';
  };

  return (
    <>
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="sidebar-user"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            transition: 'background-color 0.15s ease',
          }}
          title="คลิกเพื่อแก้ไขรูปโปรไฟล์และชื่อเล่นของคุณ"
        >
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name}
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div className="avatar">{profile.full_name.slice(0, 1)}</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13.5px', color: 'var(--text)' }}>
                {profile.full_name}
              </strong>
              <Pencil size={11} className="sidebar-user-pen-icon" />
            </div>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {getRoleBadge()}
            </span>
          </div>
        </button>

        <form action={logoutAction} style={{ margin: 0 }}>
          <button
            type="submit"
            title="ออกจากระบบ"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              color: '#71717a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.15s, color 0.15s',
            }}
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>

      <UserProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        profile={profile}
      />
    </>
  );
}
