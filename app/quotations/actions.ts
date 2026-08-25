'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type QuotationFormState = { error?: string };

const itemSchema = z.object({
  description: z.string().trim().min(1, 'กรุณากรอกรายการ'),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1),
  unitPriceBaht: z.coerce.number().nonnegative(),
});

const quotationSchema = z.object({
  customerId: z.string().uuid(),
  title: z.string().trim().min(2, 'กรุณากรอกชื่อใบเสนอราคา'),
  validUntil: z.string().optional(),
  discountBaht: z.coerce.number().nonnegative(),
  includeVat: z.boolean(),
  withholdingRate: z.coerce.number().refine((value) => [0, 1, 3, 5].includes(value)),
  note: z.string().trim().optional(),
  items: z.array(itemSchema).min(1),
});

export async function createQuotationAction(_state: QuotationFormState, formData: FormData): Promise<QuotationFormState> {
  let rawItems: unknown = [];
  try { rawItems = JSON.parse(String(formData.get('items') ?? '[]')); } catch { return { error: 'รายการสินค้าไม่ถูกต้อง' }; }
  const parsed = quotationSchema.safeParse({
    customerId: formData.get('customerId'),
    title: formData.get('title'),
    validUntil: formData.get('validUntil'),
    discountBaht: formData.get('discountBaht'),
    includeVat: formData.get('includeVat') === 'on',
    withholdingRate: formData.get('withholdingRate'),
    note: formData.get('note'),
    items: rawItems,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลใบเสนอราคาไม่ถูกต้อง' };

  const supabase = await createSupabaseServerClient();
  const items = parsed.data.items.map((item, index) => ({
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unit_price_satang: Math.round(item.unitPriceBaht * 100),
    sort_order: index,
  }));
  const { data, error } = await supabase.rpc('create_quotation', {
    target_customer_id: parsed.data.customerId,
    quotation_title: parsed.data.title,
    target_valid_until: parsed.data.validUntil || null,
    discount_satang: Math.round(parsed.data.discountBaht * 100),
    include_vat: parsed.data.includeVat,
    target_withholding_rate: parsed.data.withholdingRate,
    quotation_note: parsed.data.note ?? '',
    quotation_items: items,
  });
  if (error || !data) return { error: error?.message ?? 'สร้างใบเสนอราคาไม่สำเร็จ' };
  redirect(`/quotations/${String(data)}?created=1`);
}

const statusSchema = z.object({
  quotationId: z.string().uuid(),
  status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CANCELLED']),
});

export async function updateQuotationStatusAction(formData: FormData) {
  const parsed = statusSchema.safeParse({ quotationId: formData.get('quotationId'), status: formData.get('status') });
  if (!parsed.success) return;
  const supabase = await createSupabaseServerClient();
  await supabase.from('quotations').update({ status: parsed.data.status }).eq('id', parsed.data.quotationId);
  revalidatePath('/quotations');
  revalidatePath(`/quotations/${parsed.data.quotationId}`);
}

export async function createJobFromQuotationAction(formData: FormData) {
  const quotationId = z.string().uuid().safeParse(formData.get('quotationId'));
  if (!quotationId.success) return;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_job_from_quotation', { target_quotation_id: quotationId.data });
  if (error || !data) redirect(`/quotations/${quotationId.data}?error=job_create_failed`);
  redirect(`/jobs/${String(data)}?created=1`);
}

