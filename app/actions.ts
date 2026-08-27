'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../lib/supabase/server';

export async function updateMyProfileAction(formData: FormData) {
  const nickname = String(formData.get('nickname') ?? '').trim();
  const avatarBase64 = String(formData.get('avatarBase64') ?? '').trim();
  const avatarUrlInput = String(formData.get('avatarUrl') ?? '').trim();
  const roleCode = String(formData.get('roleCode') ?? '').trim();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'กรุณาเข้าสู่ระบบ' };

  if (!nickname) {
    return { error: 'กรุณาระบุชื่อเล่นหรือชื่อที่ต้องการให้แสดง' };
  }

  let finalAvatarUrl: string | null = avatarUrlInput || null;

  if (avatarBase64 && avatarBase64.startsWith('data:image/')) {
    finalAvatarUrl = avatarBase64;
  }

  // 1. Resolve role if roleCode is provided
  let roleId: string | undefined = undefined;
  if (roleCode) {
    const { data: targetRole } = await supabase
      .from('roles')
      .select('id')
      .eq('code', roleCode)
      .limit(1)
      .maybeSingle();

    if (targetRole) {
      roleId = targetRole.id;
    }
  }

  // 2. Update public.profiles
  const updatePayload: { full_name: string; avatar_url?: string | null; role_id?: string } = {
    full_name: nickname,
  };
  if (finalAvatarUrl !== undefined) {
    updatePayload.avatar_url = finalAvatarUrl;
  }
  if (roleId) {
    updatePayload.role_id = roleId;
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id);

  if (profileErr) {
    return { error: `บันทึกข้อมูลไม่สำเร็จ: ${profileErr.message}` };
  }

  // 3. Update Supabase auth user_metadata
  try {
    await supabase.auth.updateUser({
      data: {
        full_name: nickname,
        ...(finalAvatarUrl !== undefined ? { avatar_url: finalAvatarUrl } : {}),
      },
    });
  } catch {}

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/', 'layout');
  revalidatePath('/');
  revalidatePath('/jobs');
  revalidatePath('/settings');
  revalidatePath('/profile');
  revalidatePath('/staff');

  return { success: 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว' };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/login');
}
