import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';

export const OKSIGN_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export type CurrentProfile = {
  id: string;
  organization_id: string;
  full_name: string;
  avatar_url?: string | null;
  is_active: boolean;
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
    .select('id, organization_id, full_name, avatar_url, is_active, role:roles(code,name_th), organization:organizations(name)')
    .eq('id', user.id)
    .maybeSingle();

  // If no profile exists yet for this user, attempt auto-initialization
  if (!profile) {
    // Check how many profiles currently exist in the system
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // First user or explicitly named owner gets OWNER role + active immediately
    const isFirstUser = count === 0;
    const isNamedOwner =
      user.email?.includes('oksign_owner') ||
      user.user_metadata?.username === 'oksign_owner';
    const isOwner = isFirstUser || isNamedOwner;

    const targetRoleCode = isOwner ? 'OWNER' : 'ADMIN';
    const isActiveStatus = isOwner; // Non-owner users require owner approval

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'Staff';

    // Find role in the database
    let { data: targetRole } = await supabase
      .from('roles')
      .select('id, organization_id')
      .eq('code', targetRoleCode)
      .limit(1)
      .maybeSingle();

    // Fallback if specific role code wasn't found
    if (!targetRole) {
      const { data: anyRole } = await supabase
        .from('roles')
        .select('id, organization_id')
        .limit(1)
        .maybeSingle();
      targetRole = anyRole;
    }

    if (targetRole) {
      const orgId = targetRole.organization_id || OKSIGN_ORG_ID;

      await supabase.from('profiles').upsert({
        id: user.id,
        organization_id: orgId,
        role_id: targetRole.id,
        full_name: displayName,
        avatar_url: user.user_metadata?.avatar_url || null,
        is_active: isActiveStatus,
      });

      const { data: createdProfile } = await supabase
        .from('profiles')
        .select('id, organization_id, full_name, avatar_url, is_active, role:roles(code,name_th), organization:organizations(name)')
        .eq('id', user.id)
        .maybeSingle();

      if (createdProfile) {
        profile = createdProfile;
      }
    }
  }

  // If profile exists, check if user is approved to use the dashboard
  if (profile) {
    const roleCode = (profile.role as any)?.code;
    const isOwner = roleCode === 'OWNER';

    // If not owner and not active/approved, redirect to pending approval page
    if (!isOwner && !profile.is_active) {
      redirect('/pending-approval');
    }

    return {
      id: profile.id,
      organization_id: profile.organization_id || OKSIGN_ORG_ID,
      full_name: profile.full_name || 'Staff',
      avatar_url: profile.avatar_url || null,
      is_active: profile.is_active ?? true,
      role: (profile.role as any) || { code: 'OWNER', name_th: 'เจ้าของร้าน' },
      organization: (profile.organization as any) || { name: 'OKSIGN' },
    };
  }

  // If still completely missing, redirect to setup
  redirect('/setup');
}
