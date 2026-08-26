'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type JobFormState = { error?: string };

export async function createJobAction(_state: JobFormState, formData: FormData): Promise<JobFormState> {
  const customerId = String(formData.get('customerId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  if (!customerId || !title) return { error: 'กรุณาเลือกลูกค้าและระบุชื่องาน' };

  let dimensions = String(formData.get('dimensions') ?? '').trim();
  const width = String(formData.get('width') ?? '').trim();
  const height = String(formData.get('height') ?? '').trim();
  if (!dimensions && (width || height)) {
    dimensions = width && height ? `${width} × ${height}` : (width || height);
  }
  const material = String(formData.get('material') ?? '').trim();
  const quantity = Math.max(1, parseInt(String(formData.get('quantity') ?? '1'), 10) || 1);
  const unitPrice = parseFloat(String(formData.get('unitPrice') ?? '0')) || 0;
  const installCost = parseFloat(String(formData.get('installCost') ?? '0')) || 0;
  const totalBaht = parseFloat(String(formData.get('totalBaht') ?? '0')) || ((quantity * unitPrice) + installCost);
  const depositBaht = parseFloat(String(formData.get('depositBaht') ?? '0')) || 0;
  const depositMethod = String(formData.get('depositMethod') ?? 'BANK_TRANSFER');
  const deadline = String(formData.get('deadline') ?? '');
  const priority = String(formData.get('priority') ?? 'NORMAL');
  const graphicId = String(formData.get('graphicId') ?? '') || null;

  // Extract structured Job Order Spec
  const receiverName = String(formData.get('receiverName') ?? '').trim();
  const installLocation = String(formData.get('installLocation') ?? '').trim();
  const remainingMethod = String(formData.get('remainingMethod') ?? 'BANK_TRANSFER');
  const openedDate = String(formData.get('openedDate') ?? '');
  const dueDate = String(formData.get('dueDate') ?? '');
  const designCondition = String(formData.get('designCondition') ?? '');
  const contactChannel = String(formData.get('contactChannel') ?? '');
  const shapes = formData.getAll('shapes').map(String);
  const printers = formData.getAll('printers').map(String);
  const materials = formData.getAll('materials').map(String);
  const boardTypes = formData.getAll('boardTypes').map(String);
  const finishing = formData.getAll('finishing').map(String);
  const notes = String(formData.get('notes') ?? '').trim();
  const customMaterial = String(formData.get('customMaterial') ?? '').trim();
  const customFinishing = String(formData.get('customFinishing') ?? '').trim();

  const specObject = {
    receiverName,
    title,
    width,
    height,
    dimensions,
    priority,
    quantity,
    unitPrice,
    installCost,
    installLocation,
    totalBaht,
    depositBaht,
    depositMethod,
    remainingBaht: Math.max(0, totalBaht - depositBaht),
    remainingMethod,
    openedDate,
    dueDate,
    designCondition,
    contactChannel,
    shapes,
    printers,
    materials,
    customMaterial,
    boardTypes,
    finishing,
    customFinishing,
    notes,
  };

  const requirementsText = JSON.stringify(specObject);

  const supabase = await createSupabaseServerClient();
  const { data: newJobId, error } = await supabase.rpc('create_job_from_brief', {
    target_customer_id: customerId,
    job_title: title,
    brief_requirements: requirementsText,
    brief_dimensions: dimensions,
    brief_material: material || materials.join(', '),
    brief_quantity: quantity,
    target_deadline: deadline ? new Date(deadline).toISOString() : (dueDate ? new Date(dueDate).toISOString() : null),
    target_priority: ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority) ? priority : (['VERY_URGENT', 'NOON', 'EVENING'].includes(priority) ? 'URGENT' : 'NORMAL'),

    total_satang: Math.round(totalBaht * 100),
    target_graphic_id: graphicId,
  });

  if (error || !newJobId) return { error: error?.message ?? 'ไม่สามารถเปิด Job ได้' };

  // Ensure job_number strictly follows 7-digit format: YYMMNNN (e.g. 6908001 - 6908999)
  const now = new Date();
  const yy = String((now.getFullYear() + 543) % 100).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `${yy}${mm}`;

  const { data: existingJob } = await supabase
    .from('jobs')
    .select('id, job_number')
    .eq('id', String(newJobId))
    .single();

  if (existingJob && (!existingJob.job_number || !existingJob.job_number.startsWith(prefix) || existingJob.job_number.includes('-'))) {
    const { data: monthJobs } = await supabase
      .from('jobs')
      .select('job_number')
      .like('job_number', `${prefix}%`)
      .order('job_number', { ascending: false })
      .limit(1);

    let nextSeq = 1;
    if (monthJobs?.[0]?.job_number && monthJobs[0].job_number.length === 7) {
      const lastSeq = parseInt(monthJobs[0].job_number.slice(4), 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
    const formattedJobNumber = `${prefix}${String(nextSeq).padStart(3, '0')}`;
    await supabase.from('jobs').update({ job_number: formattedJobNumber }).eq('id', String(newJobId));
  }

  // If deposit was paid, record initial deposit
  if (depositBaht > 0) {
    await supabase.rpc('record_job_payment', {
      target_job_id: String(newJobId),
      payment_amount_satang: Math.round(depositBaht * 100),
      target_method: depositMethod === 'CASH' ? 'CASH' : 'BANK_TRANSFER',
      target_payment_type: 'DEPOSIT',
      target_reference: 'มัดจำตอนเปิดใบงาน',
      target_note: `มัดจำ ${depositMethod === 'CASH' ? 'เงินสด' : 'โอนจ่าย'}`,
      target_slip_path: '',
    });
  }

  revalidatePath('/jobs');
  revalidatePath('/');
  redirect(`/jobs/${String(newJobId)}?created=1`);
}

const stageSchema = z.object({ jobId: z.string().uuid(), stage: z.enum(['ADMIN', 'DESIGN', 'PRODUCTION', 'DELIVERY', 'COMPLETE']) });
export async function updateJobStageAction(formData: FormData) {
  const parsed = stageSchema.safeParse({ jobId: formData.get('jobId'), stage: formData.get('stage') });
  if (!parsed.success) return;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('jobs').update({
    stage: parsed.data.stage,
    status: parsed.data.stage === 'COMPLETE' ? 'COMPLETED' : 'OPEN',
    completed_at: parsed.data.stage === 'COMPLETE' ? new Date().toISOString() : null,
    design_status: parsed.data.stage === 'DESIGN' ? 'DESIGNING' : parsed.data.stage === 'PRODUCTION' ? 'APPROVED' : undefined,
  }).eq('id', parsed.data.jobId);

  if (!error) {
    await supabase.from('activity_logs').insert({
      organization_id: profile.organization_id,
      entity_type: 'JOB',
      entity_id: parsed.data.jobId,
      action: `STAGE_CHANGED_${parsed.data.stage}`,
      user_id: profile.id,
      metadata: {},
    });
  }
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  revalidatePath('/');
  revalidatePath('/jobs');
}

export type PaymentFormState = { error?: string; success?: string };
const paymentSchema = z.object({
  jobId: z.string().uuid(),
  amountBaht: z.coerce.number().positive(),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'PROMPTPAY', 'OTHER']),
  paymentType: z.enum(['DEPOSIT', 'INSTALLMENT', 'FINAL']),
  reference: z.string().trim().optional(),
  note: z.string().trim().optional(),
});
const allowedSlipTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export async function recordPaymentAction(_state: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  const parsed = paymentSchema.safeParse({
    jobId: formData.get('jobId'),
    amountBaht: formData.get('amountBaht'),
    method: formData.get('method'),
    paymentType: formData.get('paymentType'),
    reference: formData.get('reference'),
    note: formData.get('note'),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลรับชำระไม่ถูกต้อง' };
  const slip = formData.get('slip');
  if (slip instanceof File && slip.size > 0 && (!allowedSlipTypes.has(slip.type) || slip.size > 5 * 1024 * 1024)) {
    return { error: 'สลิปรองรับ JPG, PNG, WebP หรือ PDF ขนาดไม่เกิน 5 MB' };
  }

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();
  let slipPath = '';
  if (slip instanceof File && slip.size > 0) {
    const safeName = slip.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    slipPath = `${profile.organization_id}/${parsed.data.jobId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('payment-slips').upload(slipPath, slip, { contentType: slip.type, upsert: false });
    if (uploadError) return { error: `อัปโหลดสลิปไม่สำเร็จ: ${uploadError.message}` };
  }
  const { error } = await supabase.rpc('record_job_payment', {
    target_job_id: parsed.data.jobId,
    payment_amount_satang: Math.round(parsed.data.amountBaht * 100),
    target_method: parsed.data.method,
    target_payment_type: parsed.data.paymentType,
    target_reference: parsed.data.reference ?? '',
    target_note: parsed.data.note ?? '',
    target_slip_path: slipPath,
  });
  if (error) {
    if (slipPath) await supabase.storage.from('payment-slips').remove([slipPath]);
    return { error: error.message.includes('payment_exceeds_remaining') ? 'ยอดรับชำระมากกว่ายอดคงเหลือ' : error.message };
  }
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  revalidatePath('/');
  revalidatePath('/payments');
  return { success: 'บันทึกรับชำระเรียบร้อยแล้ว' };
}
