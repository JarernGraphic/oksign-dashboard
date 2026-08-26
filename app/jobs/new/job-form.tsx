'use client';

import { useActionState, useState, useRef, useEffect, type ChangeEvent } from 'react';
import Link from 'next/link';
import {
  AlertCircle, Calendar, Check, CheckSquare, ChevronDown, Circle, DollarSign, FileText, Image as ImageIcon,
  Layers, Package, Palette, Phone, Plus, Printer, RectangleHorizontal, RectangleVertical,
  Scissors, Search, Send, Sparkles, Square, Triangle, UploadCloud, User, UserCheck, Wrench, X, Zap
} from 'lucide-react';

import { createJobAction, type JobFormState } from '../actions';
import { CustomerModal, type CustomerOption } from '../../../components/customer-modal';

type Option = { id: string; name: string };

export function JobForm({
  customers,
  graphics,
  currentProfileName = '',
  nextJobNumber = '',
}: {
  customers: CustomerOption[];
  graphics: Option[];
  currentProfileName?: string;
  nextJobNumber?: string;
}) {
  const [state, action, pending] = useActionState(createJobAction, {} as JobFormState);

  // Form reactive states
  const [customerList, setCustomerList] = useState<CustomerOption[]>(customers);
  const [receiverName, setReceiverName] = useState<string>(currentProfileName || (graphics[0]?.name ?? 'Admin'));
  const [customerId, setCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const dimensions = width && height ? `${width} × ${height}` : (width || height || '');
  const [quantity, setQuantity] = useState<number | string>(1);

  const [unitPrice, setUnitPrice] = useState<number | string>('');
  const [installCost, setInstallCost] = useState<number | string>('');
  const [installLocation, setInstallLocation] = useState<string>('');
  const [depositBaht, setDepositBaht] = useState<number | string>('');
  const [depositMethod, setDepositMethod] = useState<string>('');
  const [remainingMethod, setRemainingMethod] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<string>('NORMAL');
  const [graphicId, setGraphicId] = useState<string>('');
  const [designCondition, setDesignCondition] = useState<string>('ดูแบบ');
  const [contactChannel, setContactChannel] = useState<string>('LINE OA');
  const [facebookContact, setFacebookContact] = useState<string>('');
  const [lineContact, setLineContact] = useState<string>('');
  const [phoneContact, setPhoneContact] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Spec Checkbox arrays
  const [printers, setPrinters] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [customMaterial, setCustomMaterial] = useState<string>('');
  const [boardTypes, setBoardTypes] = useState<string[]>([]);
  const [boardWarning, setBoardWarning] = useState<string | null>(null);
  const [finishing, setFinishing] = useState<string[]>([]);
  const [shapes, setShapes] = useState<string[]>([]);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isReceived, setIsReceived] = useState<boolean>(false);
  const [customFinishing, setCustomFinishing] = useState<string>('');

  const mainBoardList = ['ฟิวเจอร์บอร์ด', 'โฟมบอร์ด', 'อะคริลิค', 'พลาสวูด', 'คอมโพสิต'];
  const activeSelectedBoard =
    boardTypes.find((b) => mainBoardList.some((mb) => b.startsWith(mb)))?.split(' ')[0] ||
    (boardTypes.some((b) => b.includes('ฟิวเจอร์บอร์ด')) ? 'ฟิวเจอร์บอร์ด' : null);

  const handleThicknessClick = (thick: string) => {
    if (!activeSelectedBoard) {
      setBoardWarning('⚠️ กรุณาเลือกประเภทบอร์ดก่อน (เช่น ฟิวเจอร์บอร์ด, พลาสวูด, อะคริลิค...)');
      setTimeout(() => setBoardWarning(null), 3500);
      return;
    }
    setBoardWarning(null);
    const targetVal = `${activeSelectedBoard} ${thick}`;
    handleCheckboxToggle(boardTypes, setBoardTypes, targetVal);
  };


  // Image preview state
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
  };

  const handleCheckboxToggle = (
    list: string[],
    setList: (val: string[]) => void,
    value: string
  ) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  // Close customer dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [openedDate, setOpenedDate] = useState<string>(todayStr);

  const numQty = typeof quantity === 'number' ? quantity : (parseInt(quantity, 10) || 0);
  const numUnitPrice = typeof unitPrice === 'number' ? unitPrice : (parseFloat(unitPrice) || 0);
  const numInstallCost = typeof installCost === 'number' ? installCost : (parseFloat(installCost) || 0);
  const numDepositBaht = typeof depositBaht === 'number' ? depositBaht : (parseFloat(depositBaht) || 0);

  const calculatedTotal = (numQty * numUnitPrice) + numInstallCost;
  const calculatedRemaining = Math.max(0, calculatedTotal - numDepositBaht);

  const selectedCustomer = customerList.find((c) => c.id === customerId);

  // Filtered customer list for search
  const filteredCustomers = customerList.filter((c) => {
    const q = customerSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)) || (c.company_name && c.company_name.toLowerCase().includes(q));
  });

  const selectCustomer = (c: CustomerOption) => {
    setCustomerId(c.id);
    setCustomerSearchQuery(c.name);
    if (c.phone) {
      setPhoneContact(c.phone);
    }
    setIsCustomerDropdownOpen(false);
  };

  return (
    <>
      <form action={action} className="job-order-workbench paper-style-workbench">
      {state.error ? <div className="form-error-banner span-all">{state.error}</div> : null}

      {/* LEFT COLUMN: Authentic Interactive Paper Sheet */}
      <div className="workbench-main">
        <div className="paper-form-sheet">
          {/* TOP SECTION: Header Left & Header Right */}
          <div className="paper-top-grid">
            {/* LEFT COLUMN OF PAPER */}
            <div className="paper-header-left">
              {/* Title Badge & Receiver (Dropdown select from Graphic staff) */}
              <div className="paper-row-inline">
                <span className="paper-badge-title">ใบรับงาน</span>
                <div className="paper-field-box inline-receiver">
                  <span className="paper-field-label">ผู้รับงาน</span>
                  <input
                    type="text"
                    name="receiverName"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="paper-input receiver-input"
                    placeholder="ชื่อผู้รับงาน"
                    required
                  />
                </div>
              </div>

              {/* Customer Name Searchable Input */}
              <div className="paper-field-box customer-box" ref={dropdownRef}>
                <span className="paper-field-label">ชื่อลูกค้า <b className="req">*</b></span>
                <div className="paper-customer-wrap">
                  <input
                    type="text"
                    placeholder="พิมพ์เพื่อค้นหาลูกค้า..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    className="paper-input customer-search-input"
                  />
                  <ChevronDown
                    size={14}
                    className="dropdown-arrow-icon"
                    onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  />
                </div>

                <input type="hidden" name="customerId" value={customerId} required />

                {/* Search Dropdown */}
                {isCustomerDropdownOpen && (
                  <div className="customer-dropdown-menu paper-dropdown">
                    <div className="customer-dropdown-list">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            className={`customer-option-row ${customerId === c.id ? 'active' : ''}`}
                            onClick={() => selectCustomer(c)}
                          >
                            <div className="c-info">
                              <span className="c-name">{c.name}</span>
                              {c.phone && <span className="c-phone">📞 {c.phone}</span>}
                            </div>
                            {customerId === c.id && <Check size={16} className="c-check" />}
                          </div>
                        ))
                      ) : (
                        <div className="customer-not-found">ไม่พบชื่อลูกค้า &quot;{customerSearchQuery}&quot;</div>
                      )}
                    </div>
                    <div className="customer-dropdown-footer">
                      <button
                        type="button"
                        className="add-new-customer-link"
                        onClick={() => {
                          setIsCustomerDropdownOpen(false);
                          setIsCustomerModalOpen(true);
                        }}
                      >
                        <Plus size={14} />
                        <span>เพิ่มลูกค้าใหม่ทันที</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Job Title */}
              <div className="paper-field-box">
                <span className="paper-field-label">ชื่องาน <b className="req">*</b></span>
                <input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ป้ายไวนิลหน้าร้าน, สติกเกอร์ไดคัท..."
                  className="paper-input"
                  required
                />
              </div>

              {/* Dimensions (Width x Height) - Left aligned */}
              <div className="paper-line-dotted left-aligned-dim">
                <span className="paper-line-label">ขนาด</span>
                <div className="paper-dim-inputs">
                  <span>กว้าง</span>
                  <input
                    name="width"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder=""
                    className="paper-input-underline dim-input"
                  />
                  <span>× สูง</span>
                  <input
                    name="height"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder=""
                    className="paper-input-underline dim-input"
                  />
                  <span>ซม.</span>
                </div>
                <input type="hidden" name="dimensions" value={dimensions} />
              </div>

              {/* Quantity & Unit Price */}
              <div className="paper-line-dotted left-aligned-dim">
                <div className="sub-inline-group">
                  <span className="paper-line-label">จำนวน</span>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    value={quantity}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="paper-input-underline num-input"
                    placeholder="1"
                    required
                  />
                  <span className="paper-unit">ชิ้น</span>
                </div>
                <div className="sub-inline-group">
                  <span className="paper-line-label">ราคา</span>
                  <input
                    name="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="paper-input-underline num-input"
                    placeholder="0"
                  />
                  <span className="paper-unit">บาท/ชิ้น</span>
                </div>
              </div>

              {/* Installation Cost & Location */}
              <div className="paper-line-dotted split">
                <div className="sub-inline-group">
                  <span className="paper-line-label">ค่าแรงติดตั้ง</span>
                  <input
                    name="installCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={installCost}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setInstallCost(e.target.value)}
                    className="paper-input-underline num-input"
                    placeholder="0"
                  />
                </div>
                <div className="sub-inline-group flex-1">
                  <span className="paper-line-label">สถานที่ติดตั้ง</span>
                  <input
                    name="installLocation"
                    value={installLocation}
                    onChange={(e) => setInstallLocation(e.target.value)}
                    placeholder="ระบุสถานที่ติดตั้ง..."
                    className="paper-input-underline text-input flex-1"
                  />
                </div>
              </div>

              {/* Total Baht Box */}
              <div className="paper-box-total">
                <span className="paper-total-label">รวมยอด</span>
                <strong className="paper-total-amount">
                  ฿{calculatedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </strong>
                <input type="hidden" name="totalBaht" value={calculatedTotal} />
              </div>

              {/* Deposit Box */}
              <div className="paper-box-payment">
                <div className="pay-left">
                  <span className="pay-label">มัดจำ</span>
                  <input
                    name="depositBaht"
                    type="number"
                    min="0"
                    max={calculatedTotal}
                    step="0.01"
                    value={depositBaht}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setDepositBaht(e.target.value)}
                    className="paper-input-clean deposit-val-input"
                    placeholder="0.00"
                  />
                </div>
                <div className="pay-methods">
                  <label className="paper-radio-label">
                    <input
                      type="checkbox"
                      name="depositMethod"
                      value="CASH"
                      checked={depositMethod === 'CASH'}
                      onChange={() => setDepositMethod(depositMethod === 'CASH' ? '' : 'CASH')}
                    />
                    <span>เงินสด</span>
                  </label>
                  <label className="paper-radio-label">
                    <input
                      type="checkbox"
                      name="depositMethod"
                      value="BANK_TRANSFER"
                      checked={depositMethod === 'BANK_TRANSFER'}
                      onChange={() => setDepositMethod(depositMethod === 'BANK_TRANSFER' ? '' : 'BANK_TRANSFER')}
                    />
                    <span>โอนจ่าย</span>
                  </label>
                </div>
              </div>

              {/* Remaining Box */}
              <div className="paper-box-payment">
                <div className="pay-left">
                  <span className="pay-label">คงเหลือ</span>
                  <strong className={`remaining-val-display ${calculatedRemaining > 0 ? 'text-red' : 'text-green'}`}>
                    ฿{calculatedRemaining.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="pay-methods">
                  <label className="paper-radio-label">
                    <input
                      type="checkbox"
                      name="remainingMethod"
                      value="CASH"
                      checked={remainingMethod === 'CASH'}
                      onChange={() => setRemainingMethod(remainingMethod === 'CASH' ? '' : 'CASH')}
                    />
                    <span>เงินสด</span>
                  </label>
                  <label className="paper-radio-label">
                    <input
                      type="checkbox"
                      name="remainingMethod"
                      value="BANK_TRANSFER"
                      checked={remainingMethod === 'BANK_TRANSFER'}
                      onChange={() => setRemainingMethod(remainingMethod === 'BANK_TRANSFER' ? '' : 'BANK_TRANSFER')}
                    />
                    <span>โอนจ่าย</span>
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN OF PAPER */}
            <div className="paper-header-right">
              {/* Job Code Box */}
              <div className="paper-job-number-box">
                <span className="paper-job-label">รหัสงาน</span>
                <div className="paper-job-value-pill">
                  <div className="job-num-prefix-group">
                    <span className="job-num-part year">{nextJobNumber ? nextJobNumber.slice(0, 2) : '69'}</span>
                    <span className="job-num-part month">{nextJobNumber ? nextJobNumber.slice(2, 4) : '08'}</span>
                  </div>
                  <span className="job-num-part seq">{nextJobNumber ? nextJobNumber.slice(4) : '001'}</span>
                </div>
              </div>

              {/* Opened Date */}
              <div className="paper-date-row">
                <p>วันที่เปิดใบงาน</p>
                <div className="paper-date-input-wrap">
                  <input
                    type="date"
                    name="openedDate"
                    value={openedDate}
                    onChange={(e) => setOpenedDate(e.target.value)}
                    className="paper-date-input"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div className="paper-date-row">
                <p>วันที่ส่งงาน</p>
                <div className="paper-date-input-wrap">
                  <input
                    type="date"
                    name="dueDate"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="paper-date-input"
                  />
                </div>
              </div>

              {/* Design Condition Checks */}
              <div className="paper-design-status-checks">
                {['ดูแบบ', 'ไม่ดูแบบ', 'มีแบบ'].map((cond) => (
                  <label className={`paper-check-box-label ${designCondition === cond ? 'checked' : ''}`} key={cond}>
                    <input
                      type="checkbox"
                      name="designCondition"
                      value={cond}
                      checked={designCondition === cond}
                      onChange={() => setDesignCondition(cond)}
                    />
                    <span>{cond}</span>
                  </label>
                ))}
              </div>

              {/* Contact Channels Section with Line Buttons + Header + 3 Input Rows */}
              <div className="paper-channel-section">
                <div className="paper-channel-line-pills">
                  {['LINE 1', 'LINE 2', 'LINE 3', 'LINE OA'].map((ch, idx) => {
                    const badgeText = idx === 3 ? 'OA' : String(idx + 1);
                    return (
                      <button
                        type="button"
                        key={ch}
                        className={`paper-ch-pill ${contactChannel === ch ? 'active' : ''}`}
                        onClick={() => setContactChannel(ch)}
                      >
                        <span className="line-icon-sub">LINE</span>
                        <span className="line-badge-num">{badgeText}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="paper-channel-badge-header">ช่องทางติดต่อลูกค้า</div>
                <input type="hidden" name="contactChannel" value={contactChannel} />

                {/* 3 Contact Input Rows Matching Image 3 exactly */}
                <div className="paper-contact-inputs-list">
                  <div className="paper-contact-line">
                    <span className="contact-icon-circle fb">ⓕ</span>
                    <input
                      name="facebookContact"
                      value={facebookContact}
                      onChange={(e) => setFacebookContact(e.target.value)}
                      placeholder="Facebook / เพจลูกค้า"
                      className="paper-input-underline flex-1 text-left"
                    />
                  </div>
                  <div className="paper-contact-line">
                    <span className="contact-icon-circle line">💬</span>
                    <input
                      name="lineContact"
                      value={lineContact}
                      onChange={(e) => setLineContact(e.target.value)}
                      placeholder="Line ID / บัญชี Line"
                      className="paper-input-underline flex-1 text-left"
                    />
                  </div>
                  <div className="paper-contact-line">
                    <span className="contact-icon-circle phone">📞</span>
                    <input
                      name="phoneContact"
                      value={phoneContact}
                      onChange={(e) => setPhoneContact(e.target.value)}
                      placeholder="เบอร์โทรศัพท์ลูกค้า"
                      className="paper-input-underline flex-1 text-left"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Shapes + Printer (left) & Stamp Boxes (right, spanning 2 rows) */}
          <div className="paper-middle-grid-2row">
            {/* Shapes */}
            <div className="paper-shapes-group">
              {[
                { name: 'สี่เหลี่ยมจัตุรัส', icon: 'square' },
                { name: 'สี่เหลี่ยมแนวตั้ง', icon: 'tall' },
                { name: 'สี่เหลี่ยมแนวนอน', icon: 'wide' },
                { name: 'วงกลม', icon: 'circle' },
                { name: 'สามเหลี่ยม', icon: 'triangle' },
              ].map((s) => {
                const isChecked = shapes.includes(s.name);
                return (
                  <label className={`paper-shape-item ${isChecked ? 'active' : ''}`} key={s.name} title={s.name}>
                    <input
                      type="checkbox"
                      name="shapes"
                      value={s.name}
                      checked={isChecked}
                      onChange={() => handleCheckboxToggle(shapes, setShapes, s.name)}
                    />
                    <div className="shape-wrapper">
                      {s.icon === 'square' && <div className="shape-svg square" />}
                      {s.icon === 'tall' && <div className="shape-svg tall" />}
                      {s.icon === 'wide' && <div className="shape-svg wide" />}
                      {s.icon === 'circle' && <div className="shape-svg circle" />}
                      {s.icon === 'triangle' && (
                        <svg width="15" height="15" viewBox="0 0 16 16" className="shape-svg triangle">
                          <polygon points="8,2 15,14 1,14" fill="none" stroke="#000" strokeWidth="1.4" />
                        </svg>
                      )}
                      {isChecked && <span className="shape-red-check">✓</span>}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Stamp 1: ลงทะเบียน */}
            <div className="paper-stamp-box stamp-tall" title="ลงทะเบียน">
              <span className="stamp-label-top">ลงทะเบียน</span>
            </div>

            {/* Stamp 2: รับแล้ว */}
            <div className="paper-stamp-box stamp-tall" title="รับแล้ว">
              <span className="stamp-label-top">รับแล้ว</span>
            </div>

            {/* Printer row (under shapes, left column) */}
            <div className="paper-printer-row-inner">
              <span className="paper-printer-badge">เครื่องพิมพ์</span>
              {['GZ', 'Epson', 'Fuji'].map((p) => (
                <label className={`paper-check-item ${printers.includes(p) ? 'checked' : ''}`} key={p}>
                  <input
                    type="checkbox"
                    name="printers"
                    value={p}
                    checked={printers.includes(p)}
                    onChange={() => handleCheckboxToggle(printers, setPrinters, p)}
                  />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ROW 4: วัสดุ (Materials Grid Matching Image 4) */}
          <div className="paper-category-block">
            <div className="cat-badge-wrap">
              <span className="cat-badge">วัสดุ</span>
            </div>
            <div className="cat-content-grid col-4">
              {/* Column 1: Vinyl + Stickers list on the left */}
              <div className="cat-col col-1">
                <label className={`paper-check-item ${materials.includes('ไวนิล') ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    name="materials"
                    value="ไวนิล"
                    checked={materials.includes('ไวนิล')}
                    onChange={() => handleCheckboxToggle(materials, setMaterials, 'ไวนิล')}
                  />
                  <span>ไวนิล</span>
                </label>
                {['สติกเกอร์-ขาว', 'สติกเกอร์-ใส', 'สติกเกอร์-ด้าน', 'สติกเกอร์-ฝ้า'].map((s) => (
                  <label className={`paper-check-item ${materials.includes(s) ? 'checked' : ''}`} key={s}>
                    <input
                      type="checkbox"
                      name="materials"
                      value={s}
                      checked={materials.includes(s)}
                      onChange={() => handleCheckboxToggle(materials, setMaterials, s)}
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>

              {/* Column 2: Vinyl sub-options (grey border box) + Sticker custom color underneath */}
              <div className="cat-col col-2">
                <div className="vinyl-sub-frame-box">
                  <div className="vinyl-sub-grid">
                    <label className={`paper-check-item mini ${materials.includes('ไวนิล หลังดำ') ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        name="materials"
                        value="ไวนิล หลังดำ"
                        checked={materials.includes('ไวนิล หลังดำ')}
                        onChange={() => handleCheckboxToggle(materials, setMaterials, 'ไวนิล หลังดำ')}
                      />
                      <span>หลังดำ</span>
                    </label>
                    <label className={`paper-check-item mini ${materials.includes('ไวนิล หลังขาว') ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        name="materials"
                        value="ไวนิล หลังขาว"
                        checked={materials.includes('ไวนิล หลังขาว')}
                        onChange={() => handleCheckboxToggle(materials, setMaterials, 'ไวนิล หลังขาว')}
                      />
                      <span>หลังขาว</span>
                    </label>
                    <label className={`paper-check-item mini ${materials.includes('ไวนิล ภายนอก') ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        name="materials"
                        value="ไวนิล ภายนอก"
                        checked={materials.includes('ไวนิล ภายนอก')}
                        onChange={() => handleCheckboxToggle(materials, setMaterials, 'ไวนิล ภายนอก')}
                      />
                      <span>ภายนอก</span>
                    </label>
                    <label className={`paper-check-item mini ${materials.includes('ไวนิล ภายใน') ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        name="materials"
                        value="ไวนิล ภายใน"
                        checked={materials.includes('ไวนิล ภายใน')}
                        onChange={() => handleCheckboxToggle(materials, setMaterials, 'ไวนิล ภายใน')}
                      />
                      <span>ภายใน</span>
                    </label>
                    <label className={`paper-check-item mini ${materials.includes('ไวนิล UV') ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        name="materials"
                        value="ไวนิล UV"
                        checked={materials.includes('ไวนิล UV')}
                        onChange={() => handleCheckboxToggle(materials, setMaterials, 'ไวนิล UV')}
                      />
                      <span>UV</span>
                    </label>
                  </div>
                </div>

                <div className="custom-material-line">
                  <label className={`paper-check-item ${materials.includes('สติกเกอร์ตัดสี') ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      name="materials"
                      value="สติกเกอร์ตัดสี"
                      checked={materials.includes('สติกเกอร์ตัดสี')}
                      onChange={() => handleCheckboxToggle(materials, setMaterials, 'สติกเกอร์ตัดสี')}
                    />
                    <span>สติกเกอร์ตัดสี...</span>
                  </label>
                  <input
                    name="customMaterial"
                    value={customMaterial}
                    onChange={(e) => setCustomMaterial(e.target.value)}
                    placeholder="ระบุสี"
                    className="paper-input-mini"
                  />
                </div>
              </div>

              {/* Column 3: Paper & Film */}
              <div className="cat-col col-3">
                {['กระดาษ', 'แบล็คลิสฟิล์ม', 'พีพี', 'ซีทรู', 'แคนวาส'].map((m) => (
                  <label className={`paper-check-item ${materials.includes(m) ? 'checked' : ''}`} key={m}>
                    <input
                      type="checkbox"
                      name="materials"
                      value={m}
                      checked={materials.includes(m)}
                      onChange={() => handleCheckboxToggle(materials, setMaterials, m)}
                    />
                    <span>{m}</span>
                  </label>
                ))}
              </div>

              {/* Column 4: Sheets & Digital */}
              <div className="cat-col col-4">
                {['สติกเกอร์ขาว PVC A3+', 'สติกเกอร์ใส PVC A3+', 'กระดาษอาร์ตมัน A3+', 'กระดาษอาร์ตมันบาง A4', 'เคลือบแข็ง'].map((s) => (
                  <label className={`paper-check-item ${materials.includes(s) ? 'checked' : ''}`} key={s}>
                    <input
                      type="checkbox"
                      name="materials"
                      value={s}
                      checked={materials.includes(s)}
                      onChange={() => handleCheckboxToggle(materials, setMaterials, s)}
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 5: ประเภท (Types / Boards) */}
          <div className="paper-category-block">
            <div className="cat-badge-wrap">
              <span className="cat-badge">ประเภท</span>
            </div>
            <div className="cat-content-grid col-4">
              {/* Column 1: Boards & Flat */}
              <div className="cat-col col-1">
                <label className={`paper-check-item ${boardTypes.some(b => b.includes('ฟิวเจอร์บอร์ด')) ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={boardTypes.some(b => b.includes('ฟิวเจอร์บอร์ด'))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setBoardTypes([...boardTypes, 'ฟิวเจอร์บอร์ด']);
                      } else {
                        setBoardTypes(boardTypes.filter(b => !b.includes('ฟิวเจอร์บอร์ด')));
                      }
                    }}
                  />
                  <span>ฟิวเจอร์บอร์ด</span>
                </label>
                {['โฟมบอร์ด', 'อะคริลิค', 'พลาสวูด', 'คอมโพสิต'].map((b) => (
                  <label className={`paper-check-item ${boardTypes.includes(b) ? 'checked' : ''}`} key={b}>
                    <input
                      type="checkbox"
                      name="boardTypes"
                      value={b}
                      checked={boardTypes.includes(b)}
                      onChange={() => handleCheckboxToggle(boardTypes, setBoardTypes, b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>

              {/* Column 2: Thickness Matrix inside Grey Box */}
              <div className="cat-col col-2 thickness-matrix-col">
                {boardWarning && (
                  <div className="board-inline-warning">
                    <AlertCircle size={13} />
                    <span>{boardWarning}</span>
                  </div>
                )}
                <div className="thickness-matrix-box">
                  <div className="thickness-matrix">
                    {[
                      ['1 มิล', '10 มิล'],
                      ['1.5 มิล', '15 มิล'],
                      ['2 มิล', '20 มิล'],
                      ['3 มิล', '25 มิล'],
                      ['5 มิล', '30 มิล'],
                    ].map(([t1, t2]) => {
                      const isChecked1 = boardTypes.some((b) => b.endsWith(t1));
                      const isChecked2 = boardTypes.some((b) => b.endsWith(t2));
                      return (
                        <div className="thick-row" key={`${t1}-${t2}`}>
                          <div
                            className={`paper-check-item mini pill-box ${isChecked1 ? 'checked' : ''} ${!activeSelectedBoard ? 'needs-board' : ''}`}
                            onClick={() => handleThicknessClick(t1)}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked1}
                              readOnly
                            />
                            <span>{t1}</span>
                          </div>
                          <div
                            className={`paper-check-item mini pill-box ${isChecked2 ? 'checked' : ''} ${!activeSelectedBoard ? 'needs-board' : ''}`}
                            onClick={() => handleThicknessClick(t2)}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked2}
                              readOnly
                            />
                            <span>{t2}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Column 3: Structures */}
              <div className="cat-col col-3">
                {['โครงไม้', 'โครงเหล็ก', 'ขาธงญี่ปุ่น', 'สแตนเลส', 'แผ่นเหล็ก'].map((b) => (
                  <label className={`paper-check-item ${boardTypes.includes(b) ? 'checked' : ''}`} key={b}>
                    <input
                      type="checkbox"
                      name="boardTypes"
                      value={b}
                      checked={boardTypes.includes(b)}
                      onChange={() => handleCheckboxToggle(boardTypes, setBoardTypes, b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>

              {/* Column 4: Displays & 3D */}
              <div className="cat-col col-4">
                {['X Stand', 'Roll Up', 'กล่องไฟ', '3D', 'ซิงค์'].map((b) => (
                  <label className={`paper-check-item ${boardTypes.includes(b) ? 'checked' : ''}`} key={b}>
                    <input
                      type="checkbox"
                      name="boardTypes"
                      value={b}
                      checked={boardTypes.includes(b)}
                      onChange={() => handleCheckboxToggle(boardTypes, setBoardTypes, b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 6: ประกอบงาน (Finishing Matching Image 3) */}
          <div className="paper-category-block">
            <div className="cat-badge-wrap">
              <span className="cat-badge">ประกอบงาน</span>
            </div>
            <div className="cat-content-grid col-3">
              {/* Col 1 */}
              <div className="cat-col">
                {['พับขอบ + เจาะรู', 'พับขอบอย่างเดียว', 'เจาะรู ไม่พับขอบ'].map((f) => (
                  <label className={`paper-check-item ${finishing.includes(f) ? 'checked' : ''}`} key={f}>
                    <input
                      type="checkbox"
                      name="finishing"
                      value={f}
                      checked={finishing.includes(f)}
                      onChange={() => handleCheckboxToggle(finishing, setFinishing, f)}
                    />
                    <span>{f}</span>
                  </label>
                ))}
                <div className="paper-tube-nested">
                  <label className={`paper-check-item ${finishing.some((f) => f.startsWith('สอดท่อ')) ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={finishing.some((f) => f.startsWith('สอดท่อ'))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          if (!finishing.some((f) => f.startsWith('สอดท่อ'))) {
                            setFinishing([...finishing, 'สอดท่อ บน', 'สอดท่อ ล่าง']);
                          }
                        } else {
                          setFinishing(finishing.filter((f) => !f.startsWith('สอดท่อ')));
                        }
                      }}
                    />
                    <span>สอดท่อ</span>
                  </label>
                  <div className="tube-dir-boxes">
                    {['บน', 'ล่าง', 'ซ้าย', 'ขวา'].map((dir) => {
                      const val = `สอดท่อ ${dir}`;
                      const isChecked = finishing.includes(val);
                      return (
                        <button
                          type="button"
                          className={`tube-box-btn ${isChecked ? 'active' : ''}`}
                          key={dir}
                          onClick={() => {
                            handleCheckboxToggle(finishing, setFinishing, val);
                          }}
                        >
                          {dir}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className={`paper-check-item ${finishing.includes('ติดตั้ง') ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    name="finishing"
                    value="ติดตั้ง"
                    checked={finishing.includes('ติดตั้ง')}
                    onChange={() => handleCheckboxToggle(finishing, setFinishing, 'ติดตั้ง')}
                  />
                  <span>ติดตั้ง</span>
                </label>
              </div>

              {/* Col 2 */}
              <div className="cat-col">
                <label className={`paper-check-item ${finishing.includes('ประกบ หน้า-หลัง') ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    name="finishing"
                    value="ประกบ หน้า-หลัง"
                    checked={finishing.includes('ประกบ หน้า-หลัง')}
                    onChange={() => handleCheckboxToggle(finishing, setFinishing, 'ประกบ หน้า-หลัง')}
                  />
                  <span>ประกบ หน้า-หลัง</span>
                </label>
                <div className="diecut-row">
                  {['ไดคัทมือ', 'ไดคัทเครื่อง'].map((d) => (
                    <label className={`paper-check-item mini ${finishing.includes(d) ? 'checked' : ''}`} key={d}>
                      <input
                        type="checkbox"
                        name="finishing"
                        value={d}
                        checked={finishing.includes(d)}
                        onChange={() => handleCheckboxToggle(finishing, setFinishing, d)}
                      />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
                <label className={`paper-check-item ${finishing.includes('ตัดเสมองาน') ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    name="finishing"
                    value="ตัดเสมองาน"
                    checked={finishing.includes('ตัดเสมองาน')}
                    onChange={() => handleCheckboxToggle(finishing, setFinishing, 'ตัดเสมองาน')}
                  />
                  <span>ตัดเสมองาน</span>
                </label>
                <div className="diecut-row">
                  {['เคลือบใส', 'เคลือบด้าน'].map((c) => (
                    <label className={`paper-check-item mini ${finishing.includes(c) ? 'checked' : ''}`} key={c}>
                      <input
                        type="checkbox"
                        name="finishing"
                        value={c}
                        checked={finishing.includes(c)}
                        onChange={() => handleCheckboxToggle(finishing, setFinishing, c)}
                      />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
                <label className={`paper-check-item ${finishing.includes('ไม่ทำอะไรเลย') ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    name="finishing"
                    value="ไม่ทำอะไรเลย"
                    checked={finishing.includes('ไม่ทำอะไรเลย')}
                    onChange={() => handleCheckboxToggle(finishing, setFinishing, 'ไม่ทำอะไรเลย')}
                  />
                  <span>ไม่ทำอะไรเลย</span>
                </label>
              </div>

              {/* Col 3 */}
              <div className="cat-col">
                {['ม้วนใส่โรล', 'หุ้มกันลาย', 'หุ้มกันกระแทก', 'วัสดุ ( ของลูกค้า )'].map((f) => (
                  <label className={`paper-check-item ${finishing.includes(f) ? 'checked' : ''}`} key={f}>
                    <input
                      type="checkbox"
                      name="finishing"
                      value={f}
                      checked={finishing.includes(f)}
                      onChange={() => handleCheckboxToggle(finishing, setFinishing, f)}
                    />
                    <span>{f}</span>
                  </label>
                ))}
                <div className="custom-finishing-line">
                  <span>ระบุ</span>
                  <input
                    name="customFinishing"
                    value={customFinishing}
                    onChange={(e) => setCustomFinishing(e.target.value)}
                    placeholder="ข้อกำหนดเพิ่มเติม..."
                    className="paper-input-mini flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ROW 7: รายละเอียดเพิ่มเติม (Notes - Large Box) */}
          <div className="paper-notes-section">
            <span className="notes-heading-label">รายละเอียดเพิ่มเติม</span>
            <textarea
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ระบุรายละเอียดเพิ่มเติม หรือข้อกำชับช่างผลิต..."
              className="paper-notes-textarea"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Dispatch Settings, Sticky Financial Calculation & Live Preview */}
      <aside className="workbench-preview-sidebar">
        {/* Top Right Dispatch Settings Card (ความสำคัญ & มอบหมาย Graphic) */}
        <div className="wb-dispatch-card">
          <div className="dispatch-header">
            <Zap size={15} />
            <span>การจัดการใบงาน</span>
          </div>
          <div className="dispatch-grid">
            <div className="dispatch-item">
              <span className="dispatch-label">ความสำคัญ:</span>
              <select
                name="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="wb-select dispatch-select"
              >
                <option value="NORMAL">ปกติ</option>
                <option value="URGENT">ด่วน</option>
                <option value="VERY_URGENT">ด่วนพิเศษ</option>
                <option value="NOON">รับเที่ยง</option>
                <option value="EVENING">รับเย็น</option>
              </select>
            </div>
            <div className="dispatch-item">
              <span className="dispatch-label">มอบหมาย Graphic:</span>
              <select
                name="graphicId"
                value={graphicId}
                onChange={(e) => setGraphicId(e.target.value)}
                className="wb-select dispatch-select"
              >
                <option value="">-- เลือก Graphic --</option>
                {graphics.map((g) => (
                  <option value={g.id} key={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="wb-preview-card">
          <div className="wb-preview-header">
            <div className="preview-heading-wrap">
              <span className="live-sparkle-pill"><Sparkles size={12} /> Live Preview</span>
              <h3>พรีวิวใบรับงาน</h3>
            </div>
            <div className="preview-header-right">
              {nextJobNumber && <span className="preview-job-num-tag">#{nextJobNumber}</span>}
              {priority !== 'NORMAL' && (
                <span className={`preview-priority-badge ${
                  priority === 'VERY_URGENT' ? 'very-urgent' :
                  priority === 'URGENT' ? 'urgent' :
                  priority === 'NOON' ? 'noon' : 'evening'
                }`}>
                  {priority === 'VERY_URGENT' ? 'ด่วนพิเศษ' :
                   priority === 'URGENT' ? 'ด่วน' :
                   priority === 'NOON' ? 'รับเที่ยง' :
                   priority === 'EVENING' ? 'รับเย็น' : priority}
                </span>
              )}
            </div>
          </div>



          {/* Live Content Body */}
          <div className="wb-preview-body">
            <div className="preview-job-info">
              <h4 className="job-name-display">{title || 'ระบุชื่องาน...'}</h4>
              <p className="job-customer-display">
                ลูกค้า: <strong>{selectedCustomer?.name || 'ยังไม่ได้เลือกลูกค้า'}</strong>
                {selectedCustomer?.phone && <span className="customer-phone-tag">({selectedCustomer.phone})</span>}
              </p>
            </div>

            <div className="preview-table-grid">
              <div className="spec-item">
                <span>ขนาด:</span>
                <strong>{dimensions || '-'}</strong>
              </div>
              <div className="spec-item">
                <span>จำนวน:</span>
                <strong>{quantity} ชิ้น</strong>
              </div>
              <div className="spec-item">
                <span>แบบ:</span>
                <span className="badge blue mini">{designCondition}</span>
              </div>
              <div className="spec-item">
                <span>ช่องทาง:</span>
                <span className="badge gray mini">{contactChannel}</span>
              </div>
            </div>

            {/* Financial Highlight */}
            <div className="preview-finance-card">
              <div className="fin-line-row">
                <span>ยอดรวมสุทธิ:</span>
                <strong className="text-red">฿{calculatedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
              </div>
              <div className="fin-line-row muted">
                <span>มัดจำ ({depositMethod === 'CASH' ? 'เงินสด' : 'โอน'}):</span>
                <span>฿{depositBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="fin-line-row remaining-border">
                <span>คงเหลือ ({remainingMethod === 'CASH' ? 'เงินสด' : 'โอน'}):</span>
                <strong className={calculatedRemaining > 0 ? 'text-red' : 'text-green'}>
                  ฿{calculatedRemaining.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Selected Spec Badges Preview */}
            <div className="preview-badges-box">
              {graphicId && (
                <span className="badge purple mini">
                  🎨 {graphics.find((g) => g.id === graphicId)?.name}
                </span>
              )}
              {printers.map((p) => <span key={p} className="badge red mini">{p}</span>)}
              {materials.map((m) => <span key={m} className="badge gray mini">{m}</span>)}
              {boardTypes.map((b) => <span key={b} className="badge amber mini">{b}</span>)}
              {finishing.map((f) => <span key={f} className="badge cyan mini">{f}</span>)}
              {shapes.map((s) => <span key={s} className="badge blue mini">{s}</span>)}
            </div>

            {notes && (
              <div className="preview-notes-callout">
                <small>หมายเหตุ:</small>
                <p>{notes}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="wb-preview-actions">
            <button
              className="primary-button full-width save-action-btn"
              disabled={pending}
              type="submit"
            >
              <Send size={16} />
              <span>{pending ? 'กำลังบันทึกใบรับงาน…' : 'บันทึกใบรับงาน'}</span>
            </button>
            <Link href="/jobs" className="secondary-button full-width cancel-action-btn">
              ยกเลิก
            </Link>
          </div>
        </div>
      </aside>
    </form>

    {/* Quick Add Customer Modal */}
    <CustomerModal
      isOpen={isCustomerModalOpen}
      onClose={() => setIsCustomerModalOpen(false)}
      onSuccess={(newCust) => {
        setCustomerList((prev) => [newCust, ...prev]);
        setCustomerId(newCust.id);
        setCustomerSearchQuery(newCust.name);
        if (newCust.phone) {
          setPhoneContact(newCust.phone);
        }
      }}
    />
  </>
  );
}
