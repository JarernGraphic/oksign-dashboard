import { BarChart3, ClipboardCheck, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { LoginForm } from './login-form';
import { LineLoginButton } from '../../components/line-login-button';

export const metadata = { title: 'เข้าสู่ระบบ — OKSIGN Dashboard' };

const ERROR_MESSAGES: Record<string, string> = {
  line_cancelled: 'การเข้าสู่ระบบด้วย LINE ถูกยกเลิก',
  line_token_failed: 'ไม่สามารถรับ Token จาก LINE ได้ กรุณาลองใหม่อีกครั้ง',
  line_profile_failed: 'ไม่สามารถดึงข้อมูลโปรไฟล์จาก LINE ได้',
  line_session_failed: 'เกิดข้อผิดพลาดในการสร้างเซสชันในระบบ',
  line_unknown_error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย LINE กรุณาลองใหม่',
  confirmation_failed: 'การยืนยันอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const errorKey = resolvedParams?.error;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] || 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' : null;

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="login-visual-inner">
          <div className="login-brand">
            <img src="/oksign_logo.png" alt="OKSIGN" className="login-logo-img" />
            <strong>OKSIGN</strong>
          </div>
          <div className="login-message">
            <p>ระบบบริหารงานร้านป้าย</p>
            <h1>เห็นทุกงาน<br />จัดการได้ในที่เดียว</h1>
            <span>ตั้งแต่รับ Brief ออกแบบ ผลิต ส่งมอบ<br />จนถึงรับชำระเงิน</span>
          </div>
          <div className="login-features">
            <div>
              <ClipboardCheck />
              <span>
                <strong>ติดตามงานครบทุกขั้นตอน</strong>
                <small>รู้สถานะ ผู้รับผิดชอบ และกำหนดส่ง</small>
              </span>
            </div>
            <div>
              <BarChart3 />
              <span>
                <strong>มองเห็นภาพรวมธุรกิจ</strong>
                <small>งานด่วน ยอดขาย และยอดค้างชำระ</small>
              </span>
            </div>
            <div>
              <ShieldCheck />
              <span>
                <strong>สิทธิ์การใช้งานตามหน้าที่</strong>
                <small>ข้อมูลปลอดภัยสำหรับทุกฝ่าย</small>
              </span>
            </div>
          </div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <div className="login-mobile-brand">
            <img src="/oksign_logo.png" alt="OKSIGN" className="login-logo-img" />
            <strong>OKSIGN</strong>
          </div>
          <p className="eyebrow">ยินดีต้อนรับกลับมา</p>
          <h2>เข้าสู่ระบบ</h2>
          <p className="login-description">กรอกข้อมูลเพื่อเข้าใช้งาน OKSIGN Dashboard</p>

          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '12px',
                marginBottom: '18px',
              }}
              role="alert"
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <LineLoginButton />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '20px 0',
              color: '#a1a1aa',
              fontSize: '11px',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e4e4e7' }} />
            <span style={{ padding: '0 12px' }}>หรือเข้าสู่ระบบด้วยชื่อผู้ใช้</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#e4e4e7' }} />
          </div>

          <LoginForm />

          <div className="login-help">
            ยังไม่มีบัญชี? <Link href="/signup">สมัครสมาชิก</Link>
          </div>
        </div>
        <footer>© 2026 OKSIGN · Version 0.2.0</footer>
      </section>
    </main>
  );
}
