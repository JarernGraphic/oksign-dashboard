'use client';

import React, { useState, useRef, useTransition } from 'react';
import { Camera, Check, Save, Trash2, User } from 'lucide-react';
import { updateMyProfileAction } from '../actions';

interface UserProfileEditorProps {
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role: { code: string; name_th: string };
  };
}

export function UserProfileEditor({ profile }: UserProfileEditorProps) {
  const [nickname, setNickname] = useState(profile.full_name || '');
  const [selectedRoleCode, setSelectedRoleCode] = useState(profile.role?.code || 'GRAPHIC');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [isRemovedAvatar, setIsRemovedAvatar] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStatusMsg({ text: 'ขนาดไฟล์ต้องไม่เกิน 5MB', type: 'error' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        setAvatarBase64(result);
        setIsRemovedAvatar(false);
        setStatusMsg(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarBase64('');
    setIsRemovedAvatar(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setStatusMsg({ text: 'กรุณากรอกชื่อเล่นหรือชื่อที่ต้องการให้แสดง', type: 'error' });
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append('nickname', nickname.trim());
      formData.append('roleCode', selectedRoleCode);
      if (isRemovedAvatar) {
        formData.append('avatarUrl', '');
        formData.append('avatarBase64', '');
      } else if (avatarBase64) {
        formData.append('avatarBase64', avatarBase64);
      } else if (avatarPreview) {
        formData.append('avatarUrl', avatarPreview);
      }

      const res = await updateMyProfileAction(formData);
      if (res?.error) {
        setStatusMsg({ text: res.error, type: 'error' });
      } else {
        setStatusMsg({ text: 'บันทึกโปรไฟล์เรียบร้อยแล้ว!', type: 'success' });
        setTimeout(() => {
          window.location.reload();
        }, 600);
      }
    });
  };

  const getRoleLabel = () => {
    const code = profile.role?.code;
    if (code === 'OWNER') return 'เจ้าของร้าน (Owner)';
    if (code === 'ADMIN') return 'แอดมิน / ประสานงาน (Admin)';
    if (code === 'GRAPHIC') return 'กราฟิกดีไซเนอร์ (Graphic Designer)';
    if (code === 'PRODUCTION' || code === 'TECHNICIAN') return 'ช่าง';
    return profile.role?.name_th || 'พนักงาน';
  };

  return (
    <section className="panel detail-card" style={{ padding: '24px' }}>
      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gap: '24px' }}>
          {/* Avatar Upload Center */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                position: 'relative',
                width: '88px',
                height: '88px',
                borderRadius: '50%',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                border: '3px solid #ffffff',
                flexShrink: 0,
              }}
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={nickname || 'Profile avatar'}
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
                    fontSize: '32px',
                    fontWeight: 800,
                  }}
                >
                  {(nickname || 'U').slice(0, 1).toUpperCase()}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: '2.5px solid #ffffff',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
                title="เปลี่ยนรูปภาพโปรไฟล์"
              >
                <Camera size={14} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <div>
              <strong style={{ fontSize: '15px', color: 'var(--text)', display: 'block', marginBottom: '4px' }}>
                รูปภาพประจำตัว
              </strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="secondary-button compact"
                  style={{ fontSize: '12.5px' }}
                >
                  <Camera size={13} /> เปลี่ยนรูปใหม่
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="secondary-button compact"
                    style={{ fontSize: '12.5px', color: '#dc2626' }}
                  >
                    <Trash2 size={13} /> ลบรูปภาพ
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: 0 }} />

          {/* Nickname Field */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13.5px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '6px',
              }}
            >
              ชื่อเล่น / ชื่อที่แสดงในระบบ <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="เช่น sonramn, เฟิร์ส, แนน..."
              required
              style={{
                width: '100%',
                height: '42px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '14.5px',
                fontWeight: 600,
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              ชื่อนี้จะใช้ระบุตัวตนของคุณในใบรับงาน การมอบหมายงาน และรายการสรุปยอด
            </span>
          </div>

          {/* Role / Position Selection */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13.5px',
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: '6px',
              }}
            >
              ตำแหน่งหน้าที่ในร้าน <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={selectedRoleCode}
              onChange={(e) => setSelectedRoleCode(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text)',
                outline: 'none',
                boxSizing: 'border-box',
                background: 'var(--surface)',
              }}
            >
              <option value="GRAPHIC">กราฟิกดีไซเนอร์ (Graphic Designer)</option>
              <option value="ADMIN">แอดมิน / ประสานงาน / บัญชี (Admin)</option>
              <option value="PRODUCTION">ฝ่ายผลิต / ช่าง (Production)</option>
              <option value="OWNER">เจ้าของร้าน (Owner)</option>
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
              กำหนดตำแหน่งเพื่อแสดงในการมอบหมายงานและรายงานผลงาน
            </span>
          </div>

          {statusMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: statusMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                color: statusMsg.type === 'success' ? '#16a34a' : '#dc2626',
                border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              {statusMsg.type === 'success' ? <Check size={16} /> : null}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={isPending}
              className="primary-button"
              style={{ backgroundColor: '#2563eb', padding: '10px 20px', fontSize: '14px' }}
            >
              <Save size={16} />
              {isPending ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
