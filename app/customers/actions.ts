'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type CustomerFormState = { error?: string };
const customerSchema = z.object({
  name: z.string().trim().min(2, 'กรุณากรอกชื่อลูกค้า'),
  customerType: z.enum(['PERSON','BUSINESS']), phone: z.string().trim().optional(),
  email: z.union([z.literal(''), z.string().email('อีเมลไม่ถูกต้อง')]).optional(),
  lineName: z.string().trim().optional(), facebookName: z.string().trim().optional(),
  leadSourceId: z.string().uuid().optional().or(z.literal('')), note: z.string().trim().optional(),
});

export async function createCustomerAction(_state: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const parsed = customerSchema.safeParse({ name: formData.get('name'), customerType: formData.get('customerType'), phone: formData.get('phone'), email: formData.get('email'), lineName: formData.get('lineName'), facebookName: formData.get('facebookName'), leadSourceId: formData.get('leadSourceId'), note: formData.get('note') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('customers').insert({
    organization_id: profile.organization_id, customer_number: '', customer_type: parsed.data.customerType,
    name: parsed.data.name, phone: parsed.data.phone || null, email: parsed.data.email || null,
    line_name: parsed.data.lineName || null, facebook_name: parsed.data.facebookName || null,
    lead_source_id: parsed.data.leadSourceId || null, note: parsed.data.note || null, created_by: profile.id,
  });
  if (error) return { error: error.message };
  redirect('/customers?created=1');
}
