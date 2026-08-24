import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { SetupForm } from './setup-form';

export default async function SetupPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (profile) redirect('/');
  return <main className="simple-auth"><section><div className="login-mobile-brand always"><span>OK</span><strong>OKSIGN</strong></div><p className="eyebrow">ตั้งค่าครั้งแรก</p><h1>สร้างองค์กรของคุณ</h1><p>ระบบจะสร้าง Role, Permission และช่องทางลูกค้าเริ่มต้นให้อัตโนมัติ</p><SetupForm defaultName={String(user.user_metadata.full_name ?? '')} /></section></main>;
}
