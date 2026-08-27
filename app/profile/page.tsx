import { redirect } from 'next/navigation';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { UserProfileEditor } from './profile-editor';

export const metadata = {
  title: 'โปรไฟล์ของฉัน — OKSIGN Dashboard',
};

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect('/login');
  }

  return (
    <AppShell profile={profile} active="ตั้งค่า">
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
              โปรไฟล์ส่วนตัว
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              จัดการชื่อเล่นและรูปภาพประจำตัวของคุณในระบบ OKSIGN
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '600px', marginTop: '20px' }}>
          <UserProfileEditor profile={profile} />
        </div>
      </main>
    </AppShell>
  );
}
