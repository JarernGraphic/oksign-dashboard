'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, LogOut, Save, Sparkles, Trash2, User, X } from 'lucide-react';
import { updateMyProfileAction } from '../app/actions';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    role: { code: string; name_th: string };
  };
}

export function UserProfileModal({
  isOpen,
  onClose,
  profile,
}: UserProfileModalProps) {
  const [mounted, setMounted] = useState(false);
  const [nickname, setNickname] = useState(profile.full_name || '');
  const [selectedRoleCode, setSelectedRoleCode] = useState(profile.role?.code || 'GRAPHIC');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  const [isRemovedAvatar, setIsRemovedAvatar] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

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
          onClose();
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
    if (code === 'PRODUCTION') return 'ฝ่ายผลิต / ช่าง (Production)';
    return profile.role?.name_th || 'พนักงาน';
  };

  const modalContent = (
    <div className="custom-modal-backdrop" onClick={() => !isPending && onClose()}>
      <div
        className="custom-modal-card"
        style={{ maxWidth: '440px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="custom-modal-header" style={{ position: 'relative' }}>
          <div
            className="custom-modal-icon-circle"
            style={{
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <User size={22} />
          </div>
          <div>
            <h3 className="custom-modal-title">ข้อมูลโปรไฟล์ส่วนตัว</h3>
            <p className="custom-modal-subtitle">แก้ไขชื่อเล่นและรูปภาพประจำตัวของคุณ</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4,
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSave}>
          <div className="custom-modal-body" style={{ display: 'grid', gap: '20px' }}>
            {/* Avatar Upload Center */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '92px',
                  height: '92px',
                  borderRadius: '50%',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                  border: '3px solid #ffffff',
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

                {/* Change photo badge button */}
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
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }}
                  title="เปลี่ยนรูปภาพโปรไฟล์"
                >
                  <Camera size={15} />
                </button>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="secondary-button compact"
                  style={{ fontSize: '12px' }}
                >
                  <Camera size={13} /> เลือกรูปภาพใหม่
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="secondary-button compact"
                    style={{ fontSize: '12px', color: '#dc2626' }}
                    title="ลบรูปภาพโปรไฟล์"
                  >
                    <Trash2 size={13} /> ลบรูป
                  </button>
                )}
              </div>
            </div>

            {/* Display Name / Nickname */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
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
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                ชื่อนี้จะปรากฏในหน้ารายการงาน, ใบรับงาน และการมอบหมายงาน
              </span>
            </div>

            {/* Role / Position Selection */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#334155',
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
                  color: '#1e293b',
                  outline: 'none',
                  boxSizing: 'border-box',
                  background: '#ffffff',
                }}
              >
                <option value="GRAPHIC">กราฟิกดีไซเนอร์ (Graphic Designer)</option>
                <option value="ADMIN">แอดมิน / ประสานงาน / บัญชี (Admin)</option>
                <option value="PRODUCTION">ฝ่ายผลิต / ช่าง (Production)</option>
                <option value="OWNER">เจ้าของร้าน (Owner)</option>
              </select>
              <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '4px' }}>
                กำหนดตำแหน่งเพื่อแสดงในการมอบหมายงานและรายงานผลงาน
              </span>
            </div>

            {statusMsg && (
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: statusMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
                  color: statusMsg.type === 'success' ? '#16a34a' : '#dc2626',
                  border: `1px solid ${statusMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                }}
              >
                {statusMsg.type === 'success' ? <Check size={15} /> : null}
                <span>{statusMsg.text}</span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="custom-modal-footer">
            <button
              type="button"
              className="secondary-button"
              disabled={isPending}
              onClick={onClose}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="primary-button"
              style={{ backgroundColor: '#2563eb' }}
            >
              <Save size={15} />
              {isPending ? 'กำลังบันทึก...' : 'บันทึกโปรไฟล์'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
