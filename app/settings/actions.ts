'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type SettingsState = { error?: string; success?: string };

const settingsSchema = z.object({
  organizationName: z.string().trim().min(2),
  ownerName: z.string().trim().min(2),
  phone: z.string().trim().optional(),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  taxId: z.string().trim().optional(),
  address: z.string().trim().optional(),
  vatRegistered: z.boolean(),
  allowWithholding: z.boolean(),
  quotationNote: z.string().trim().optional(),
  promptpayName: z.string().trim().optional(),
  promptpayNumber: z.string().trim().optional(),
  bankName: z.string().trim().optional(),
  bankAccountName: z.string().trim().optional(),
  bankAccountNumber: z.string().trim().optional(),
});

export async function updateSettingsAction(_state: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = settingsSchema.safeParse({
    organizationName: formData.get('organizationName'),
    ownerName: formData.get('ownerName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    taxId: formData.get('taxId'),
    address: formData.get('address'),
    vatRegistered: formData.get('vatRegistered') === 'on',
    allowWithholding: formData.get('allowWithholding') === 'on',
    quotationNote: formData.get('quotationNote'),
    promptpayName: formData.get('promptpayName'),
    promptpayNumber: formData.get('promptpayNumber'),
    bankName: formData.get('bankName'),
    bankAccountName: formData.get('bankAccountName'),
    bankAccountNumber: formData.get('bankAccountNumber'),
  });

  if (!parsed.success) return { error: 'กรุณาตรวจข้อมูลชื่อองค์กร ชื่อผู้ใช้ และอีเมล' };

  const profile = await getCurrentProfile();
  if (profile.role.code !== 'OWNER') return { error: 'เฉพาะ Owner เท่านั้นที่แก้ไขการตั้งค่าองค์กรได้' };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('organizations')
    .update({
      name: parsed.data.organizationName,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      tax_id: parsed.data.taxId || null,
      address: parsed.data.address || null,
      vat_registered: parsed.data.vatRegistered,
      default_vat_rate: parsed.data.vatRegistered ? 7 : 0,
      allow_withholding_tax: parsed.data.allowWithholding,
      quotation_note: parsed.data.quotationNote || null,
      promptpay_name: parsed.data.promptpayName || null,
      promptpay_number: parsed.data.promptpayNumber || null,
      bank_name: parsed.data.bankName || null,
      bank_account_name: parsed.data.bankAccountName || null,
      bank_account_number: parsed.data.bankAccountNumber || null,
    })
    .eq('id', profile.organization_id);

  if (error) return { error: error.message };

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.ownerName })
    .eq('id', profile.id);

  if (profileError) return { error: profileError.message };

  revalidatePath('/settings');
  revalidatePath('/');
  return { success: 'บันทึกการตั้งค่าเรียบร้อยแล้ว' };
}

// ----------------------------------------------------
// Team Management Server Actions
// ----------------------------------------------------

export async function approveMemberAction(memberId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const profile = await getCurrentProfile();
    if (profile.role.code !== 'OWNER') {
      return { error: 'เฉพาะ Owner เท่านั้นที่สามารถอนุมัติสมาชิกได้' };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: true })
      .eq('id', memberId)
      .eq('organization_id', profile.organization_id);

    if (error) return { error: error.message };

    revalidatePath('/settings');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอนุมัติ' };
  }
}

export async function updateMemberRoleAction(
  memberId: string,
  roleId: string
): Promise<{ success?: boolean; error?: string }> {
  try {
    const profile = await getCurrentProfile();
    if (profile.role.code !== 'OWNER') {
      return { error: 'เฉพาะ Owner เท่านั้นที่สามารถเปลี่ยนตำแหน่งสมาชิกได้' };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('profiles')
      .update({ role_id: roleId })
      .eq('id', memberId)
      .eq('organization_id', profile.organization_id);

    if (error) return { error: error.message };

    revalidatePath('/settings');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนตำแหน่ง' };
  }
}

export async function toggleMemberStatusAction(
  memberId: string,
  isActive: boolean
): Promise<{ success?: boolean; error?: string }> {
  try {
    const profile = await getCurrentProfile();
    if (profile.role.code !== 'OWNER') {
      return { error: 'เฉพาะ Owner เท่านั้นที่สามารถเปิด/ปิดการใช้งานสมาชิกได้' };
    }

    if (memberId === profile.id && !isActive) {
      return { error: 'ไม่สามารถระงับบัญชีของตนเองได้' };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', memberId)
      .eq('organization_id', profile.organization_id);

    if (error) return { error: error.message };

    revalidatePath('/settings');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ' };
  }
}

export async function deleteMemberAction(memberId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const profile = await getCurrentProfile();
    if (profile.role.code !== 'OWNER') {
      return { error: 'เฉพาะ Owner เท่านั้นที่สามารถลบสมาชิกได้' };
    }

    if (memberId === profile.id) {
      return { error: 'ไม่สามารถลบบัญชีของตนเองได้' };
    }

    const supabase = await createSupabaseServerClient();

    // 1. Soft-delete first to ensure immediate removal even if RLS delete policy or Foreign Keys restrict hard deletion
    await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', memberId)
      .eq('organization_id', profile.organization_id);

    // 2. Attempt hard delete
    await supabase
      .from('profiles')
      .delete()
      .eq('id', memberId)
      .eq('organization_id', profile.organization_id);

    revalidatePath('/settings');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบสมาชิก' };
  }
}

