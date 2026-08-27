import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';

export const OKSIGN_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

export type CurrentProfile = {
  id: string;
  organization_id: string;
  full_name: string;
  email?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  role: { code: string; name_th: string };
  organization: { name: string; id?: string };
  unreadCount?: number;
};

export const getCurrentProfile = cache(async (): Promise<CurrentProfile> => {
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

    const targetRoleCode = isOwner ? 'OWNER' : 'GRAPHIC';
    const isActiveStatus = true;

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

  // If profile exists, ensure active access to dashboard
  if (profile) {
    if (!profile.is_active) {
      try {
        await supabase.from('profiles').update({ is_active: true }).eq('id', profile.id);
        profile.is_active = true;
      } catch {
        // Ignore update failure
      }
    }

    let unreadCount = 0;
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', profile.id)
        .eq('is_read', false);
      if (count && !error) {
        unreadCount = count;
      } else if (error) {
        // Fallback: count pending assigned jobs for this graphic
        const { count: pendingJobCount } = await supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('assigned_graphic_id', profile.id)
          .or('stage.eq.ADMIN,design_status.eq.WAITING_DESIGN');
        if (pendingJobCount) unreadCount = pendingJobCount;
      }
    } catch {
      // Ignore if error
    }

    const roleData = profile.role as unknown as { code: string; name_th: string } | null;
    const orgData = profile.organization as unknown as { name: string } | null;

    return {
      id: profile.id,
      organization_id: profile.organization_id || OKSIGN_ORG_ID,
      full_name: profile.full_name || 'Staff',
      email: user.email || null,
      avatar_url: profile.avatar_url || null,
      is_active: profile.is_active ?? true,
      role: roleData || { code: 'OWNER', name_th: 'เจ้าของร้าน' },
      organization: { id: profile.organization_id || OKSIGN_ORG_ID, name: orgData?.name || 'OKSIGN' },
      unreadCount,
    };
  }

  // If still completely missing, redirect to setup
  redirect('/setup');
});
