'use client';

import { useActionState, useState, useRef, useEffect, type ChangeEvent } from 'react';
import Link from 'next/link';
import {
  Calendar, Check, CheckSquare, ChevronDown, Circle, DollarSign, FileText, Image as ImageIcon,
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
  const [receiverName, setReceiverName] = useState<string>(currentProfileName || 'Admin');
  const [customerId, setCustomerId] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState<string>('');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const dimensions = width && height ? `${width} × ${height}` : (width || height || '');
  const [quantity, setQuantity] = useState<number>(1);

  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [installCost, setInstallCost] = useState<number>(0);
  const [installLocation, setInstallLocation] = useState<string>('');
  const [depositBaht, setDepositBaht] = useState<number>(0);
  const [depositMethod, setDepositMethod] = useState<string>('BANK_TRANSFER');
  const [remainingMethod, setRemainingMethod] = useState<string>('BANK_TRANSFER');
  const [dueDate, setDueDate] = useState<string>('');
  const [priority, setPriority] = useState<string>('NORMAL');
  const [graphicId, setGraphicId] = useState<string>('');
  const [designCondition, setDesignCondition] = useState<string>('ดูแบบ');
  const [contactChannel, setContactChannel] = useState<string>('LINE OA');
  const [notes, setNotes] = useState<string>('');

  // Spec Checkbox arrays
  const [printers, setPrinters] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [boardTypes, setBoardTypes] = useState<string[]>([]);
  const [finishing, setFinishing] = useState<string[]>([]);
  const [shapes, setShapes] = useState<string[]>([]);
  const [customFinishing, setCustomFinishing] = useState<string>('');

  // Active Tab for Spec Selection
  const [specTab, setSpecTab] = useState<'materials' | 'boards' | 'finishing' | 'extra'>('materials');

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

  const calculatedTotal = (quantity * unitPrice) + installCost;
  const calculatedRemaining = Math.max(0, calculatedTotal - depositBaht);

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
    setIsCustomerDropdownOpen(false);
  };

  return (
    <form action={action} className="job-order-workbench">
      {state.error ? <div className="form-error-banner span-all">{state.error}</div> : null}

      {/* LEFT COLUMN: Main Form Area */}
      <div className="workbench-main">
        {/* CARD 1: ข้อมูลหลัก & ผู้รับงาน */}
        <div className="wb-card">
          <div className="wb-card-header">
            <div className="header-title-flex">
              <FileText size={18} />
              <h3>ข้อมูลหลักและลูกค้า (Job Information)</h3>
            </div>
            {nextJobNumber && (
              <div className="next-job-badge">
                <span className="badge-label">เลขที่งาน (Auto):</span>
                <strong className="badge-code">{nextJobNumber}</strong>
              </div>
            )}
          </div>

          <div className="wb-form-grid">
            {/* Row 1: ผู้รับงาน (Auto user admin) & ลูกค้า (Searchable Combobox) */}
            <div className="grid-row-2">
              <label>
                <span className="field-label">
                  ผู้รับงาน (แอดมิน/ผู้สร้างใบงาน)
                  <UserCheck size={14} className="user-check-icon" />
                </span>
                <div className="input-with-icon-wrap">
                  <input
                    name="receiverName"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="ชื่อผู้รับงาน"
                    className="wb-input highlighted-user-input"
                    required
                  />
                </div>
              </label>

              {/* Searchable Customer Picker */}
              <div className="searchable-customer-container" ref={dropdownRef}>
                <label>
                  <span className="field-label">ลูกค้า <b className="req">*</b> (ค้นหาชื่อ / เบอร์โทร)</span>
                  <div className="customer-search-input-wrap">
                    <Search size={16} className="search-icon-inside" />
                    <input
                      type="text"
                      placeholder="พิมพ์เพื่อค้นหาลูกค้า..."
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setIsCustomerDropdownOpen(true);
                      }}
                      onFocus={() => setIsCustomerDropdownOpen(true)}
                      className="wb-input customer-search-input"
                    />
                    <ChevronDown size={16} className="dropdown-arrow-icon" onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)} />
                  </div>
                </label>

                {/* Hidden input for form action */}
                <input type="hidden" name="customerId" value={customerId} required />

                {/* Dropdown menu */}
                {isCustomerDropdownOpen && (
                  <div className="customer-dropdown-menu">
                    <div className="customer-dropdown-list">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            className={`customer-option-row ${customerId === c.id ? 'active' : ''}`}
                            onClick={() => selectCustomer(c)}
                          >
                            <div className="c-info">
                              <strong className="c-name">{c.name}</strong>
                              {c.phone && <span className="c-phone"><Phone size={12} /> {c.phone}</span>}
                            </div>
                            {customerId === c.id && <Check size={15} className="c-check" />}
                          </div>
                        ))
                      ) : (
                        <div className="customer-not-found">
                          <span>ไม่พบข้อมูลลูกค้า &ldquo;{customerSearchQuery}&rdquo;</span>
                        </div>
                      )}
                    </div>
                    <div className="customer-dropdown-footer">
                      <button
                        type="button"
                        className="add-new-customer-link-btn"
                        onClick={() => {
                          setIsCustomerDropdownOpen(false);
                          setIsCustomerModalOpen(true);
                        }}
                      >
                        <Plus size={15} />
                        <span>เพิ่มลูกค้าใหม่</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: ชื่องาน (Full Width) */}
            <div className="grid-row-1">
              <label>
                <span className="field-label">ชื่องาน <b className="req">*</b></span>
                <input
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น ป้ายไวนิลหน้าร้าน, สติกเกอร์ติดกระจกอาคาร, ป้ายกล่องไฟ"
                  required
                  className="wb-input"
                />
              </label>
            </div>

            {/* Row 3: ขนาด (กว้าง/สูง แยกช่อง), จำนวน, ราคา, ค่าแรง */}
            <div className="grid-row-5">
              <label>
                <span className="field-label">ความกว้าง</span>
                <input
                  name="width"
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  placeholder="เช่น 1.2 ม., 80 cm"
                  className="wb-input"
                />
              </label>
              <label>
                <span className="field-label">ความสูง / ยาว</span>
                <input
                  name="height"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="เช่น 2.4 ม., 120 cm"
                  className="wb-input"
                />
              </label>
              <input type="hidden" name="dimensions" value={dimensions} />
              <label>
                <span className="field-label">จำนวน (ชิ้น) <b className="req">*</b></span>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  required
                  className="wb-input"
                />
              </label>
              <label>
                <span className="field-label">ราคา/ชิ้น (บาท)</span>
                <input
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="wb-input"
                />
              </label>
              <label>
                <span className="field-label">ค่าติดตั้ง (บาท)</span>
                <input
                  name="installCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={installCost}
                  onChange={(e) => setInstallCost(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="wb-input"
                />
              </label>
            </div>

            {/* Row 4: วันที่เปิด ส่งงาน ความสำคัญ กราฟิก */}
            <div className="grid-row-4">
              <label>
                <span className="field-label">วันที่เปิดใบงาน</span>
                <input
                  type="date"
                  name="openedDate"
                  value={openedDate}
                  onChange={(e) => setOpenedDate(e.target.value)}
                  className="wb-input"
                />
              </label>
              <label>
                <span className="field-label">วันที่ส่งงาน / นัดรับ</span>
                <input
                  type="date"
                  name="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="wb-input"
                />
              </label>
              <label>
                <span className="field-label">ความสำคัญ</span>
                <select
                  name="priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="wb-select"
                >
                  <option value="NORMAL">ปกติ</option>
                  <option value="URGENT">ด่วน</option>
                  <option value="VERY_URGENT">ด่วนพิเศษ</option>
                  <option value="NOON">รับเที่ยง</option>
                  <option value="EVENING">รับเย็น</option>
                </select>
              </label>
              <label>
                <span className="field-label">มอบหมาย Graphic</span>
                <select
                  name="graphicId"
                  value={graphicId}
                  onChange={(e) => setGraphicId(e.target.value)}
                  className="wb-select"
                >
                  <option value="">-- ยังไม่ระบุ --</option>
                  {graphics.map((g) => (
                    <option value={g.id} key={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* CARD 2: สเปกการผลิต & ตัวเลือก (Tabbed System) */}
        <div className="wb-card">

          <div className="wb-card-header">
            <Printer size={18} />
            <h3>สเปกการผลิตและตัวเลือก (Production Specs)</h3>
          </div>

          {/* Quick Choice Rows: Printer / Condition / Shape / Channel */}
          <div className="wb-quick-section">
            <div className="quick-row">
              <span className="quick-title">เครื่องพิมพ์:</span>
              <div className="pills-wrapper">
                {['GZ', 'Epson', 'Fuji'].map((p) => (
                  <label className={`choice-pill ${printers.includes(p) ? 'selected red' : ''}`} key={p}>
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

            <div className="quick-row">
              <span className="quick-title">สถานะแบบ:</span>
              <div className="pills-wrapper">
                {['ดูแบบ', 'ไม่ดูแบบ', 'มีแบบ'].map((cond) => (
                  <label className={`choice-pill ${designCondition === cond ? 'selected blue' : ''}`} key={cond}>
                    <input
                      type="radio"
                      name="designCondition"
                      value={cond}
                      checked={designCondition === cond}
                      onChange={() => setDesignCondition(cond)}
                    />
                    <span>{cond}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="quick-row">
              <span className="quick-title">รูปทรงงาน:</span>
              <div className="pills-wrapper">
                {[
                  { v: 'สี่เหลี่ยมจัตุรัส', l: 'สี่เหลี่ยม', icon: Square },
                  { v: 'สี่เหลี่ยมแนวตั้ง', l: 'แนวตั้ง', icon: RectangleVertical },
                  { v: 'สี่เหลี่ยมแนวนอน', l: 'แนวนอน', icon: RectangleHorizontal },
                  { v: 'วงกลม', l: 'วงกลม', icon: Circle },
                  { v: 'สามเหลี่ยม', l: 'สามเหลี่ยม', icon: Triangle },
                ].map((s) => {
                  const ShapeIcon = s.icon;
                  return (
                    <label className={`choice-pill ${shapes.includes(s.v) ? 'selected dark' : ''}`} key={s.v}>
                      <input
                        type="checkbox"
                        name="shapes"
                        value={s.v}
                        checked={shapes.includes(s.v)}
                        onChange={() => handleCheckboxToggle(shapes, setShapes, s.v)}
                      />
                      <ShapeIcon size={14} />
                      <span>{s.l}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="quick-row">
              <span className="quick-title">ช่องทางติดต่อ:</span>
              <div className="pills-wrapper">
                {['LINE 1', 'LINE 2', 'LINE 3', 'LINE OA', 'Facebook', 'เบอร์โทร'].map((ch) => (
                  <label className={`choice-pill ${contactChannel === ch ? 'selected green' : ''}`} key={ch}>
                    <input
                      type="radio"
                      name="contactChannel"
                      value={ch}
                      checked={contactChannel === ch}
                      onChange={() => setContactChannel(ch)}
                    />
                    <span>{ch}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sub-Tabs Selector */}
          <div className="wb-tabs-bar">
            <button
              type="button"
              className={`wb-tab-btn ${specTab === 'materials' ? 'active' : ''}`}
              onClick={() => setSpecTab('materials')}
            >
              <Package size={16} />
              <span>1. วัสดุ (Materials)</span>
              {materials.length > 0 && <span className="tab-counter">{materials.length}</span>}
            </button>
            <button
              type="button"
              className={`wb-tab-btn ${specTab === 'boards' ? 'active' : ''}`}
              onClick={() => setSpecTab('boards')}
            >
              <Layers size={16} />
              <span>2. โครงสร้าง / บอร์ด</span>
              {boardTypes.length > 0 && <span className="tab-counter">{boardTypes.length}</span>}
            </button>
            <button
              type="button"
              className={`wb-tab-btn ${specTab === 'finishing' ? 'active' : ''}`}
              onClick={() => setSpecTab('finishing')}
            >
              <Scissors size={16} />
              <span>3. ประกอบงาน (Finishing)</span>
              {finishing.length > 0 && <span className="tab-counter">{finishing.length}</span>}
            </button>
            <button
              type="button"
              className={`wb-tab-btn ${specTab === 'extra' ? 'active' : ''}`}
              onClick={() => setSpecTab('extra')}
            >
              <ImageIcon size={16} />
              <span>4. รูปตัวอย่าง & อื่นๆ</span>
              {imagePreview && <span className="tab-counter">1</span>}
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="wb-tab-content-panel">
            {/* TAB 1: วัสดุ */}
            {specTab === 'materials' && (
              <div className="tab-cols-4">
                <div className="sub-category-box">
                  <h4 className="sub-cat-title">ไวนิล</h4>
                  <div className="sub-cat-list">
                    {['ไวนิล หลังดำ', 'ไวนิล หลังขาว', 'ไวนิล ภายนอก', 'ไวนิล ภายใน', 'ไวนิล UV'].map((m) => (
                      <label key={m} className="spec-check-item">
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
                </div>

                <div className="sub-category-box">
                  <h4 className="sub-cat-title">สติกเกอร์ & ฟิล์ม</h4>
                  <div className="sub-cat-list">
                    {['สติกเกอร์-ขาว', 'สติกเกอร์-ใส', 'สติกเกอร์-ด้าน', 'สติกเกอร์-ฝ้า', 'สติกเกอร์ตัดสี'].map((m) => (
                      <label key={m} className="spec-check-item">
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
                </div>

                <div className="sub-category-box">
                  <h4 className="sub-cat-title">กระดาษ & ฟิล์มพิเศษ</h4>
                  <div className="sub-cat-list">
                    {['กระดาษ', 'แบล็คลิสฟิล์ม', 'พีพี', 'ซีทรู', 'แคนวาส'].map((m) => (
                      <label key={m} className="spec-check-item">
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
                </div>

                <div className="sub-category-box">
                  <h4 className="sub-cat-title">ชีท & ดิจิทัล</h4>
                  <div className="sub-cat-list">
                    {['สติกเกอร์ขาว PVC A3+', 'สติกเกอร์ใส PVC A3+', 'กระดาษอาร์ตมัน A3+', 'กระดาษอาร์ตมันบาง A4', 'เคลือบแข็ง'].map((m) => (
                      <label key={m} className="spec-check-item">
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
                </div>
              </div>
            )}

            {/* TAB 2: โครงสร้าง / บอร์ด */}
            {specTab === 'boards' && (
              <div className="tab-cols-4">
                {/* Column 1: บอร์ด & แผ่นเรียบ (Left) */}
                <div className="sub-category-box">
                  <h4 className="sub-cat-title">บอร์ด & แผ่นเรียบ</h4>
                  <div className="sub-cat-list">
                    {['โฟมบอร์ด', 'อะคริลิค', 'พลาสวูด', 'คอมโพสิต', 'สแตนเลส', 'แผ่นเหล็ก', 'ซิงค์'].map((b) => (
                      <label key={b} className="spec-check-item">
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

                {/* Column 2 & 3: ฟิวเจอร์บอร์ด (ความหนา) */}
                <div className="sub-category-box span-2">
                  <h4 className="sub-cat-title">ฟิวเจอร์บอร์ด (ความหนา)</h4>
                  <div className="thickness-badges-grid">
                    {['1 มิล', '1.5 มิล', '2 มิล', '3 มิล', '5 มิล', '10 มิล', '15 มิล', '20 มิล', '25 มิล', '30 มิล'].map((t) => {
                      const val = `ฟิวเจอร์บอร์ด ${t}`;
                      const isSelected = boardTypes.includes(val);
                      return (
                        <label key={t} className={`thickness-pill ${isSelected ? 'active' : ''}`}>
                          <input
                            type="checkbox"
                            name="boardTypes"
                            value={val}
                            checked={isSelected}
                            onChange={() => handleCheckboxToggle(boardTypes, setBoardTypes, val)}
                          />
                          <span>{t}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Column 4: โครงสร้าง & ขาตั้ง (Right) */}
                <div className="sub-category-box">
                  <h4 className="sub-cat-title">โครงสร้าง & ขาตั้ง</h4>
                  <div className="sub-cat-list">
                    {['โครงไม้', 'โครงเหล็ก', 'ขาธงญี่ปุ่น', 'X Stand', 'Roll Up', 'กล่องไฟ', '3D'].map((b) => (
                      <label key={b} className="spec-check-item">
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
            )}

            {/* TAB 3: ประกอบงาน */}
            {specTab === 'finishing' && (
              <div className="tab-cols-4">
                <div className="sub-category-box">
                  <h4 className="sub-cat-title">ขอบ & การยึด</h4>
                  <div className="sub-cat-list">
                    {['พับขอบ + เจาะรู', 'พับขอบอย่างเดียว', 'เจาะรู ไม่พับขอบ', 'ติดตั้ง', 'ประกบ หน้า-หลัง'].map((f) => (
                      <label key={f} className="spec-check-item">
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
                  </div>
                </div>

                <div className="sub-category-box">
                  <h4 className="sub-cat-title">สอดท่อ</h4>
                  <div className="sub-cat-list">
                    {['สอดท่อ บน', 'สอดท่อ ล่าง', 'สอดท่อ ซ้าย', 'สอดท่อ ขวา'].map((f) => (
                      <label key={f} className="spec-check-item">
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
                  </div>
                </div>

                <div className="sub-category-box">
                  <h4 className="sub-cat-title">ไดคัท & เคลือบ</h4>
                  <div className="sub-cat-list">
                    {['ไดคัทมือ', 'ไดคัทเครื่อง', 'ตัดเสมองาน', 'เคลือบใส', 'เคลือบด้าน', 'ไม่ทำอะไรเลย'].map((f) => (
                      <label key={f} className="spec-check-item">
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
                  </div>
                </div>

                <div className="sub-category-box">
                  <h4 className="sub-cat-title">บรรจุภัณฑ์ & พิเศษ</h4>
                  <div className="sub-cat-list">
                    {['ม้วนใส่โรล', 'หุ้มกันลาย', 'หุ้มกันกระแทก', 'วัสดุ ( ของลูกค้า )'].map((f) => (
                      <label key={f} className="spec-check-item">
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
                    <div className="custom-input-wrap">
                      <span>ระบุ:</span>
                      <input
                        name="customFinishing"
                        value={customFinishing}
                        onChange={(e) => setCustomFinishing(e.target.value)}
                        placeholder="ระบุข้อกำหนดประกอบงานเพิ่ม"
                        className="wb-input-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: รูปภาพ & หมายเหตุ */}
            {specTab === 'extra' && (
              <div className="tab-cols-2">
                <label className="uploader-drop-card">
                  <input
                    type="file"
                    name="referenceImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                  />
                  <UploadCloud size={32} />
                  <div>
                    <strong>คลิกเพื่อแนบรูปตัวอย่างงาน / หน้างาน</strong>
                    <p>รองรับไฟล์รูปภาพ JPG, PNG, WebP เพื่อดูพรีวิวสดด้านขวา</p>
                  </div>
                </label>

                <label className="notes-card-wrap">
                  <span className="field-label">รายละเอียดเพิ่มเติม / หมายเหตุงาน</span>
                  <textarea
                    name="notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ระบุรายละเอียดเพิ่มเติม กำชับช่างผลิต หรือบันทึกข้อตกลงพิเศษ..."
                    className="wb-textarea"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Sticky Live Preview & Finance Banner */}
      <aside className="workbench-preview-sidebar">
        {/* Real-time Financial Calculation Banner (Top Right) */}
        <div className="wb-finance-banner top-sidebar-finance">
          <div className="wb-fin-box total">
            <span className="fin-title">รวมยอดทั้งหมด</span>
            <strong className="fin-val total-price">
              ฿{calculatedTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </strong>
            <input type="hidden" name="totalBaht" value={calculatedTotal} />
          </div>

          <div className="wb-fin-box deposit">
            <span className="fin-title">ยอดมัดจำ</span>
            <div className="fin-input-combo">
              <input
                name="depositBaht"
                type="number"
                min="0"
                max={calculatedTotal}
                step="0.01"
                value={depositBaht}
                onChange={(e) => setDepositBaht(Math.max(0, parseFloat(e.target.value) || 0))}
                className="wb-input deposit-input"
                placeholder="0.00"
              />
              <select
                name="depositMethod"
                value={depositMethod}
                onChange={(e) => setDepositMethod(e.target.value)}
                className="wb-select deposit-select"
              >
                <option value="BANK_TRANSFER">โอนจ่าย</option>
                <option value="CASH">เงินสด</option>
              </select>
            </div>
          </div>

          <div className="wb-fin-box remaining">
            <span className="fin-title">ยอดคงเหลือ</span>
            <strong className={`fin-val ${calculatedRemaining > 0 ? 'text-red' : 'text-green'}`}>
              ฿{calculatedRemaining.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </strong>
            <div className="fin-radios">
              <label className="radio-label">
                <input
                  type="radio"
                  name="remainingMethod"
                  value="BANK_TRANSFER"
                  checked={remainingMethod === 'BANK_TRANSFER'}
                  onChange={() => setRemainingMethod('BANK_TRANSFER')}
                />
                <span>โอนจ่าย</span>
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="remainingMethod"
                  value="CASH"
                  checked={remainingMethod === 'CASH'}
                  onChange={() => setRemainingMethod('CASH')}
                />
                <span>เงินสด</span>
              </label>
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


          {/* Reference Image Container */}
          <div className="wb-image-preview-area">
            {imagePreview ? (
              <div className="preview-image-active">
                <img src={imagePreview} alt="Reference Preview" />
                <button
                  type="button"
                  className="remove-img-btn"
                  onClick={removeImage}
                  title="ลบรูปภาพ"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <label className="preview-image-empty">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                />
                <ImageIcon size={32} />
                <span>คลิกเพื่อแนบรูปตัวอย่างงาน</span>
                <small>แสดงพรีวิวภาพจริงตรงนี้ทันที</small>
              </label>
            )}
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
              <Send size={18} />
              <span>{pending ? 'กำลังบันทึกใบรับงาน…' : 'บันทึกใบรับงาน'}</span>
            </button>
            <Link href="/jobs" className="secondary-button full-width cancel-action-btn">
              ยกเลิก
            </Link>
          </div>
        </div>
      </aside>

      {/* Quick Add Customer Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSuccess={(newCust) => {
          setCustomerList((prev) => [newCust, ...prev]);
          setCustomerId(newCust.id);
          setCustomerSearchQuery(newCust.name);
        }}
      />
    </form>
  );
}
