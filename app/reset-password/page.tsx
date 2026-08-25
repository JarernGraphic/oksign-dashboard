import Link from 'next/link';
import { ResetPasswordForm } from '../forgot-password/password-form';
export default function ResetPasswordPage(){return <main className="simple-auth"><section><div className="login-mobile-brand always"><img src="/oksign_logo.png" alt="OKSIGN" className="login-logo-img" /><strong>OKSIGN</strong></div><p className="eyebrow">กู้คืนบัญชี</p><h1>ตั้งรหัสผ่านใหม่</h1><p>กำหนดรหัสผ่านใหม่อย่างน้อย 8 ตัวอักษร</p><ResetPasswordForm/><div className="login-help"><Link href="/login">กลับไปเข้าสู่ระบบ</Link></div></section></main>;}
