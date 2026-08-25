import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata = { title: 'สมัครสมาชิก — OKSIGN Dashboard' };
export default function SignupPage() {
  return <main className="simple-auth"><section><div className="login-mobile-brand always"><img src="/oksign_logo.png" alt="OKSIGN" className="login-logo-img" /><strong>OKSIGN</strong></div><p className="eyebrow">สำหรับพนักงาน OKSIGN</p><h1>สมัครสมาชิก</h1><p>ใช้ชื่อผู้ใช้และรหัสผ่าน ไม่ต้องใช้อีเมล</p><SignupForm /><div className="login-help">มีบัญชีแล้ว? <Link href="/login">เข้าสู่ระบบ</Link></div></section></main>;
}
