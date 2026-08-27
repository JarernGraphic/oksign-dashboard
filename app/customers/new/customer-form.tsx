'use client';

import React, { useState, useEffect, useRef, useTransition, useActionState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Save,
  User,
  X,
  Phone,
  MessageCircle,
  Mail,
  FileText,
  MapPin,
  ClipboardList,
  Compass,
} from 'lucide-react';
import { createCustomerAction, type CustomerFormState } from '../actions';

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

type LeadSource = { id: string; name: string };

export function CustomerForm({ leadSources }: { leadSources: LeadSource[] }) {
  const [state, action, pending] = useActionState(createCustomerAction, {} as CustomerFormState);

  return (
    <form action={action} className="customer-form-container">
      {state.error ? <div className="form-error-banner">{state.error}</div> : null}

      {/* SECTION 1: BASIC INFO */}
      <div className="customer-form-section">
        <h3 className="customer-form-section-title">
          <User size={16} />
          <span>ข้อมูลบุคคล / นิติบุคคล</span>
        </h3>
        <div className="customer-form-grid">
          <div className="customer-input-group full-width">
            <span className="customer-input-label">
              ชื่อบุคคล / ชื่อบริษัท / กิจการ <b className="req">*</b>
            </span>
            <div className="customer-input-wrapper">
              <Building2 size={16} />
              <input
                name="name"
                required
                placeholder="เช่น บริษัท อารียา ดีเวลลอปเม้นท์ จำกัด, คุณสมชาย ใจดี"
                className="customer-input-field"
              />
            </div>
          </div>

          <div className="customer-input-group">
            <span className="customer-input-label">ประเภทลูกค้า</span>
            <div className="customer-input-wrapper no-icon">
              <select name="customerType" className="customer-input-field">
                <option value="PERSON">บุคคลธรรมดา</option>
                <option value="BUSINESS">นิติบุคคล / ร้านค้า</option>
              </select>
            </div>
          </div>

          <div className="customer-input-group">
            <span className="customer-input-label">เลขประจำตัวผู้เสียภาษี (Tax ID)</span>
            <div className="customer-input-wrapper">
              <FileText size={16} />
              <input
                name="taxId"
                placeholder="เลข 13 หลัก (สำหรับออกใบกำกับภาษี)"
                className="customer-input-field"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CONTACT DETAILS */}
      <div className="customer-form-section">
        <h3 className="customer-form-section-title">
          <Phone size={16} />
          <span>ช่องทางการติดต่อ</span>
        </h3>
        <div className="customer-form-grid">
          <div className="customer-input-group">
            <span className="customer-input-label">เบอร์โทรศัพท์</span>
            <div className="customer-input-wrapper">
              <Phone size={16} />
              <input
                name="phone"
                inputMode="tel"
                placeholder="เช่น 081-234-5678"
                className="customer-input-field"
              />
            </div>
          </div>

          <div className="customer-input-group">
            <span className="customer-input-label">อีเมล</span>
            <div className="customer-input-wrapper">
              <Mail size={16} />
              <input
                name="email"
                type="email"
                placeholder="somchai@example.com"
                className="customer-input-field"
              />
            </div>
          </div>

          <div className="customer-input-group">
            <span className="customer-input-label">LINE Name / ID</span>
            <div className="customer-input-wrapper">
              <MessageCircle size={16} />
              <input
                name="lineName"
                placeholder="เช่น somchai_ok, @somchai"
                className="customer-input-field"
              />
            </div>
          </div>

          <div className="customer-input-group">
            <span className="customer-input-label">Facebook Name</span>
            <div className="customer-input-wrapper">
              <FacebookIcon />
              <input
                name="facebookName"
                placeholder="เช่น Somchai Jaidee"
                className="customer-input-field"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: LOGISTICS & ADDITIONAL */}
      <div className="customer-form-section">
        <h3 className="customer-form-section-title">
          <MapPin size={16} />
          <span>ที่อยู่ & ข้อมูลการจัดส่ง</span>
        </h3>
        <div className="customer-form-grid">
          <div className="customer-input-group full-width">
            <span className="customer-input-label">ช่องทางที่ลูกค้าติดต่อมา (Lead Source)</span>
            <div className="customer-input-wrapper">
              <Compass size={16} />
              <select
                name="leadSourceId"
                className="customer-input-field"
                style={{ paddingLeft: '38px' }}
              >
                <option value="">-- ไม่ระบุช่องทาง --</option>
                {leadSources.map((source) => (
                  <option value={source.id} key={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="customer-input-group full-width">
            <span className="customer-input-label">ที่อยู่ / สถานที่ส่งของ / สถานที่ติดตั้ง</span>
            <div className="customer-input-wrapper">
              <MapPin size={16} style={{ top: '14px' }} />
              <textarea
                name="address"
                rows={3}
                placeholder="ระบุที่อยู่จัดส่งสินค้า ใบเสร็จ หรือสถานที่นัดหมายติดตั้งงาน..."
                className="customer-textarea-field"
              />
            </div>
          </div>

          <div className="customer-input-group full-width">
            <span className="customer-input-label">หมายเหตุเพิ่มเติมเกี่ยวกับลูกค้า</span>
            <div className="customer-input-wrapper">
              <ClipboardList size={16} style={{ top: '14px' }} />
              <textarea
                name="note"
                rows={3}
                placeholder="ข้อตกลงพิเศษ, เครดิตเทอม, หรือข้อควรระวัง..."
                className="customer-textarea-field"
              />
            </div>
          </div>
        </div>
      </div>

      {/* FORM ACTIONS */}
      <div className="form-actions" style={{ marginTop: '12px' }}>
        <Link href="/customers" className="secondary-button" style={{ borderRadius: '12px' }}>
          <X size={16} />
          <span>ยกเลิก</span>
        </Link>
        <button
          className="primary-button"
          disabled={pending}
          type="submit"
          style={{ borderRadius: '12px' }}
        >
          <Save size={16} />
          <span>{pending ? 'กำลังบันทึก…' : 'บันทึกข้อมูลลูกค้า'}</span>
        </button>
      </div>
    </form>
  );
}
