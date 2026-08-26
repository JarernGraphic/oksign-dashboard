import { Clock, RefreshCw, ShieldAlert, LogOut, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { logoutAction } from '../actions';

export const metadata = { title: 'รอการอนุมัติสิทธิ์ — OKSIGN Dashboard' };

export default async function PendingApprovalPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, is_active, role:roles(code,name_th)')
    .eq('id', user.id)
    .maybeSingle();

  // If already approved or is owner, go straight to dashboard
  if (profile?.is_active || (profile?.role as any)?.code === 'OWNER') {
    redirect('/');
  }

  const displayName = profile?.full_name || user.user_metadata?.full_name || 'สมาชิกใหม่';
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid #e4e4e7',
          padding: '36px 32px',
          textAlign: 'center',
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
          <img src="/oksign_logo.png" alt="OKSIGN" style={{ width: '38px', height: '38px', objectFit: 'contain' }} />
          <strong style={{ fontSize: '20px', fontWeight: 800, color: '#18181b' }}>OKSIGN</strong>
        </div>

        {/* User Info Avatar */}
        <div style={{ position: 'relative', width: '72px', height: '72px', margin: '0 auto 16px' }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid #fef2f2' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
              }}
            >
              {displayName.slice(0, 1)}
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              backgroundColor: '#f59e0b',
              color: '#ffffff',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #ffffff',
            }}
          >
            <Clock size={14} />
          </div>
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#18181b', margin: '0 0 6px' }}>
          สวัสดีคุณ {displayName}
        </h2>

        {/* Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 14px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '20px',
          }}
        >
          <Clock size={15} />
          <span>รอการอนุมัติสิทธิ์จากเจ้าของร้าน</span>
        </div>

        <p style={{ fontSize: '14px', color: '#71717a', lineHeight: 1.6, margin: '0 0 28px' }}>
          บัญชีของคุณได้รับการลงทะเบียนเข้าสู่ระบบ <strong>OKSIGN</strong> แล้ว
          <br />
          กรุณาแจ้ง<strong>เจ้าของร้าน (Owner)</strong> เพื่อเปิดสิทธิ์การเข้าใช้งานและกำหนดตำแหน่งหน้าที่ให้คุณ
        </p>

        <div style={{ display: 'grid', gap: '12px' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              height: '44px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 650,
              fontSize: '14px',
              textDecoration: 'none',
              transition: 'background-color 0.15s ease',
            }}
          >
            <RefreshCw size={16} />
            <span>ตรวจสอบสถานะอีกครั้ง</span>
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                width: '100%',
                height: '42px',
                backgroundColor: 'transparent',
                border: '1px solid #e4e4e7',
                borderRadius: '8px',
                color: '#71717a',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <LogOut size={15} />
              <span>ออกจากระบบ</span>
            </button>
          </form>
        </div>

        <div
          style={{
            marginTop: '28px',
            paddingTop: '20px',
            borderTop: '1px solid #f4f4f5',
            fontSize: '12px',
            color: '#a1a1aa',
          }}
        >
          <span>OKSIGN Dashboard · ระบบบริหารจัดการร้านป้าย</span>
        </div>
      </div>
    </main>
  );
}
