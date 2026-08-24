import { BarChart3, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { LoginForm } from './login-form';

export const metadata = { title: 'เข้าสู่ระบบ — OKSIGN Dashboard' };

export default function LoginPage() {
  return <main className="login-page">
    <section className="login-visual">
      <div className="login-visual-inner">
        <div className="login-brand"><span>OK</span><strong>OKSIGN</strong></div>
        <div className="login-message"><p>ระบบบริหารงานร้านป้าย</p><h1>เห็นทุกงาน<br />จัดการได้ในที่เดียว</h1><span>ตั้งแต่รับ Brief ออกแบบ ผลิต ส่งมอบ<br />จนถึงรับชำระเงิน</span></div>
        <div className="login-features"><div><ClipboardCheck /><span><strong>ติดตามงานครบทุกขั้นตอน</strong><small>รู้สถานะ ผู้รับผิดชอบ และกำหนดส่ง</small></span></div><div><BarChart3 /><span><strong>มองเห็นภาพรวมธุรกิจ</strong><small>งานด่วน ยอดขาย และยอดค้างชำระ</small></span></div><div><ShieldCheck /><span><strong>สิทธิ์การใช้งานตามหน้าที่</strong><small>ข้อมูลปลอดภัยสำหรับทุกฝ่าย</small></span></div></div>
      </div>
    </section>
    <section className="login-panel"><div className="login-card"><div className="login-mobile-brand"><span>OK</span><strong>OKSIGN</strong></div><p className="eyebrow">ยินดีต้อนรับกลับมา</p><h2>เข้าสู่ระบบ</h2><p className="login-description">กรอกข้อมูลเพื่อเข้าใช้งาน OKSIGN Dashboard</p><LoginForm /><div className="login-help">พบปัญหาในการเข้าสู่ระบบ? <a href="mailto:admin@oksign.co.th">ติดต่อผู้ดูแลระบบ</a></div></div><footer>© 2026 OKSIGN · Version 0.1.0</footer></section>
  </main>;
}
