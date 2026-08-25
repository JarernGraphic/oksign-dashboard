'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Building2, Save, User, X } from 'lucide-react';
import { createCustomerAction, type CustomerFormState } from '../actions';

type LeadSource = { id: string; name: string };

export function CustomerForm({ leadSources }: { leadSources: LeadSource[] }) {
  const [state, action, pending] = useActionState(createCustomerAction, {} as CustomerFormState);

  return (
    <form action={action} className="data-form">
      {state.error ? <div className="form-error-banner">{state.error}</div> : null}

      <div className="form-grid">
        <label className="span-2">
          <span className="field-label">ชื่อบุคคล / ชื่อบริษัท / กิจการ <b className="req">*</b></span>
          <input
            name="name"
            required
            placeholder="เช่น บริษัท อารียา ดีเวลลอปเม้นท์ จำกัด, คุณสมชาย ใจดี"
            className="wb-input"
          />
        </label>

        <label>
          <span className="field-label">ประเภทลูกค้า</span>
          <select name="customerType" className="wb-select">
            <option value="PERSON">บุคคลธรรมดา</option>
            <option value="BUSINESS">นิติบุคคล / ร้านค้า</option>
          </select>
        </label>

        <label>
          <span className="field-label">เบอร์โทรศัพท์</span>
          <input
            name="phone"
            inputMode="tel"
            placeholder="เช่น 081-234-5678"
            className="wb-input"
          />
        </label>

        <label>
          <span className="field-label">LINE Name / ID</span>
          <input
            name="lineName"
            placeholder="เช่น somchai_ok, @somchai"
            className="wb-input"
          />
        </label>

        <label>
          <span className="field-label">Facebook Name</span>
          <input
            name="facebookName"
            placeholder="เช่น Somchai Jaidee"
            className="wb-input"
          />
        </label>

        <label>
          <span className="field-label">อีเมล (ถ้ามี)</span>
          <input
            name="email"
            type="email"
            placeholder="somchai@example.com"
            className="wb-input"
          />
        </label>

        <label>
          <span className="field-label">เลขประจำตัวผู้เสียภาษี (Tax ID)</span>
          <input
            name="taxId"
            placeholder="เลข 13 หลัก (สำหรับออกใบกำกับภาษี)"
            className="wb-input"
          />
        </label>

        <label className="span-2">
          <span className="field-label">ช่องทางที่ลูกค้าติดต่อมา (Lead Source)</span>
          <select name="leadSourceId" className="wb-select">
            <option value="">-- ไม่ระบุช่องทาง --</option>
            {leadSources.map((source) => (
              <option value={source.id} key={source.id}>
                {source.name}
              </option>
            ))}
          </select>
        </label>

        <label className="span-2">
          <span className="field-label">ที่อยู่ / สถานที่ส่งของ / สถานที่ติดตั้ง</span>
          <textarea
            name="address"
            rows={3}
            placeholder="ระบุที่อยู่จัดส่งสินค้า ใบเสร็จ หรือสถานที่นัดหมายติดตั้งงาน..."
            className="wb-textarea"
          />
        </label>

        <label className="span-2">
          <span className="field-label">หมายเหตุเพิ่มเติมเกี่ยวกับลูกค้า</span>
          <textarea
            name="note"
            rows={3}
            placeholder="ข้อตกลงพิเศษ, เครดิตเทอม, หรือข้อควรระวัง..."
            className="wb-textarea"
          />
        </label>
      </div>

      <div className="form-actions">
        <Link href="/customers" className="secondary-button">
          <X size={16} />
          <span>ยกเลิก</span>
        </Link>
        <button className="primary-button" disabled={pending} type="submit">
          <Save size={16} />
          <span>{pending ? 'กำลังบันทึก…' : 'บันทึกข้อมูลลูกค้า'}</span>
        </button>
      </div>
    </form>
  );
}
