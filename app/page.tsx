import {
  AlertTriangle, Bell, Boxes, BriefcaseBusiness, ChevronDown,
  CircleDollarSign, ClipboardList, Clock3, FileText, LayoutDashboard,
  MessageSquareText, Paintbrush, Plus, Search, Settings, Truck, Users,
} from 'lucide-react';

const navigation = [
  { label: 'ภาพรวม', items: [{ name: 'แดชบอร์ด', icon: LayoutDashboard, active: true }] },
  { label: 'งานขาย', items: [
    { name: 'ลูกค้า', icon: Users }, { name: 'Brief / งานใหม่', icon: MessageSquareText },
    { name: 'ใบเสนอราคา', icon: FileText }, { name: 'รายการงาน', icon: BriefcaseBusiness, count: 24 },
  ] },
  { label: 'การดำเนินงาน', items: [
    { name: 'งานออกแบบ', icon: Paintbrush, count: 7 }, { name: 'งานผลิต', icon: Boxes, count: 5 },
    { name: 'จัดส่ง / ติดตั้ง', icon: Truck, count: 3 },
  ] },
  { label: 'การเงินและระบบ', items: [
    { name: 'รับชำระเงิน', icon: CircleDollarSign }, { name: 'ตั้งค่า', icon: Settings },
  ] },
];

const summary = [
  { label: 'งานที่กำลังดำเนินการ', value: '24', note: '+3 จากสัปดาห์ก่อน', tone: 'blue', icon: BriefcaseBusiness },
  { label: 'รอลูกค้าตอบ', value: '6', note: '2 งานรอเกิน 2 วัน', tone: 'amber', icon: Clock3 },
  { label: 'งานออกแบบ', value: '7', note: 'มีงานแก้ 3 งาน', tone: 'violet', icon: Paintbrush },
  { label: 'รอผลิต', value: '5', note: '1 งานกำหนดส่งวันนี้', tone: 'cyan', icon: Boxes },
];

const jobs = [
  { id: 'JOB-2026-0042', customer: 'ร้านอาหารบ้านสวน', title: 'ป้ายไฟหน้าร้าน 3.2 × 1.2 ม.', stage: 'กำลังออกแบบ', stageTone: 'violet', owner: 'กานต์', due: 'วันนี้, 17:00', priority: 'ด่วน', priorityTone: 'red' },
  { id: 'JOB-2026-0041', customer: 'Siam Wellness', title: 'สติ๊กเกอร์กระจก 4 สาขา', stage: 'รอลูกค้าตอบ', stageTone: 'amber', owner: 'มายด์', due: '25 ส.ค.', priority: 'ปกติ', priorityTone: 'gray' },
  { id: 'JOB-2026-0040', customer: 'บริษัท เอส.พี.รุ่งเรือง', title: 'ป้ายอะคริลิกตัวอักษรนูน', stage: 'รอผลิต', stageTone: 'cyan', owner: 'นัท', due: '26 ส.ค.', priority: 'สูง', priorityTone: 'orange' },
  { id: 'JOB-2026-0039', customer: 'The Bloom Clinic', title: 'Lightbox พร้อมติดตั้ง', stage: 'กำลังผลิต', stageTone: 'blue', owner: 'ฟลุ๊ค', due: '28 ส.ค.', priority: 'ปกติ', priorityTone: 'gray' },
];

const deadlines = [
  { day: '24', month: 'ส.ค.', title: 'ร้านอาหารบ้านสวน', detail: 'ส่งแบบรอบที่ 2 · 17:00', tone: 'red' },
  { day: '25', month: 'ส.ค.', title: 'Siam Wellness', detail: 'รอยืนยันแบบ · 12:00', tone: 'amber' },
  { day: '26', month: 'ส.ค.', title: 'เอส.พี.รุ่งเรือง', detail: 'เริ่มผลิต · 09:00', tone: 'blue' },
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">OK</div><div><strong>OKSIGN</strong><span>Dashboard</span></div></div>
        <nav className="navigation" aria-label="เมนูหลัก">
          {navigation.map((section) => <div className="nav-section" key={section.label}>
            <p>{section.label}</p>
            {section.items.map((item) => {
              const Icon = item.icon;
              return <a className={`nav-item ${item.active ? 'active' : ''}`} href="#" key={item.name}>
                <Icon size={18} strokeWidth={2} /><span>{item.name}</span>
                {'count' in item && item.count ? <b>{item.count}</b> : null}
              </a>;
            })}
          </div>)}
        </nav>
        <div className="sidebar-user"><div className="avatar">ส</div><div><strong>สมชาย ใจดี</strong><span>Owner</span></div><ChevronDown size={16} /></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand">OKSIGN</div>
          <label className="global-search"><Search size={18} /><input aria-label="ค้นหาทั้งระบบ" placeholder="ค้นหาเลขที่งาน ลูกค้า เบอร์โทร..." /><kbd>⌘ K</kbd></label>
          <div className="top-actions"><button className="icon-button" aria-label="การแจ้งเตือน"><Bell size={20} /><span>4</span></button><button className="primary-button"><Plus size={18} />สร้างงานใหม่</button></div>
        </header>

        <div className="content">
          <div className="page-heading"><div><p>วันจันทร์ที่ 24 สิงหาคม 2569</p><h1>สวัสดีตอนเช้า, คุณสมชาย</h1><span>นี่คืองานที่ต้องจัดการในวันนี้</span></div><button className="secondary-button"><ClipboardList size={17} />ดูกระดานงาน</button></div>
          <section className="summary-grid" aria-label="สรุปงาน">
            {summary.map((card) => { const Icon = card.icon; return <article className="summary-card" key={card.label}><div className={`metric-icon ${card.tone}`}><Icon size={20} /></div><div className="metric-copy"><p>{card.label}</p><strong>{card.value}</strong><span>{card.note}</span></div></article>; })}
          </section>

          <section className="financial-strip">
            <div className="financial-heading"><CircleDollarSign size={20} /><div><strong>ภาพรวมการเงิน</strong><span>อัปเดตล่าสุด 09:42 น.</span></div></div>
            <div className="financial-item"><span>ยอดขายวันนี้</span><strong>฿48,500</strong></div><div className="financial-item"><span>ยอดขายเดือนนี้</span><strong>฿842,750</strong></div><div className="financial-item outstanding"><span>ยอดค้างชำระ</span><strong>฿126,300</strong></div>
          </section>

          <div className="dashboard-grid">
            <section className="panel jobs-panel">
              <div className="panel-header"><div><h2>งานล่าสุด</h2><p>ติดตามความคืบหน้าของงานที่กำลังดำเนินการ</p></div><a href="#">ดูทั้งหมด</a></div>
              <div className="table-wrap"><table><thead><tr><th>งาน / ลูกค้า</th><th>สถานะ</th><th>ผู้รับผิดชอบ</th><th>กำหนดส่ง</th><th>ความสำคัญ</th></tr></thead>
                <tbody>{jobs.map((job) => <tr key={job.id}><td><a href="#">{job.id}</a><strong>{job.title}</strong><span>{job.customer}</span></td><td><span className={`badge ${job.stageTone}`}><i />{job.stage}</span></td><td><span className="person"><i>{job.owner.slice(0, 1)}</i>{job.owner}</span></td><td className={job.due.includes('วันนี้') ? 'due-today' : ''}>{job.due}</td><td><span className={`priority ${job.priorityTone}`}>{job.priority}</span></td></tr>)}</tbody>
              </table></div>
            </section>

            <aside className="side-stack">
              <section className="panel urgent-panel">
                <div className="panel-header compact"><div><h2><AlertTriangle size={18} />งานที่ต้องเร่ง</h2><p>ต้องดำเนินการภายในวันนี้</p></div><span className="count-pill">3</span></div>
                <div className="urgent-item"><span className="urgent-dot" /><div><strong>JOB-2026-0042</strong><p>ส่งแบบให้ลูกค้าภายใน 17:00</p><small>ร้านอาหารบ้านสวน</small></div><span>1 ชม.</span></div>
                <div className="urgent-item"><span className="urgent-dot amber" /><div><strong>JOB-2026-0037</strong><p>ยอดค้างชำระ ฿18,500</p><small>บริษัท โฮมเดคคอร์</small></div><span>3 วัน</span></div>
                <div className="urgent-item"><span className="urgent-dot violet" /><div><strong>JOB-2026-0035</strong><p>รอ Graphic รับงาน</p><small>วีว่า คาเฟ่</small></div><span>5 ชม.</span></div>
              </section>
              <section className="panel deadline-panel">
                <div className="panel-header compact"><div><h2>กำหนดส่งใกล้ถึง</h2><p>ภายใน 3 วันข้างหน้า</p></div></div>
                {deadlines.map((item) => <div className="deadline-item" key={item.title}><div className={`date-block ${item.tone}`}><strong>{item.day}</strong><span>{item.month}</span></div><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}
              </section>
            </aside>
          </div>
          <footer><span>OKSIGN Dashboard</span><span>ระบบพร้อมใช้งาน <i /></span></footer>
        </div>
      </section>
    </main>
  );
}
