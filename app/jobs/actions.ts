'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type JobFormState = { error?: string };
const jobSchema = z.object({ customerId: z.string().uuid(), title: z.string().trim().min(2), requirements: z.string().trim().min(2), dimensions: z.string().trim().optional(), material: z.string().trim().optional(), quantity: z.coerce.number().int().positive(), deadline: z.string().optional(), priority: z.enum(['LOW','NORMAL','HIGH','URGENT']), totalBaht: z.coerce.number().nonnegative(), graphicId: z.string().uuid().optional().or(z.literal('')) });

export async function createJobAction(_state: JobFormState, formData: FormData): Promise<JobFormState> {
  const parsed = jobSchema.safeParse({ customerId: formData.get('customerId'), title: formData.get('title'), requirements: formData.get('requirements'), dimensions: formData.get('dimensions'), material: formData.get('material'), quantity: formData.get('quantity'), deadline: formData.get('deadline'), priority: formData.get('priority'), totalBaht: formData.get('totalBaht'), graphicId: formData.get('graphicId') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_job_from_brief', { target_customer_id: parsed.data.customerId, job_title: parsed.data.title, brief_requirements: parsed.data.requirements, brief_dimensions: parsed.data.dimensions ?? '', brief_material: parsed.data.material ?? '', brief_quantity: parsed.data.quantity, target_deadline: parsed.data.deadline ? new Date(parsed.data.deadline).toISOString() : null, target_priority: parsed.data.priority, total_satang: Math.round(parsed.data.totalBaht * 100), target_graphic_id: parsed.data.graphicId || null });
  if (error || !data) return { error: error?.message ?? 'ไม่สามารถเปิด Job ได้' };
  redirect(`/jobs/${String(data)}?created=1`);
}

const stageSchema = z.object({ jobId: z.string().uuid(), stage: z.enum(['ADMIN','DESIGN','PRODUCTION','DELIVERY','COMPLETE']) });
export async function updateJobStageAction(formData: FormData) {
  const parsed = stageSchema.safeParse({ jobId: formData.get('jobId'), stage: formData.get('stage') });
  if (!parsed.success) return;
  const profile = await getCurrentProfile(); const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('jobs').update({ stage: parsed.data.stage, status: parsed.data.stage === 'COMPLETE' ? 'COMPLETED' : 'OPEN', completed_at: parsed.data.stage === 'COMPLETE' ? new Date().toISOString() : null, design_status: parsed.data.stage === 'DESIGN' ? 'DESIGNING' : parsed.data.stage === 'PRODUCTION' ? 'APPROVED' : undefined }).eq('id', parsed.data.jobId);
  if (!error) await supabase.from('activity_logs').insert({ organization_id: profile.organization_id, entity_type: 'JOB', entity_id: parsed.data.jobId, action: `STAGE_CHANGED_${parsed.data.stage}`, user_id: profile.id, metadata: {} });
  revalidatePath(`/jobs/${parsed.data.jobId}`); revalidatePath('/'); revalidatePath('/jobs');
}

const paymentSchema = z.object({ jobId: z.string().uuid(), amountBaht: z.coerce.number().positive(), method: z.enum(['CASH','BANK_TRANSFER','PROMPTPAY','OTHER']), reference: z.string().trim().optional() });
export async function recordPaymentAction(formData: FormData) {
  const parsed = paymentSchema.safeParse({ jobId: formData.get('jobId'), amountBaht: formData.get('amountBaht'), method: formData.get('method'), reference: formData.get('reference') });
  if (!parsed.success) return;
  const profile = await getCurrentProfile(); const supabase = await createSupabaseServerClient();
  await supabase.from('payments').insert({ organization_id: profile.organization_id, job_id: parsed.data.jobId, amount_satang: Math.round(parsed.data.amountBaht * 100), method: parsed.data.method, reference: parsed.data.reference || null, created_by: profile.id });
  revalidatePath(`/jobs/${parsed.data.jobId}`); revalidatePath('/');
}
