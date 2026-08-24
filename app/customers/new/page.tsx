import { AppShell } from '../../../components/app-shell';
import { getCurrentProfile } from '../../../lib/current-profile';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { CustomerForm } from './customer-form';

export default async function NewCustomerPage() {
  const profile = await getCurrentProfile(); const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('lead_sources').select('id,name').eq('is_active', true).order('name');
  return <AppShell profile={profile} active="/customers"><div className="section-heading"><div><p>งานขาย / ลูกค้า</p><h1>เพิ่มลูกค้าใหม่</h1><span>ข้อมูลนี้จะถูกนำไปใช้ต่อใน Brief และ Job อัตโนมัติ</span></div></div><section className="panel form-panel"><CustomerForm leadSources={(data ?? []) as { id: string; name: string }[]} /></section></AppShell>;
}
