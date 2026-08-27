import Link from 'next/link';
import { ExternalLink, MessageSquare, Phone, Printer } from 'lucide-react';

export type JobOrderSpec = {
  receiverName?: string;
  title?: string;
  dimensions?: string;
  width?: string;
  height?: string;
  quantity?: number;
  unitPrice?: number;
  installCost?: number;
  installLocation?: string;
  totalBaht?: number;
  depositBaht?: number;
  depositMethod?: string;
  remainingBaht?: number;
  remainingMethod?: string;
  openedDate?: string;
  dueDate?: string;
  designCondition?: string;
  contactChannel?: string;
  facebookContact?: string;
  lineContact?: string;
  phoneContact?: string;
  shapes?: string[];
  printers?: string[];
  materials?: string[];
  customMaterial?: string;
  boardTypes?: string[];
  finishing?: string[];
  customFinishing?: string;
  notes?: string;
};

export function JobPaperSheet({
  job,
  spec,
  hideToolbar = false,
  printMode = false,
}: {
  job: {
    id: string;
    job_number: string;
    title: string;
    priority: string;
    created_at: string;
    deadline: string | null;
    grand_total_satang: number;
    paid_amount_satang: number;
    customer: { name: string; phone: string | null; line_name: string | null } | null;
    brief: { dimensions: string | null; quantity: number } | null;
  };
  spec: JobOrderSpec;
  hideToolbar?: boolean;
  printMode?: boolean;
}) {
  const shapes = new Set(spec.shapes || []);
  const printers = new Set(spec.printers || []);
  const materials = new Set(spec.materials || []);
  const boardTypes = new Set(spec.boardTypes || []);
  const finishing = new Set(spec.finishing || []);

  const totalBaht = spec.totalBaht ?? job.grand_total_satang / 100;
  const depositBaht = spec.depositBaht ?? job.paid_amount_satang / 100;
  const remainingBaht = spec.remainingBaht ?? Math.max(0, totalBaht - depositBaht);

  const quantity = spec.quantity ?? job.brief?.quantity ?? 1;
  const unitPrice = spec.unitPrice ?? (quantity && totalBaht ? totalBaht / quantity : 0);
  const installCost = spec.installCost ?? 0;
  const installLocation = spec.installLocation || '';

  const receiverName = spec.receiverName || '';
  const designCondition = spec.designCondition || 'ดูแบบ';
  const contactChannel = spec.contactChannel || 'LINE OA';
  const openedDate = spec.openedDate || (job.created_at ? job.created_at.slice(0, 10) : '');
  const dueDate = spec.dueDate || (job.deadline ? job.deadline.slice(0, 10) : '');

  // Dimensions parse
  let width = spec.width || '';
  let height = spec.height || '';
  if (!width && !height && (spec.dimensions || job.brief?.dimensions)) {
    const dim = spec.dimensions || job.brief?.dimensions || '';
    if (dim.includes('×') || dim.includes('x') || dim.includes('*')) {
      const parts = dim.split(/[×x*]/);
      width = parts[0]?.trim() || '';
      height = parts[1]?.trim() || '';
    } else {
      width = dim;
    }
  }

  // Job number parts
  const jobNum = job.job_number || '6908001';
  const jobYear = jobNum.length >= 4 ? jobNum.slice(0, 2) : '69';
  const jobMonth = jobNum.length >= 4 ? jobNum.slice(2, 4) : '08';
  const jobSeq = jobNum.length >= 4 ? jobNum.slice(4) : jobNum;

  const currentPriority = spec.priority || job.priority || '';
  const isUrgent = ['URGENT', 'HIGH', 'VERY_URGENT', 'NOON', 'EVENING', 'ด่วน', 'ด่วนที่สุด', 'ด่วนพิเศษ', 'รับเที่ยง', 'รับเย็น'].includes(currentPriority);
  const urgentLabel = (currentPriority === 'NOON' || currentPriority === 'รับเที่ยง') ? 'รับเที่ยง' :
    ((currentPriority === 'EVENING' || currentPriority === 'รับเย็น') ? 'รับเย็น' :
    ((currentPriority === 'VERY_URGENT' || currentPriority === 'ด่วนพิเศษ') ? 'ด่วนพิเศษ' : 'ด่วน'));

  const sheetContent = (
    <div
      className={`paper-form-sheet ${printMode ? 'print-mode' : ''}`}
      id={printMode ? 'printable-job-sheet' : undefined}
      style={{ margin: '0 auto', width: '100%' }}
    >
      {/* TOP SECTION: Header Left & Header Right */}
      <div className="paper-top-grid">
            {/* LEFT COLUMN OF PAPER */}
            <div className="paper-header-left">
              {/* Title Badge & Receiver */}
              <div className="paper-row-inline">
                <span className="paper-badge-title">ใบรับงาน</span>
                <div className="paper-field-box inline-receiver">
                  <span className="paper-field-label">ผู้รับงาน</span>
                  <div className="paper-val-display">{receiverName || '-'}</div>
                </div>
              </div>

              {/* Customer Name */}
              <div className="paper-field-box customer-box">
                <span className="paper-field-label">ชื่อลูกค้า</span>
                <div className="paper-val-display bold">{job.customer?.name ?? '-'}</div>
              </div>

              {/* Job Title */}
              <div className="paper-field-box">
                <span className="paper-field-label">ชื่องาน</span>
                <div className="paper-val-display bold">{job.title || '-'}</div>
              </div>

              {/* Dimensions */}
              <div className="paper-line-dotted left-aligned-dim">
                <span className="paper-line-label">ขนาด</span>
                <div className="paper-dim-inputs">
                  <span>กว้าง</span>
                  <span className="dim-val">{width || '-'}</span>
                  <span>× สูง</span>
                  <span className="dim-val">{height || '-'}</span>
                  <span>ซม.</span>
                </div>
              </div>

              {/* Quantity & Unit Price */}
              <div className="paper-line-dotted left-aligned-dim">
                <div className="sub-inline-group">
                  <span className="paper-line-label">จำนวน</span>
                  <span className="num-val bold">{quantity}</span>
                  <span className="paper-unit">ชิ้น</span>
                </div>
                <div className="sub-inline-group">
                  <span className="paper-line-label">ราคา</span>
                  <span className="num-val bold">{unitPrice > 0 ? unitPrice.toLocaleString('th-TH') : '-'}</span>
                  <span className="paper-unit">บาท/ชิ้น</span>
                </div>
              </div>

              {/* Installation Cost & Location */}
              <div className="paper-line-dotted split">
                <div className="sub-inline-group">
                  <span className="paper-line-label">ค่าแรงติดตั้ง</span>
                  <span className="num-val">{installCost > 0 ? installCost.toLocaleString('th-TH') : '-'}</span>
                </div>
                <div className="sub-inline-group flex-1">
                  <span className="paper-line-label">สถานที่ติดตั้ง</span>
                  <span className="text-val flex-1">{installLocation || '-'}</span>
                </div>
              </div>

              {/* Total Baht Box */}
              <div className="paper-box-total">
                <span className="paper-total-label">รวมยอด</span>
                <strong className="paper-total-amount">
                  ฿{totalBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </strong>
              </div>

              {/* Deposit Box */}
              <div className="paper-box-payment">
                <div className="pay-left">
                  <span className="pay-label">มัดจำ</span>
                  <span className="deposit-val-display">
                    {depositBaht > 0 ? `฿${depositBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                  </span>
                </div>
                <div className="pay-methods">
                  <label className="paper-radio-label read-only">
                    <input type="checkbox" checked={spec.depositMethod === 'CASH'} readOnly />
                    <span>เงินสด</span>
                  </label>
                  <label className="paper-radio-label read-only">
                    <input
                      type="checkbox"
                      checked={spec.depositMethod === 'BANK_TRANSFER'}
                      readOnly
                    />
                    <span>โอนจ่าย</span>
                  </label>
                </div>
              </div>

              {/* Remaining Box */}
              <div className="paper-box-payment">
                <div className="pay-left">
                  <span className="pay-label">คงเหลือ</span>
                  <strong className={`remaining-val-display ${remainingBaht > 0 ? 'text-red' : 'text-green'}`}>
                    ฿{remainingBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div className="pay-methods">
                  <label className="paper-radio-label read-only">
                    <input type="checkbox" checked={spec.remainingMethod === 'CASH'} readOnly />
                    <span>เงินสด</span>
                  </label>
                  <label className="paper-radio-label read-only">
                    <input type="checkbox" checked={spec.remainingMethod === 'BANK_TRANSFER'} readOnly />
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
                    <span className="job-num-part year">{jobYear}</span>
                    <span className="job-num-part month">{jobMonth}</span>
                  </div>
                  <span className="job-num-part seq">{jobSeq}</span>
                </div>
                {isUrgent && (
                  <div className="paper-urgent-stamp-badge">
                    {urgentLabel}
                  </div>
                )}
              </div>

              {/* Opened Date */}
              <div className="paper-date-row">
                <p>วันที่เปิดใบงาน</p>
                <div className="paper-date-input-wrap">
                  <div className="date-val-box">{openedDate || '-'}</div>
                </div>
              </div>

              {/* Due Date */}
              <div className="paper-date-row">
                <p>วันที่ส่งงาน</p>
                <div className="paper-date-input-wrap">
                  <div className="date-val-box">{dueDate || '-'}</div>
                </div>
              </div>

              {/* Design Condition Checks */}
              <div className="paper-design-status-checks">
                {['ดูแบบ', 'ไม่ดูแบบ', 'มีแบบ'].map((cond) => (
                  <label className={`paper-check-box-label ${designCondition === cond ? 'checked' : ''}`} key={cond}>
                    <input type="checkbox" checked={designCondition === cond} readOnly />
                    <span>{cond}</span>
                  </label>
                ))}
              </div>

              {/* Contact Channels Section */}
              <div className="paper-channel-section">
                <div className="paper-channel-line-pills">
                  {['LINE 1', 'LINE 2', 'LINE 3', 'LINE OA'].map((ch, idx) => {
                    const badgeText = idx === 3 ? 'OA' : String(idx + 1);
                    return (
                      <div
                        key={ch}
                        className={`paper-ch-pill ${contactChannel === ch ? 'active' : ''}`}
                      >
                        <span className="line-icon-sub">LINE</span>
                        <span className="line-badge-num">{badgeText}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="paper-channel-badge-header">ช่องทางติดต่อลูกค้า</div>

                {/* 3 Contact Input Rows */}
                <div className="paper-contact-inputs-list">
                  <div className="paper-contact-line">
                    <span className="contact-icon-circle fb">
                      <img src="/logo/facebook.png" alt="Facebook" className="contact-circle-img" />
                    </span>
                    <span className="contact-val-text flex-1">{spec.facebookContact || '-'}</span>
                  </div>
                  <div className="paper-contact-line">
                    <span className="contact-icon-circle line">
                      <img src="/logo/line.png" alt="Line" className="contact-circle-img" />
                    </span>
                    <span className="contact-val-text flex-1">{spec.lineContact || job.customer?.line_name || '-'}</span>
                  </div>
                  <div className="paper-contact-line">
                    <span className="contact-icon-circle phone">
                      <img src="/logo/phone.png" alt="Phone" className="contact-circle-img" />
                    </span>
                    <span className="contact-val-text flex-1">{spec.phoneContact || job.customer?.phone || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Shapes + Printer (left) & Stamp Boxes (right) */}
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
                const isChecked = shapes.has(s.name);
                return (
                  <div className={`paper-shape-item ${isChecked ? 'active' : ''}`} key={s.name} title={s.name}>
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
                  </div>
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

            {/* Printer row */}
            <div className="paper-printer-row-inner">
              <span className="paper-printer-badge">เครื่องพิมพ์</span>
              {['GZ', 'Epson', 'Fuji'].map((p) => (
                <label className={`paper-check-item ${printers.has(p) ? 'checked' : ''}`} key={p}>
                  <input type="checkbox" checked={printers.has(p)} readOnly />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ROW 4: วัสดุ (Materials Grid) */}
          <div className="paper-category-block">
            <div className="cat-badge-wrap">
              <span className="cat-badge">วัสดุ</span>
            </div>
            <div className="cat-content-grid col-4">
              {/* Column 1: Vinyl + Stickers */}
              <div className="cat-col col-1">
                <label className={`paper-check-item ${materials.has('ไวนิล') ? 'checked' : ''}`}>
                  <input type="checkbox" checked={materials.has('ไวนิล')} readOnly />
                  <span>ไวนิล</span>
                </label>
                {['สติกเกอร์-ขาว', 'สติกเกอร์-ใส', 'สติกเกอร์-ด้าน', 'สติกเกอร์-ฝ้า'].map((s) => (
                  <label className={`paper-check-item ${materials.has(s) ? 'checked' : ''}`} key={s}>
                    <input type="checkbox" checked={materials.has(s)} readOnly />
                    <span>{s}</span>
                  </label>
                ))}
              </div>

              {/* Column 2: Vinyl sub-options */}
              <div className="cat-col col-2">
                <div className="vinyl-sub-frame-box">
                  <div className="vinyl-sub-grid">
                    {['หลังดำ', 'หลังขาว', 'ภายนอก', 'ภายใน', 'UV'].map((sub) => {
                      const fullVal = `ไวนิล ${sub}`;
                      const isChecked = materials.has(fullVal);
                      return (
                        <label className={`paper-check-item mini ${isChecked ? 'checked' : ''}`} key={sub}>
                          <input type="checkbox" checked={isChecked} readOnly />
                          <span>{sub}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="custom-material-line">
                  <label className={`paper-check-item ${materials.has('สติกเกอร์ตัดสี') ? 'checked' : ''}`}>
                    <input type="checkbox" checked={materials.has('สติกเกอร์ตัดสี')} readOnly />
                    <span>สติกเกอร์ตัดสี...</span>
                  </label>
                  <span className="mini-text-val">{spec.customMaterial || ''}</span>
                </div>
              </div>

              {/* Column 3: Paper & Film */}
              <div className="cat-col col-3">
                {['กระดาษ', 'แบล็คลิสฟิล์ม', 'พีพี', 'ซีทรู', 'แคนวาส'].map((m) => (
                  <label className={`paper-check-item ${materials.has(m) ? 'checked' : ''}`} key={m}>
                    <input type="checkbox" checked={materials.has(m)} readOnly />
                    <span>{m}</span>
                  </label>
                ))}
              </div>

              {/* Column 4: Sheets & Digital */}
              <div className="cat-col col-4">
                {['สติกเกอร์ขาว PVC A3+', 'สติกเกอร์ใส PVC A3+', 'กระดาษอาร์ตมัน A3+', 'กระดาษอาร์ตมันบาง A4', 'เคลือบแข็ง'].map((s) => (
                  <label className={`paper-check-item ${materials.has(s) ? 'checked' : ''}`} key={s}>
                    <input type="checkbox" checked={materials.has(s)} readOnly />
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
                <label className={`paper-check-item ${Array.from(boardTypes).some(b => b.includes('ฟิวเจอร์บอร์ด')) ? 'checked' : ''}`}>
                  <input type="checkbox" checked={Array.from(boardTypes).some(b => b.includes('ฟิวเจอร์บอร์ด'))} readOnly />
                  <span>ฟิวเจอร์บอร์ด</span>
                </label>
                {['โฟมบอร์ด', 'อะคริลิค', 'พลาสวูด', 'คอมโพสิต'].map((b) => (
                  <label className={`paper-check-item ${boardTypes.has(b) ? 'checked' : ''}`} key={b}>
                    <input type="checkbox" checked={boardTypes.has(b)} readOnly />
                    <span>{b}</span>
                  </label>
                ))}
              </div>

              {/* Column 2: Thickness Matrix */}
              <div className="cat-col col-2 thickness-matrix-col">
                <div className="thickness-matrix-box">
                  <div className="thickness-matrix">
                    {[
                      ['1 มิล', '10 มิล'],
                      ['1.5 มิล', '15 มิล'],
                      ['2 มิล', '20 มิล'],
                      ['3 มิล', '25 มิล'],
                      ['5 มิล', '30 มิล'],
                    ].map(([t1, t2]) => {
                      const isChecked1 = Array.from(boardTypes).some((b) => b.endsWith(t1));
                      const isChecked2 = Array.from(boardTypes).some((b) => b.endsWith(t2));
                      return (
                        <div className="thick-row" key={`${t1}-${t2}`}>
                          <div className={`paper-check-item mini pill-box ${isChecked1 ? 'checked' : ''}`}>
                            <input type="checkbox" checked={isChecked1} readOnly />
                            <span>{t1}</span>
                          </div>
                          <div className={`paper-check-item mini pill-box ${isChecked2 ? 'checked' : ''}`}>
                            <input type="checkbox" checked={isChecked2} readOnly />
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
                  <label className={`paper-check-item ${boardTypes.has(b) ? 'checked' : ''}`} key={b}>
                    <input type="checkbox" checked={boardTypes.has(b)} readOnly />
                    <span>{b}</span>
                  </label>
                ))}
              </div>

              {/* Column 4: Displays & 3D */}
              <div className="cat-col col-4">
                {['X Stand', 'Roll Up', 'กล่องไฟ', '3D', 'ซิงค์'].map((b) => (
                  <label className={`paper-check-item ${boardTypes.has(b) ? 'checked' : ''}`} key={b}>
                    <input type="checkbox" checked={boardTypes.has(b)} readOnly />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 6: ประกอบงาน (Finishing) */}
          <div className="paper-category-block">
            <div className="cat-badge-wrap">
              <span className="cat-badge">ประกอบงาน</span>
            </div>
            <div className="cat-content-grid col-3">
              {/* Col 1 */}
              <div className="cat-col">
                {['พับขอบ + เจาะรู', 'พับขอบอย่างเดียว', 'เจาะรู ไม่พับขอบ'].map((f) => (
                  <label className={`paper-check-item ${finishing.has(f) ? 'checked' : ''}`} key={f}>
                    <input type="checkbox" checked={finishing.has(f)} readOnly />
                    <span>{f}</span>
                  </label>
                ))}
                <div className="paper-tube-nested">
                  <label className={`paper-check-item ${Array.from(finishing).some((f) => f.startsWith('สอดท่อ')) ? 'checked' : ''}`}>
                    <input type="checkbox" checked={Array.from(finishing).some((f) => f.startsWith('สอดท่อ'))} readOnly />
                    <span>สอดท่อ</span>
                  </label>
                  <div className="tube-dir-boxes">
                    {['บน', 'ล่าง', 'ซ้าย', 'ขวา'].map((dir) => {
                      const val = `สอดท่อ ${dir}`;
                      const isChecked = finishing.has(val);
                      return (
                        <span className={`tube-box-btn ${isChecked ? 'active' : ''}`} key={dir}>
                          {dir}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <label className={`paper-check-item ${finishing.has('ติดตั้ง') ? 'checked' : ''}`}>
                  <input type="checkbox" checked={finishing.has('ติดตั้ง')} readOnly />
                  <span>ติดตั้ง</span>
                </label>
              </div>

              {/* Col 2 */}
              <div className="cat-col">
                <label className={`paper-check-item ${finishing.has('ประกบ หน้า-หลัง') ? 'checked' : ''}`}>
                  <input type="checkbox" checked={finishing.has('ประกบ หน้า-หลัง')} readOnly />
                  <span>ประกบ หน้า-หลัง</span>
                </label>
                <div className="diecut-row">
                  {['ไดคัทมือ', 'ไดคัทเครื่อง'].map((d) => (
                    <label className={`paper-check-item mini ${finishing.has(d) ? 'checked' : ''}`} key={d}>
                      <input type="checkbox" checked={finishing.has(d)} readOnly />
                      <span>{d}</span>
                    </label>
                  ))}
                </div>
                <label className={`paper-check-item ${finishing.has('ตัดเสมองาน') ? 'checked' : ''}`}>
                  <input type="checkbox" checked={finishing.has('ตัดเสมองาน')} readOnly />
                  <span>ตัดเสมองาน</span>
                </label>
                <div className="diecut-row">
                  {['เคลือบใส', 'เคลือบด้าน'].map((c) => (
                    <label className={`paper-check-item mini ${finishing.has(c) ? 'checked' : ''}`} key={c}>
                      <input type="checkbox" checked={finishing.has(c)} readOnly />
                      <span>{c}</span>
                    </label>
                  ))}
                </div>
                <label className={`paper-check-item ${finishing.has('ไม่ทำอะไรเลย') ? 'checked' : ''}`}>
                  <input type="checkbox" checked={finishing.has('ไม่ทำอะไรเลย')} readOnly />
                  <span>ไม่ทำอะไรเลย</span>
                </label>
              </div>

              {/* Col 3 */}
              <div className="cat-col">
                {['ม้วนใส่โรล', 'หุ้มกันลาย', 'หุ้มกันกระแทก', 'วัสดุ ( ของลูกค้า )'].map((f) => (
                  <label className={`paper-check-item ${finishing.has(f) ? 'checked' : ''}`} key={f}>
                    <input type="checkbox" checked={finishing.has(f)} readOnly />
                    <span>{f}</span>
                  </label>
                ))}
                {spec.customFinishing ? (
                  <div className="custom-finishing-text">
                    <span>ระบุ: {spec.customFinishing}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ROW 7: รายละเอียดเพิ่มเติม */}
          <div className="paper-notes-section">
            <span className="paper-notes-label">รายละเอียดเพิ่มเติม</span>
            <div className="paper-notes-content-box">
              {spec.notes || '— ไม่มีข้อความกำชับเพิ่มเติม —'}
            </div>
          </div>
        </div>
  );

  if (hideToolbar) {
    return sheetContent;
  }

  return (
    <div className="embedded-paper-container">
      <div className="embedded-paper-toolbar">
        <div className="toolbar-title">
          <span>ใบรับงานฉบับจริง</span>
        </div>
        <div className="toolbar-actions">
          <Link href={`/jobs/${job.id}/print`} target="_blank" className="paper-action-btn">
            <Printer size={13} /> พิมพ์ใบรับงาน
          </Link>
          <Link href={`/jobs/${job.id}/print`} target="_blank" className="paper-action-btn">
            <ExternalLink size={13} /> เต็มจอ
          </Link>
        </div>
      </div>

      <div className="embedded-paper-scroll">
        {sheetContent}
      </div>
    </div>
  );
}