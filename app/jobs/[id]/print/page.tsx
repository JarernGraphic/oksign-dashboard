import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getCurrentProfile } from '../../../../lib/current-profile';
import { PrintHeaderActions } from './print-actions';

type JobOrderSpec = {
  receiverName?: string;
  title?: string;
  dimensions?: string;
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
  shapes?: string[];
  printers?: string[];
  materials?: string[];
  customMaterial?: string;
  boardTypes?: string[];
  finishing?: string[];
  customFinishing?: string;
  notes?: string;
};

function formatThaiDate(dateString?: string | null) {
  if (!dateString) return '___ / ___ / ______';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${day} / ${month} / ${year}`;
  } catch {
    return dateString;
  }
}

function getPrintPriorityLabel(priority?: string) {
  if (!priority || priority === 'NORMAL' || priority === 'ปกติ' || priority === 'LOW') return '';
  if (priority === 'URGENT' || priority === 'ด่วน' || priority === 'HIGH') return 'ด่วน';
  if (priority === 'VERY_URGENT' || priority === 'ด่วนพิเศษ') return 'ด่วนพิเศษ';
  if (priority === 'NOON' || priority === 'รับเที่ยง') return 'รับเที่ยง';
  if (priority === 'EVENING' || priority === 'รับเย็น') return 'รับเย็น';
  return priority;
}


type JobDataResult = {
  id: string;
  job_number: string;
  title: string;
  stage: string;
  status: string;
  priority: string;
  deadline: string | null;
  grand_total_satang: number;
  paid_amount_satang: number;
  created_at: string;
  customer: { name: string; phone: string | null; line_name: string | null } | null;
  brief: { requirements: string; dimensions: string | null; material: string | null; quantity: number; created_at: string } | null;
};

export default async function JobPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const { data: jobData, error } = await supabase
    .from('jobs')
    .select(`
      id,
      job_number,
      title,
      stage,
      status,
      priority,
      deadline,
      grand_total_satang,
      paid_amount_satang,
      created_at,
      customer:customers(name, phone, line_name),
      brief:briefs(requirements, dimensions, material, quantity, created_at)
    `)
    .eq('id', id)
    .single();

  if (error || !jobData) notFound();
  const job = jobData as unknown as JobDataResult;

  // Parse structured spec if available
  let spec: JobOrderSpec = {};
  if (job.brief?.requirements) {
    try {
      spec = JSON.parse(job.brief.requirements);
    } catch {
      spec = { notes: job.brief.requirements };
    }
  }

  const shapes = new Set(spec.shapes || []);
  const printers = new Set(spec.printers || []);
  const materials = new Set(spec.materials || []);
  const boardTypes = new Set(spec.boardTypes || []);
  const finishing = new Set(spec.finishing || []);

  const totalBaht = spec.totalBaht ?? (job.grand_total_satang / 100);
  const depositBaht = spec.depositBaht ?? (job.paid_amount_satang / 100);
  const remainingBaht = spec.remainingBaht ?? Math.max(0, totalBaht - depositBaht);

  const unitPrice = spec.unitPrice ?? (spec.quantity && totalBaht ? (totalBaht / spec.quantity) : 0);
  const quantity = spec.quantity ?? job.brief?.quantity ?? 1;
  const dimensions = spec.dimensions || job.brief?.dimensions || '-';
  const installCost = spec.installCost ?? 0;
  const installLocation = spec.installLocation || '';

  const receiverName = spec.receiverName || '';
  const designCondition = spec.designCondition || 'ดูแบบ';
  const contactChannel = spec.contactChannel || '';
  const openedDate = spec.openedDate || job.created_at;
  const dueDate = spec.dueDate || job.deadline;
  const priorityLabel = getPrintPriorityLabel(spec.priority || job.priority);

  return (
    <div className="print-page-wrapper">
      <PrintHeaderActions jobId={job.id} />

      {/* A5 Printable Job Sheet (148mm x 210mm) */}
      <div className="a5-sheet" id="printable-job-sheet">
        {/* TOP ROW: Header Left & Header Right */}
        <div className="a5-top-grid">
          {/* Left Column */}
          <div className="a5-header-left">
            {/* Title / Receiver */}
            <div className="a5-row-inline">
              <span className="a5-badge-title">ใบรับงาน</span>
              <div className="a5-field-box inline-receiver">
                <span className="field-label">ผู้รับงาน</span>
                <span className="field-value">{receiverName}</span>
              </div>
            </div>

            {/* Customer Name */}
            <div className="a5-field-box">
              <span className="field-label">ชื่อลูกค้า</span>
              <span className="field-value bold">{job.customer?.name ?? '-'}</span>
            </div>

            {/* Job Title */}
            <div className="a5-field-box">
              <span className="field-label">ชื่องาน</span>
              <span className="field-value bold">{job.title}</span>
            </div>

            {/* Dimensions */}
            <div className="a5-line-dotted">
              <span className="line-label">ขนาด</span>
              <span className="line-value">{dimensions}</span>
            </div>

            {/* Quantity & Unit Price */}
            <div className="a5-line-dotted split">
              <div>
                <span className="line-label">จำนวน</span>
                <span className="line-value">{quantity}</span>
                <span className="line-unit">ชิ้น</span>
              </div>
              <div>
                <span className="line-label">ราคา</span>
                <span className="line-value">{unitPrice > 0 ? unitPrice.toLocaleString('th-TH') : '-'}</span>
                <span className="line-unit">บาท/ชิ้น</span>
              </div>
            </div>

            {/* Installation Cost & Location */}
            <div className="a5-line-dotted split">
              <div>
                <span className="line-label">ค่าแรงติดตั้ง</span>
                <span className="line-value">{installCost > 0 ? installCost.toLocaleString('th-TH') : '-'}</span>
              </div>
              <div>
                <span className="line-label">สถานที่ติดตั้ง</span>
                <span className="line-value small">{installLocation || '-'}</span>
              </div>
            </div>

            {/* Total Box */}
            <div className="a5-box-total">
              <span className="total-label">รวมยอด</span>
              <strong className="total-amount">฿{totalBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong>
            </div>

            {/* Deposit Box */}
            <div className="a5-box-payment">
              <div className="pay-left">
                <span className="pay-label">มัดจำ</span>
                <span className="pay-val">{depositBaht > 0 ? `฿${depositBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}</span>
              </div>
              <div className="pay-methods">
                <span className={`a5-check ${spec.depositMethod === 'CASH' ? 'checked' : ''}`}>
                  <i>{spec.depositMethod === 'CASH' ? '✓' : ''}</i> เงินสด
                </span>
                <span className={`a5-check ${spec.depositMethod === 'BANK_TRANSFER' || (depositBaht > 0 && !spec.depositMethod) ? 'checked' : ''}`}>
                  <i>{spec.depositMethod === 'BANK_TRANSFER' || (depositBaht > 0 && !spec.depositMethod) ? '✓' : ''}</i> โอนจ่าย
                </span>
              </div>
            </div>

            {/* Remaining Box */}
            <div className="a5-box-payment">
              <div className="pay-left">
                <span className="pay-label">คงเหลือ</span>
                <span className="pay-val bold">{remainingBaht > 0 ? `฿${remainingBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '0.00'}</span>
              </div>
              <div className="pay-methods">
                <span className={`a5-check ${spec.remainingMethod === 'CASH' ? 'checked' : ''}`}>
                  <i>{spec.remainingMethod === 'CASH' ? '✓' : ''}</i> เงินสด
                </span>
                <span className={`a5-check ${spec.remainingMethod === 'BANK_TRANSFER' ? 'checked' : ''}`}>
                  <i>{spec.remainingMethod === 'BANK_TRANSFER' ? '✓' : ''}</i> โอนจ่าย
                </span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="a5-header-right">
            {/* Job Code & Priority Stamp */}
            <div className="a5-job-header-flex">
              <div className="a5-job-number-box">
                <span className="job-label">รหัสงาน</span>
                <div className="job-value-pill">
                  <strong>{job.job_number}</strong>
                </div>
              </div>
              {priorityLabel ? (
                <div className={`a5-priority-stamp-box ${priorityLabel === 'ด่วนพิเศษ' ? 'red-intense' : ''}`}>
                  <span>{priorityLabel}</span>
                </div>
              ) : null}
            </div>


            {/* Dates */}
            <div className="a5-date-row">
              <p>วันที่เปิดใบงาน</p>
              <div className="date-underline">{formatThaiDate(openedDate)}</div>
            </div>
            <div className="a5-date-row">
              <p>วันที่ส่งงาน</p>
              <div className="date-underline">{formatThaiDate(dueDate)}</div>
            </div>

            {/* Design condition */}
            <div className="a5-design-status-checks">
              <span className={`a5-check ${designCondition === 'ดูแบบ' ? 'checked' : ''}`}>
                <i>{designCondition === 'ดูแบบ' ? '✓' : ''}</i> ดูแบบ
              </span>
              <span className={`a5-check ${designCondition === 'ไม่ดูแบบ' ? 'checked' : ''}`}>
                <i>{designCondition === 'ไม่ดูแบบ' ? '✓' : ''}</i> ไม่ดูแบบ
              </span>
              <span className={`a5-check ${designCondition === 'มีแบบ' ? 'checked' : ''}`}>
                <i>{designCondition === 'มีแบบ' ? '✓' : ''}</i> มีแบบ
              </span>
            </div>

            {/* Contact Channels Badge & List */}
            <div className="a5-channel-section">
              <div className="channel-badge-header">ช่องทางติดต่อลูกค้า</div>
              <div className="channel-line-pills">
                {['LINE 1', 'LINE 2', 'LINE 3', 'LINE OA'].map((ch) => (
                  <span className={`ch-pill ${contactChannel === ch ? 'active' : ''}`} key={ch}>
                    {ch}
                  </span>
                ))}
              </div>
              <div className="channel-icons-row">
                <span className={`ch-icon ${contactChannel === 'Facebook' ? 'active' : ''}`}>ⓕ</span>
                <span className={`ch-icon ${contactChannel?.includes('LINE') ? 'active' : ''}`}>💬</span>
                <span className={`ch-icon ${contactChannel === 'เบอร์โทร' ? 'active' : ''}`}>📞</span>
                <span className="ch-phone-text">{job.customer?.phone ?? ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 2: Shapes & Stamp Boxes */}
        <div className="a5-middle-grid">
          {/* Shapes */}
          <div className="a5-shapes-group">
            <span className={`shape-item ${shapes.has('สี่เหลี่ยมจัตุรัส') ? 'active' : ''}`}>
              <i className="shape-box square" />
            </span>
            <span className={`shape-item ${shapes.has('สี่เหลี่ยมแนวตั้ง') ? 'active' : ''}`}>
              <i className="shape-box tall" />
            </span>
            <span className={`shape-item ${shapes.has('สี่เหลี่ยมแนวนอน') ? 'active' : ''}`}>
              <i className="shape-box wide" />
            </span>
            <span className={`shape-item ${shapes.has('วงกลม') ? 'active' : ''}`}>
              <i className="shape-box circle" />
            </span>
            <span className={`shape-item ${shapes.has('สามเหลี่ยม') ? 'active' : ''}`}>
              <i className="shape-box triangle" />
            </span>
          </div>

          {/* ลงทะเบียน */}
          <div className="a5-stamp-box">
            <span>ลงทะเบียน</span>
          </div>

          {/* รับแล้ว */}
          <div className="a5-stamp-box">
            <span>รับแล้ว</span>
          </div>
        </div>

        {/* ROW 3: เครื่องพิมพ์ */}
        <div className="a5-printer-row">
          <span className="printer-badge">เครื่องพิมพ์</span>
          <span className={`a5-check ${printers.has('GZ') ? 'checked' : ''}`}>
            <i>{printers.has('GZ') ? '✓' : ''}</i> GZ
          </span>
          <span className={`a5-check ${printers.has('Epson') ? 'checked' : ''}`}>
            <i>{printers.has('Epson') ? '✓' : ''}</i> Epson
          </span>
          <span className={`a5-check ${printers.has('Fuji') ? 'checked' : ''}`}>
            <i>{printers.has('Fuji') ? '✓' : ''}</i> Fuji
          </span>
        </div>

        {/* ROW 4: วัสดุ (Materials) */}
        <div className="a5-category-block">
          <div className="cat-badge-wrap">
            <span className="cat-badge">วัสดุ</span>
          </div>
          <div className="cat-content-grid col-4">
            {/* Vinyl Subgroup with border */}
            <div className="vinyl-sub-frame">
              <span className={`a5-check ${materials.has('ไวนิล หลังดำ') || materials.has('ไวนิล หลังขาว') || materials.has('ไวนิล') ? 'checked' : ''}`}>
                <i>{materials.has('ไวนิล') || materials.has('ไวนิล หลังดำ') || materials.has('ไวนิล หลังขาว') ? '✓' : ''}</i> ไวนิล
              </span>
              <div className="vinyl-nested">
                <span className={`a5-check mini ${materials.has('ไวนิล หลังดำ') ? 'checked' : ''}`}><i>{materials.has('ไวนิล หลังดำ') ? '✓' : ''}</i> หลังดำ</span>
                <span className={`a5-check mini ${materials.has('ไวนิล หลังขาว') ? 'checked' : ''}`}><i>{materials.has('ไวนิล หลังขาว') ? '✓' : ''}</i> หลังขาว</span>
                <span className={`a5-check mini ${materials.has('ไวนิล ภายนอก') ? 'checked' : ''}`}><i>{materials.has('ไวนิล ภายนอก') ? '✓' : ''}</i> ภายนอก</span>
                <span className={`a5-check mini ${materials.has('ไวนิล ภายใน') ? 'checked' : ''}`}><i>{materials.has('ไวนิล ภายใน') ? '✓' : ''}</i> ภายใน</span>
                <span className={`a5-check mini ${materials.has('ไวนิล UV') ? 'checked' : ''}`}><i>{materials.has('ไวนิล UV') ? '✓' : ''}</i> UV</span>
              </div>
            </div>

            {/* Column 2: Stickers */}
            <div className="cat-col">
              <span className={`a5-check ${materials.has('สติกเกอร์-ขาว') ? 'checked' : ''}`}><i>{materials.has('สติกเกอร์-ขาว') ? '✓' : ''}</i> สติกเกอร์-ขาว</span>
              <span className={`a5-check ${materials.has('สติกเกอร์-ใส') ? 'checked' : ''}`}><i>{materials.has('สติกเกอร์-ใส') ? '✓' : ''}</i> สติกเกอร์-ใส</span>
              <span className={`a5-check ${materials.has('สติกเกอร์-ด้าน') ? 'checked' : ''}`}><i>{materials.has('สติกเกอร์-ด้าน') ? '✓' : ''}</i> สติกเกอร์-ด้าน</span>
              <span className={`a5-check ${materials.has('สติกเกอร์-ฝ้า') ? 'checked' : ''}`}><i>{materials.has('สติกเกอร์-ฝ้า') ? '✓' : ''}</i> สติกเกอร์-ฝ้า</span>
              <span className={`a5-check ${materials.has('สติกเกอร์ตัดสี') ? 'checked' : ''}`}><i>{materials.has('สติกเกอร์ตัดสี') ? '✓' : ''}</i> สติกเกอร์ตัดสี...</span>
            </div>

            {/* Column 3: Paper & Film */}
            <div className="cat-col">
              <span className={`a5-check ${materials.has('กระดาษ') ? 'checked' : ''}`}><i>{materials.has('กระดาษ') ? '✓' : ''}</i> กระดาษ</span>
              <span className={`a5-check ${materials.has('แบล็คลิสฟิล์ม') ? 'checked' : ''}`}><i>{materials.has('แบล็คลิสฟิล์ม') ? '✓' : ''}</i> แบล็คลิสฟิล์ม</span>
              <span className={`a5-check ${materials.has('พีพี') ? 'checked' : ''}`}><i>{materials.has('พีพี') ? '✓' : ''}</i> พีพี</span>
              <span className={`a5-check ${materials.has('ซีทรู') ? 'checked' : ''}`}><i>{materials.has('ซีทรู') ? '✓' : ''}</i> ซีทรู</span>
              <span className={`a5-check ${materials.has('แคนวาส') ? 'checked' : ''}`}><i>{materials.has('แคนวาส') ? '✓' : ''}</i> แคนวาส</span>
            </div>

            {/* Column 4: Sheets & Digital */}
            <div className="cat-col">
              <span className={`a5-check ${materials.has('สติกเกอร์ขาว PVC A3+') ? 'checked' : ''}`}><i>{materials.has('สติกเกอร์ขาว PVC A3+') ? '✓' : ''}</i> สติกเกอร์ขาว PVC A3+</span>
              <span className={`a5-check ${materials.has('สติกเกอร์ใส PVC A3+') ? 'checked' : ''}`}><i>{materials.has('สติกเกอร์ใส PVC A3+') ? '✓' : ''}</i> สติกเกอร์ใส PVC A3+</span>
              <span className={`a5-check ${materials.has('กระดาษอาร์ตมัน A3+') ? 'checked' : ''}`}><i>{materials.has('กระดาษอาร์ตมัน A3+') ? '✓' : ''}</i> กระดาษอาร์ตมัน A3+</span>
              <span className={`a5-check ${materials.has('กระดาษอาร์ตมันบาง A4') ? 'checked' : ''}`}><i>{materials.has('กระดาษอาร์ตมันบาง A4') ? '✓' : ''}</i> กระดาษอาร์ตมันบาง A4</span>
              <span className={`a5-check ${materials.has('เคลือบแข็ง') ? 'checked' : ''}`}><i>{materials.has('เคลือบแข็ง') ? '✓' : ''}</i> เคลือบแข็ง</span>
            </div>
          </div>
        </div>

        {/* ROW 5: ประเภท (Types / Boards) */}
        <div className="a5-category-block">
          <div className="cat-badge-wrap">
            <span className="cat-badge">ประเภท</span>
          </div>
          <div className="cat-content-grid col-4">
            {/* Futureboard Thicknesses */}
            <div className="cat-col">
              <span className={`a5-check ${Array.from(boardTypes).some(b => b.includes('ฟิวเจอร์บอร์ด')) ? 'checked' : ''}`}>
                <i>{Array.from(boardTypes).some(b => b.includes('ฟิวเจอร์บอร์ด')) ? '✓' : ''}</i> ฟิวเจอร์บอร์ด
              </span>
              <span className={`a5-check ${boardTypes.has('โฟมบอร์ด') ? 'checked' : ''}`}><i>{boardTypes.has('โฟมบอร์ด') ? '✓' : ''}</i> โฟมบอร์ด</span>
              <span className={`a5-check ${boardTypes.has('อะคริลิค') ? 'checked' : ''}`}><i>{boardTypes.has('อะคริลิค') ? '✓' : ''}</i> อะคริลิค</span>
              <span className={`a5-check ${boardTypes.has('พลาสวูด') ? 'checked' : ''}`}><i>{boardTypes.has('พลาสวูด') ? '✓' : ''}</i> พลาสวูด</span>
              <span className={`a5-check ${boardTypes.has('คอมโพสิต') ? 'checked' : ''}`}><i>{boardTypes.has('คอมโพสิต') ? '✓' : ''}</i> คอมโพสิต</span>
            </div>

            {/* Thickness Grid */}
            <div className="cat-col thickness-matrix">
              <div className="thick-row">
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 1 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 1 มิล') ? '✓' : ''}</i> 1 มิล</span>
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 10 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 10 มิล') ? '✓' : ''}</i> 10 มิล</span>
              </div>
              <div className="thick-row">
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 1.5 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 1.5 มิล') ? '✓' : ''}</i> 1.5 มิล</span>
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 15 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 15 มิล') ? '✓' : ''}</i> 15 มิล</span>
              </div>
              <div className="thick-row">
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 2 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 2 มิล') ? '✓' : ''}</i> 2 มิล</span>
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 20 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 20 มิล') ? '✓' : ''}</i> 20 มิล</span>
              </div>
              <div className="thick-row">
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 3 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 3 มิล') ? '✓' : ''}</i> 3 มิล</span>
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 25 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 25 มิล') ? '✓' : ''}</i> 25 มิล</span>
              </div>
              <div className="thick-row">
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 5 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 5 มิล') ? '✓' : ''}</i> 5 มิล</span>
                <span className={`a5-check mini ${boardTypes.has('ฟิวเจอร์บอร์ด 30 มิล') ? 'checked' : ''}`}><i>{boardTypes.has('ฟิวเจอร์บอร์ด 30 มิล') ? '✓' : ''}</i> 30 มิล</span>
              </div>
            </div>

            {/* Column 3: Structures */}
            <div className="cat-col">
              <span className={`a5-check ${boardTypes.has('โครงไม้') ? 'checked' : ''}`}><i>{boardTypes.has('โครงไม้') ? '✓' : ''}</i> โครงไม้</span>
              <span className={`a5-check ${boardTypes.has('โครงเหล็ก') ? 'checked' : ''}`}><i>{boardTypes.has('โครงเหล็ก') ? '✓' : ''}</i> โครงเหล็ก</span>
              <span className={`a5-check ${boardTypes.has('ขาธงญี่ปุ่น') ? 'checked' : ''}`}><i>{boardTypes.has('ขาธงญี่ปุ่น') ? '✓' : ''}</i> ขาธงญี่ปุ่น</span>
              <span className={`a5-check ${boardTypes.has('สแตนเลส') ? 'checked' : ''}`}><i>{boardTypes.has('สแตนเลส') ? '✓' : ''}</i> สแตนเลส</span>
              <span className={`a5-check ${boardTypes.has('แผ่นเหล็ก') ? 'checked' : ''}`}><i>{boardTypes.has('แผ่นเหล็ก') ? '✓' : ''}</i> แผ่นเหล็ก</span>
            </div>

            {/* Column 4: Displays & 3D */}
            <div className="cat-col">
              <span className={`a5-check ${boardTypes.has('X Stand') ? 'checked' : ''}`}><i>{boardTypes.has('X Stand') ? '✓' : ''}</i> X Stand</span>
              <span className={`a5-check ${boardTypes.has('Roll Up') ? 'checked' : ''}`}><i>{boardTypes.has('Roll Up') ? '✓' : ''}</i> Roll Up</span>
              <span className={`a5-check ${boardTypes.has('กล่องไฟ') ? 'checked' : ''}`}><i>{boardTypes.has('กล่องไฟ') ? '✓' : ''}</i> กล่องไฟ</span>
              <span className={`a5-check ${boardTypes.has('3D') ? 'checked' : ''}`}><i>{boardTypes.has('3D') ? '✓' : ''}</i> 3D</span>
              <span className={`a5-check ${boardTypes.has('ซิงค์') ? 'checked' : ''}`}><i>{boardTypes.has('ซิงค์') ? '✓' : ''}</i> ซิงค์</span>
            </div>
          </div>
        </div>

        {/* ROW 6: ประกอบงาน (Finishing) */}
        <div className="a5-category-block">
          <div className="cat-badge-wrap">
            <span className="cat-badge">ประกอบงาน</span>
          </div>
          <div className="cat-content-grid col-3">
            {/* Col 1 */}
            <div className="cat-col">
              <span className={`a5-check ${finishing.has('พับขอบ + เจาะรู') ? 'checked' : ''}`}><i>{finishing.has('พับขอบ + เจาะรู') ? '✓' : ''}</i> พับขอบ + เจาะรู</span>
              <span className={`a5-check ${finishing.has('พับขอบอย่างเดียว') ? 'checked' : ''}`}><i>{finishing.has('พับขอบอย่างเดียว') ? '✓' : ''}</i> พับขอบอย่างเดียว</span>
              <span className={`a5-check ${finishing.has('เจาะรู ไม่พับขอบ') ? 'checked' : ''}`}><i>{finishing.has('เจาะรู ไม่พับขอบ') ? '✓' : ''}</i> เจาะรู ไม่พับขอบ</span>
              <div className="tube-nested">
                <span className={`a5-check ${finishing.has('สอดท่อ บน') || finishing.has('สอดท่อ ล่าง') ? 'checked' : ''}`}>สอดท่อ</span>
                <div className="tube-dir-boxes">
                  <span className={`tube-box ${finishing.has('สอดท่อ บน') ? 'active' : ''}`}>บน</span>
                  <span className={`tube-box ${finishing.has('สอดท่อ ล่าง') ? 'active' : ''}`}>ล่าง</span>
                  <span className={`tube-box ${finishing.has('สอดท่อ ซ้าย') ? 'active' : ''}`}>ซ้าย</span>
                  <span className={`tube-box ${finishing.has('สอดท่อ ขวา') ? 'active' : ''}`}>ขวา</span>
                </div>
              </div>
              <span className={`a5-check ${finishing.has('ติดตั้ง') ? 'checked' : ''}`}><i>{finishing.has('ติดตั้ง') ? '✓' : ''}</i> ติดตั้ง</span>
            </div>

            {/* Col 2 */}
            <div className="cat-col">
              <span className={`a5-check ${finishing.has('ประกบ หน้า-หลัง') ? 'checked' : ''}`}><i>{finishing.has('ประกบ หน้า-หลัง') ? '✓' : ''}</i> ประกบ หน้า-หลัง</span>
              <div className="diecut-row">
                <span className={`a5-check mini ${finishing.has('ไดคัทมือ') ? 'checked' : ''}`}><i>{finishing.has('ไดคัทมือ') ? '✓' : ''}</i> ไดคัทมือ</span>
                <span className={`a5-check mini ${finishing.has('ไดคัทเครื่อง') ? 'checked' : ''}`}><i>{finishing.has('ไดคัทเครื่อง') ? '✓' : ''}</i> ไดคัทเครื่อง</span>
              </div>
              <span className={`a5-check ${finishing.has('ตัดเสมองาน') ? 'checked' : ''}`}><i>{finishing.has('ตัดเสมองาน') ? '✓' : ''}</i> ตัดเสมองาน</span>
              <div className="coat-row">
                <span className={`a5-check mini ${finishing.has('เคลือบใส') ? 'checked' : ''}`}><i>{finishing.has('เคลือบใส') ? '✓' : ''}</i> เคลือบใส</span>
                <span className={`a5-check mini ${finishing.has('เคลือบด้าน') ? 'checked' : ''}`}><i>{finishing.has('เคลือบด้าน') ? '✓' : ''}</i> เคลือบด้าน</span>
              </div>
              <span className={`a5-check ${finishing.has('ไม่ทำอะไรเลย') ? 'checked' : ''}`}><i>{finishing.has('ไม่ทำอะไรเลย') ? '✓' : ''}</i> ไม่ทำอะไรเลย</span>
            </div>

            {/* Col 3 */}
            <div className="cat-col">
              <span className={`a5-check ${finishing.has('ม้วนใส่โรล') ? 'checked' : ''}`}><i>{finishing.has('ม้วนใส่โรล') ? '✓' : ''}</i> ม้วนใส่โรล</span>
              <span className={`a5-check ${finishing.has('หุ้มกันลาย') ? 'checked' : ''}`}><i>{finishing.has('หุ้มกันลาย') ? '✓' : ''}</i> หุ้มกันลาย</span>
              <span className={`a5-check ${finishing.has('หุ้มกันกระแทก') ? 'checked' : ''}`}><i>{finishing.has('หุ้มกันกระแทก') ? '✓' : ''}</i> หุ้มกันกระแทก</span>
              <span className={`a5-check ${finishing.has('วัสดุ ( ของลูกค้า )') ? 'checked' : ''}`}><i>{finishing.has('วัสดุ ( ของลูกค้า )') ? '✓' : ''}</i> วัสดุ ( ของลูกค้า )</span>
              <div className="specify-line">
                <span>ระบุ</span>
                <span className="spec-val">{spec.customFinishing || '____________________'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ROW 7: รายละเอียดเพิ่มเติม (Notes) */}
        <div className="a5-notes-section">
          <span className="notes-label">รายละเอียดเพิ่มเติม</span>
          <div className="notes-content-box">
            {spec.notes || '-'}
          </div>
        </div>
      </div>
    </div>
  );
}
