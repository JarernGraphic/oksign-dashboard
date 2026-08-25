import Link from 'next/link';
import { Building2, UserPlus, Users } from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { OrganizationSettingsForm } from './settings-forms';

type Organization={name:string;phone:string|null;email:string|null;tax_id:string|null;address:string|null;vat_registered:boolean;allow_withholding_tax:boolean;quotation_note:string|null;promptpay_name:string|null;promptpay_number:string|null;bank_name:string|null;bank_account_name:string|null;bank_account_number:string|null};
type Member={id:string;full_name:string;is_active:boolean;role:{code:string;name_th:string}|null};

export default async function SettingsPage(){
  const profile=await getCurrentProfile(); const supabase=await createSupabaseServerClient();
  const [{data:organization},{data:memberData}]=await Promise.all([
    supabase.from('organizations').select('name,phone,email,tax_id,address,vat_registered,allow_withholding_tax,quotation_note,promptpay_name,promptpay_number,bank_name,bank_account_name,bank_account_number').eq('id',profile.organization_id).single(),
    supabase.from('profiles').select('id,full_name,is_active,role:roles(code,name_th)').order('created_at'),
  ]);
  const members=(memberData??[]) as unknown as Member[];
  return <AppShell profile={profile} active="/settings"><div className="section-heading"><div><p>ระบบ</p><h1>ตั้งค่า</h1><span>ข้อมูลองค์กร การรับเงิน และทีมงาน</span></div></div><div className="settings-stack"><section className="panel"><div className="panel-header"><div><h2><Building2 size={17}/>ข้อมูลองค์กรและการเงิน</h2><p>ใช้เป็นค่าเริ่มต้นในใบเสนอราคาและการรับชำระ</p></div></div><div className="form-panel">{organization?<OrganizationSettingsForm organization={organization as Organization} ownerName={profile.full_name}/>:<div className="error-state">โหลดข้อมูลองค์กรไม่สำเร็จ</div>}</div></section><section className="panel"><div className="panel-header"><div><h2><Users size={17}/>ทีมงาน</h2><p>พนักงานสมัครบัญชีแอดมินหรือกราฟิกได้โดยตรง</p></div></div><div className="settings-team"><div className="member-list">{members.map((member)=><div key={member.id}><span className="avatar">{member.full_name.slice(0,1)}</span><span><strong>{member.full_name}</strong><small>{member.role?.name_th??'-'} · {member.is_active?'ใช้งาน':'ปิดใช้งาน'}</small></span></div>)}</div>{profile.role.code==='OWNER'?<div className="staff-signup-box"><UserPlus size={22}/><div><strong>เพิ่มบัญชีพนักงาน</strong><p>ให้พนักงานเปิดหน้าสมัครสมาชิกและเลือกบทบาทของตนเอง</p></div><Link className="primary-button" href="/signup">เปิดหน้าสมัครสมาชิก</Link></div>:null}</div></section></div></AppShell>;
}
