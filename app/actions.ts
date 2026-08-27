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

export type NotificationItem = {
  id: string;
  title: string;
  message: string | null;
  notification_type: string;
  created_at: string;
  job_id: string | null;
  is_read: boolean;
  sender?: { full_name: string; avatar_url: string | null } | null;
};

export async function getNotificationsAction(): Promise<{ notifications: NotificationItem[]; unreadCount: number }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { notifications: [], unreadCount: 0 };

    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('id, title, message, notification_type, created_at, job_id, is_read, sender:profiles!sender_id(full_name, avatar_url)')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(15);

    if (!error && notifs && notifs.length > 0) {
      const notifications = notifs as unknown as NotificationItem[];
      const unreadCount = notifications.filter((n) => !n.is_read).length;
      return { notifications, unreadCount };
    }

    // Smart Fallback: query jobs assigned to user
    const { data: assignedJobs } = await supabase
      .from('jobs')
      .select('id, job_number, title, stage, status, design_status, created_at, created_by, customer:customers(name)')
      .eq('assigned_graphic_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (assignedJobs && assignedJobs.length > 0) {
      const derivedNotifications: NotificationItem[] = assignedJobs.map((j: any) => {
        let type = 'JOB_ASSIGNED';
        let title = `งานใหม่ [${j.job_number || 'Job'}] ${j.title}`;
        let message = `คุณได้รับมอบหมายให้ออกแบบงานนี้${j.customer?.name ? ` (ลูกค้า: ${j.customer.name})` : ''}`;
        const isUnread = j.stage === 'ADMIN' || j.design_status === 'WAITING_DESIGN' || j.design_status === 'REVISION';

        if (j.design_status === 'APPROVED') {
          type = 'CUSTOMER_APPROVED';
          title = `ลูกค้ายืนยันแบบแล้ว [${j.job_number || 'Job'}]`;
          message = `งาน "${j.title}" ได้รับการอนุมัติแบบแล้ว พร้อมเข้าสู่ฝ่ายผลิต`;
        } else if (j.design_status === 'REVISION') {
          type = 'REVISION_REQUESTED';
          title = `ลูกค้าขอแก้ไขแบบ [${j.job_number || 'Job'}]`;
          message = `งาน "${j.title}" มีการขอปรับแก้แบบร่าง`;
        }

        return {
          id: j.id,
          title,
          message,
          notification_type: type,
          created_at: j.created_at,
          job_id: j.id,
          is_read: !isUnread,
        };
      });

      const unreadCount = derivedNotifications.filter((n) => !n.is_read).length;
      return { notifications: derivedNotifications, unreadCount };
    }

    return { notifications: [], unreadCount: 0 };
  } catch (err) {
    console.error('getNotificationsAction error:', err);
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markNotificationAsReadAction(notificationId: string): Promise<{ success: boolean }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false };

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('recipient_id', user.id);

    return { success: true };
  } catch (err) {
    console.error('markNotificationAsReadAction error:', err);
    return { success: false };
  }
}

export async function markAllNotificationsAsReadAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false };

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    return { success: true };
  } catch (err) {
    console.error('markAllNotificationsAsReadAction error:', err);
    return { success: false };
  }
}
