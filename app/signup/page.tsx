import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata = { title: 'สร้างบัญชี — OKSIGN Dashboard' };
export default function SignupPage() {
  return <main className="simple-auth"><section><div className="login-mobile-brand always"><span>OK</span><strong>OKSIGN</strong></div><p className="eyebrow">เริ่มต้นใช้งาน</p><h1>สร้างบัญชี Owner</h1><p>บัญชีแรกจะเป็นเจ้าขององค์กรและจัดการผู้ใช้ทั้งหมดได้</p><SignupForm /><div className="login-help">มีบัญชีแล้ว? <Link href="/login">เข้าสู่ระบบ</Link></div></section></main>;
}
