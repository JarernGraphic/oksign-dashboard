'use client';

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import {
  Building2, Camera, Check, Globe, Image as ImageIcon,
  Mail, MessageCircle, Phone, Plus, Trash2, UploadCloud, User, X
} from 'lucide-react';
import { createCustomerAction } from '../app/customers/actions';

export type CustomerOption = {
  id: string;
  name: string;
  phone?: string | null;
  company_name?: string | null;
  avatar_url?: string | null;
  line_name?: string | null;
  facebook_name?: string | null;
};

type LeadSource = { id: string; name: string };

export function CustomerModal({
  isOpen,
  onClose,
  onSuccess,
  leadSources = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCustomer: CustomerOption) => void;
  leadSources?: LeadSource[];
}) {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customerType, setCustomerType] = useState<'PERSON' | 'BUSINESS'>('PERSON');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [lineName, setLineName] = useState('');
  const [facebookName, setFacebookName] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [leadSourceId, setLeadSourceId] = useState('');
  const [note, setNote] = useState('');

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        setError('ขนาดรูปภาพต้องไม่เกิน 4 MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('กรุณากรอกชื่อลูกค้า / ผู้ติดต่อ');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('companyName', companyName.trim());
      formData.append('customerType', customerType);
      formData.append('phone', phone.trim());
      formData.append('email', email.trim());
      formData.append('lineName', lineName.trim());
      formData.append('facebookName', facebookName.trim());
      formData.append('taxId', taxId.trim());
      formData.append('address', address.trim());
      formData.append('leadSourceId', leadSourceId);
      formData.append('note', note.trim());
      if (avatarPreview) {
        formData.append('avatarUrl', avatarPreview);
      }

      // We call the API endpoint or fetch
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          companyName: companyName.trim(),
          customerType,
          phone: phone.trim(),
          email: email.trim(),
          lineName: lineName.trim(),
          facebookName: facebookName.trim(),
          website: website.trim(),
          taxId: taxId.trim(),
          address: address.trim(),
          leadSourceId: leadSourceId || null,
          note: note.trim(),
          avatarUrl: avatarPreview || null,
        }),
      });

      const data = (await res.json()) as { error?: string; customer?: CustomerOption };
      if (!res.ok || data.error) {
        throw new Error(data.error || 'ไม่สามารถบันทึกข้อมูลลูกค้าได้');
      }

      if (onSuccess && data.customer) {
        onSuccess(data.customer);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="customer-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="customer-modal-header">
          <div className="title-area">
            <h3>{name || 'เพิ่มลูกค้าใหม่'}</h3>
            <span className="subtitle">กรอกข้อมูลและอัปโหลดรูปโปรไฟล์ลูกค้า</span>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="customer-modal-form">
          {error && <div className="form-error-banner">{error}</div>}

          {/* Profile Image Upload Box */}
          <div className="avatar-uploader-section">
            <span className="section-label">รูปโปรไฟล์ลูกค้า / โลโก้</span>
            <div className="avatar-preview-box">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Customer Avatar" className="avatar-img-circle" />
              ) : (
                <div className="avatar-placeholder">
                  {customerType === 'BUSINESS' ? <Building2 size={44} /> : <User size={44} />}
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />

            <div className="avatar-btn-row">
              <button
                type="button"
                className="upload-avatar-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadCloud size={16} />
                <span>{avatarPreview ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพลูกค้า'}</span>
              </button>

              {avatarPreview && (
                <button type="button" className="remove-avatar-btn" onClick={removeAvatar}>
                  <Trash2 size={15} />
                  <span>ลบรูปปัจจุบัน</span>
                </button>
              )}
            </div>
            <small className="avatar-hint">รองรับ JPG, PNG, WEBP, GIF · ขนาดไม่เกิน 4MB</small>
          </div>

          {/* Fields */}
          <div className="fields-grid">
            <label className="field-full">
              <span className="field-label">ชื่อที่แสดง / ผู้ติดต่อ <b className="req">*</b></span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น สมศักดิ์ ไชโย, คุณปิยะนารถ"
                className="wb-input"
              />
            </label>

            <label className="field-full">
              <span className="field-label">ชื่อบริษัท / ร้านค้า (ถ้ามี)</span>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="เช่น บริษัท สยามกราฟิก จำกัด"
                className="wb-input"
              />
            </label>

            <label className="field-half">
              <span className="field-label">ประเภทลูกค้า</span>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value as any)}
                className="wb-select"
              >
                <option value="PERSON">บุคคลธรรมดา</option>
                <option value="BUSINESS">นิติบุคคล / ร้านค้า</option>
              </select>
            </label>

            <label className="field-half">
              <span className="field-label">ช่องทางที่ติดต่อมา</span>
              <select
                value={leadSourceId}
                onChange={(e) => setLeadSourceId(e.target.value)}
                className="wb-select"
              >
                <option value="">-- ไม่ระบุช่องทาง --</option>
                {leadSources.map((source) => (
                  <option value={source.id} key={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-full">
              <span className="field-label">เลขประจำตัวผู้เสียภาษี (Tax ID)</span>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="เช่น 0-1234-56789-01-2 หรือเลข 13 หลัก"
                className="wb-input"
              />
              <small className="field-hint">ใช้ออกใบกำกับภาษี / ใบเสนอราคาทางการ</small>
            </label>

            <label className="field-half">
              <span className="field-label">โทรศัพท์</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812345678"
                className="wb-input"
              />
            </label>

            <label className="field-half">
              <span className="field-label">อีเมล</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@email.com"
                className="wb-input"
              />
            </label>

            <label className="field-half">
              <span className="field-label">LINE ID / LINE</span>
              <input
                type="text"
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                placeholder="@lineid หรือเบอร์ที่ผูก LINE"
                className="wb-input"
              />
            </label>

            <label className="field-half">
              <span className="field-label">Facebook Name</span>
              <input
                type="text"
                value={facebookName}
                onChange={(e) => setFacebookName(e.target.value)}
                placeholder="ชื่อเฟสบุ๊ค หรือ URL"
                className="wb-input"
              />
            </label>

            <label className="field-full">
              <span className="field-label">เว็บไซต์</span>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://"
                className="wb-input"
              />
            </label>

            <label className="field-full">
              <span className="field-label">ที่อยู่ / สถานที่ส่งของ / สถานที่ติดตั้ง</span>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="ระบุที่อยู่จัดส่งสินค้าหรือสถานที่นัดติดตั้ง..."
                className="wb-textarea"
              />
            </label>

            <label className="field-full">
              <span className="field-label">หมายเหตุเพิ่มเติม</span>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ข้อตกลงพิเศษ หรือข้อควรระวัง..."
                className="wb-textarea"
              />
            </label>
          </div>

          {/* Footer Actions */}
          <div className="customer-modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" className="primary-button submit-btn" disabled={loading}>
              <Check size={16} />
              <span>{loading ? 'กำลังบันทึก…' : 'บันทึกข้อมูลลูกค้า'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
