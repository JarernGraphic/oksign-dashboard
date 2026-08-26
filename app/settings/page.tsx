import { Building2, Users } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { OrganizationSettingsForm } from './settings-forms';
import { TeamManager, type RoleOption, type TeamMember } from './team-manager';

type Organization = {
  name: string;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  address: string | null;
  vat_registered: boolean;
  allow_withholding_tax: boolean;
  quotation_note: string | null;
  promptpay_name: string | null;
  promptpay_number: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
};

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const [{ data: organization }, { data: memberData }, { data: rolesData }] = await Promise.all([
    supabase
      .from('organizations')
      .select(
        'name,phone,email,tax_id,address,vat_registered,allow_withholding_tax,quotation_note,promptpay_name,promptpay_number,bank_name,bank_account_name,bank_account_number'
      )
      .eq('id', profile.organization_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, is_active, role_id, role:roles(id, code, name_th)')
      .is('deleted_at', null)
      .order('created_at', { ascending: true }),
    supabase
      .from('roles')
      .select('id, code, name_th, description')
      .eq('organization_id', profile.organization_id)
      .order('code'),
  ]);

  const members = (memberData ?? []) as unknown as TeamMember[];
  const roles = (rolesData ?? []) as unknown as RoleOption[];
  const isOwner = profile.role.code === 'OWNER';

  return (
    <AppShell profile={profile} active="/settings">
      <div className="section-heading">
        <div>
          <p>ระบบ</p>
          <h1>ตั้งค่า</h1>
          <span>ข้อมูลองค์กร การรับเงิน และจัดการสมาชิกทีมงาน</span>
        </div>
      </div>

      <div className="settings-stack">
        {/* Team Members Management Section */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                <Users size={18} />
                จัดการสมาชิกทีมงาน & สิทธิ์การเข้าใช้งาน
              </h2>
              <p>อนุมัติสิทธิ์พนักงานใหม่ที่ล็อกอินผ่าน LINE และกำหนดตำแหน่งหน้าที่ของแต่ละคน</p>
            </div>
          </div>
          <div style={{ padding: '20px' }}>
            <TeamManager
              members={members}
              roles={roles}
              currentUserId={profile.id}
              isOwner={isOwner}
            />
          </div>
        </section>

        {/* Organization Info Section */}
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>
                <Building2 size={18} />
                ข้อมูลองค์กรและการเงิน
              </h2>
              <p>ใช้เป็นค่าเริ่มต้นในใบเสนอราคาและการรับชำระเงิน</p>
            </div>
          </div>
          <div className="form-panel">
            {organization ? (
              <OrganizationSettingsForm organization={organization as Organization} ownerName={profile.full_name} />
            ) : (
              <div className="error-state">โหลดข้อมูลองค์กรไม่สำเร็จ</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
