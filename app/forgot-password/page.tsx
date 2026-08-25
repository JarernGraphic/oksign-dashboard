import Link from 'next/link';
import { ForgotPasswordForm } from './password-form';
export default function ForgotPasswordPage(){return <main className="simple-auth"><section><div className="login-mobile-brand always"><img src="/oksign_logo.png" alt="OKSIGN" className="login-logo-img" /><strong>OKSIGN</strong></div><p className="eyebrow">กู้คืนบัญชี</p><h1>ลืมรหัสผ่าน</h1><p>ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ</p><ForgotPasswordForm/><div className="login-help"><Link href="/login">กลับไปเข้าสู่ระบบ</Link></div></section></main>;}

