import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';

export const OKSIGN_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export type CurrentProfile = {
  id: string;
  organization_id: string;
  full_name: string;
  role: { code: string; name_th: string };
  organization: { name: string };
};

export async function getCurrentProfile(): Promise<CurrentProfile> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let { data: profile } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name, is_active, role:roles(code,name_th), organization:organizations(name)')
    .eq('id', user.id)
    .single();

  // If no profile exists yet for this user, automatically initialize them into OKSIGN store!
  if (!profile) {
    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Staff';

    const isOwner =
      user.email?.includes('oksign_owner') ||
      user.user_metadata?.username === 'oksign_owner';
    const targetRoleCode = isOwner ? 'OWNER' : 'ADMIN';

    // Query appropriate role
    const { data: targetRole } = await supabase
      .from('roles')
      .select('id')
      .eq('organization_id', OKSIGN_ORG_ID)
      .eq('code', targetRoleCode)
      .single();

    if (targetRole) {
      await supabase.from('profiles').upsert({
        id: user.id,
        organization_id: OKSIGN_ORG_ID,
        role_id: targetRole.id,
        full_name: displayName,
        is_active: true,
      });

      const { data: createdProfile } = await supabase
        .from('profiles')
        .select('id, organization_id, full_name, is_active, role:roles(code,name_th), organization:organizations(name)')
        .eq('id', user.id)
        .single();

      if (createdProfile) {
        profile = createdProfile;
      }
    }
  }

  if (profile) {
    return profile as unknown as CurrentProfile;
  }

  // Fallback return
  const isOwner =
    user.email?.includes('oksign_owner') ||
    user.user_metadata?.username === 'oksign_owner';

  return {
    id: user.id,
    organization_id: OKSIGN_ORG_ID,
    full_name: user.user_metadata?.full_name || (isOwner ? 'OKSIGN OWNER' : 'Staff'),
    role: isOwner
      ? { code: 'OWNER', name_th: 'เจ้าของร้าน' }
      : { code: 'ADMIN', name_th: 'แอดมิน / ทีมงาน' },
    organization: { name: 'OKSIGN' },
  };
}
