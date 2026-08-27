'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getCurrentProfile, OKSIGN_ORG_ID } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type JobFormState = { error?: string };

export async function createJobAction(_state: JobFormState, formData: FormData): Promise<JobFormState> {
  const customerId = String(formData.get('customerId') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();
  const graphicId = String(formData.get('graphicId') ?? '').trim();
  const shapes = formData.getAll('shapes').map(String);

  if (!customerId || !title) return { error: 'กรุณาเลือกลูกค้าและระบุชื่องาน' };
  if (!shapes || shapes.length === 0) return { error: 'กรุณาเลือกลักษณะของงาน (รูปทรง)' };
  if (!graphicId) return { error: 'กรุณาเลือกกราฟิกผู้รับผิดชอบงาน' };

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
  const depositMethod = String(formData.get('depositMethod') ?? '').trim();
  const deadline = String(formData.get('deadline') ?? '');
  const priority = String(formData.get('priority') ?? 'NORMAL');

  // Extract structured Job Order Spec
  const receiverName = String(formData.get('receiverName') ?? '').trim();
  const installLocation = String(formData.get('installLocation') ?? '').trim();
  const remainingMethod = String(formData.get('remainingMethod') ?? '').trim();
  const openedDate = String(formData.get('openedDate') ?? '');
  const dueDate = String(formData.get('dueDate') ?? '');
  const designCondition = String(formData.get('designCondition') ?? '');
  const contactChannel = String(formData.get('contactChannel') ?? '');
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
  const profile = await getCurrentProfile();
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
    await supabase.from('jobs').update({
      job_number: formattedJobNumber,
      stage: 'ADMIN',
      design_status: 'WAITING_DESIGN',
    }).eq('id', String(newJobId));
  } else {
    await supabase.from('jobs').update({
      stage: 'ADMIN',
      design_status: 'WAITING_DESIGN',
    }).eq('id', String(newJobId));
  }

  // If deposit was paid, record initial deposit
  if (depositBaht > 0) {
    await supabase.rpc('record_job_payment', {
      target_job_id: String(newJobId),
      payment_amount_satang: Math.round(depositBaht * 100),
      target_method: depositMethod === 'CASH' ? 'CASH' : (depositMethod === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'OTHER'),
      target_payment_type: 'DEPOSIT',
      target_reference: 'มัดจำตอนเปิดใบงาน',
      target_note: depositMethod ? `มัดจำ ${depositMethod === 'CASH' ? 'เงินสด' : 'โอนจ่าย'}` : 'มัดจำตอนเปิดใบงาน',
      target_slip_path: '',
    });
  }

  revalidatePath('/jobs');
  revalidatePath('/');
  revalidatePath('/notifications');

  // Trigger notification to graphic designer if assigned
  if (graphicId && newJobId) {
    try {
      const { data: createdJobData } = await supabase
        .from('jobs')
        .select('job_number')
        .eq('id', String(newJobId))
        .single();

      const jobNumber = createdJobData?.job_number || '';
      await supabase.from('notifications').insert({
        organization_id: profile.organization_id || OKSIGN_ORG_ID,
        recipient_id: graphicId,
        sender_id: profile.id,
        job_id: String(newJobId),
        notification_type: 'JOB_ASSIGNED',
        title: jobNumber ? `งานใหม่ [${jobNumber}] ${title}` : `คุณได้รับมอบหมายงานใหม่ [${title}]`,
        message: `คุณได้รับการมอบหมายให้ออกแบบงาน: ${title} โดย ${profile.full_name}`,
        is_read: false,
      });
    } catch (notifErr) {
      console.error('Failed to send assignment notification:', notifErr);
    }
  }

  redirect(`/jobs/${String(newJobId)}?created=1`);
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

// ----------------------------------------------------
// DESIGN WORKFLOW ACTIONS
// ----------------------------------------------------

export async function acceptJobAction(formData: FormData) {
  const jobId = String(formData.get('jobId') ?? '').trim();
  if (!jobId) return;

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  await supabase.from('jobs').update({
    stage: 'DESIGN',
    design_status: 'DESIGNING',
  }).eq('id', jobId);

  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    entity_type: 'JOB',
    entity_id: jobId,
    action: 'GRAPHIC_ACCEPTED_JOB',
    user_id: profile.id,
    metadata: {},
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/');
}

export type DesignProofFormState = { error?: string; success?: string };

export async function uploadDesignProofAction(
  prevState: DesignProofFormState,
  formData: FormData
): Promise<DesignProofFormState> {
  const jobId = String(formData.get('jobId') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const proofBase64 = String(formData.get('proofBase64') || formData.get('imageData') || '').trim();
  const proofUrlInput = String(formData.get('proofUrlInput') ?? '').trim();
  const proofFile = formData.get('proofFile');

  if (!jobId) return { error: 'ระบุ Job ไม่ถูกต้อง' };
  if (!proofBase64 && !proofUrlInput && (!proofFile || !(proofFile instanceof File) || proofFile.size === 0)) {
    return { error: 'กรุณาอัปโหลดไฟล์รูปตัวอย่าง หรือระบุลิงก์รูปภาพแบบ' };
  }

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  let imageUrl = proofBase64 || proofUrlInput;

  if (proofFile instanceof File && proofFile.size > 0) {
    if (proofFile.size > 10 * 1024 * 1024) {
      return { error: 'ขนาดไฟล์รูปต้องไม่เกิน 10 MB' };
    }
    const bytes = await proofFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mime = proofFile.type || 'image/png';
    imageUrl = `data:${mime};base64,${base64}`;
  }

  // Get current max version
  const { data: existingProofs } = await supabase
    .from('job_design_proofs')
    .select('version')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = (existingProofs?.[0]?.version ?? 0) + 1;

  // Always log proof into activity_logs with action 'DESIGN_PROOF' for fail-safe persistence
  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    entity_type: 'JOB',
    entity_id: jobId,
    action: 'DESIGN_PROOF',
    user_id: profile.id,
    metadata: { version: nextVersion, image_url: imageUrl, note: note || `ส่งแบบร่างเวอร์ชัน v${nextVersion}` },
  });

  try {
    await supabase.from('job_design_proofs').insert({
      organization_id: profile.organization_id,
      job_id: jobId,
      version: nextVersion,
      image_url: imageUrl,
      note: note || `ส่งแบบร่างเวอร์ชัน v${nextVersion}`,
      created_by: profile.id,
    });
  } catch (e) {}

  await supabase.from('jobs').update({
    stage: 'DESIGN',
    design_status: 'DESIGNING',
  }).eq('id', jobId);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/');

  return { success: `อัปโหลดแบบร่าง v${nextVersion} เรียบร้อยแล้ว` };
}

export async function syncProofsFromFolderAction(jobId: string, jobNum: string): Promise<DesignProofFormState> {
  if (!jobId || !jobNum) return { error: 'ระบุเลขใบงานไม่ถูกต้อง' };

  const fs = await import('fs');
  const path = await import('path');

  // Network path or local folder for proof files
  let baseWatchPath = (process.env.PROOFS_WATCH_PATH || '\\\\Desktop-sr9bc9m\\งานพิมพ์').trim();
  baseWatchPath = baseWatchPath.replace(/[\/\\]+/g, '\\');
  if (!baseWatchPath.startsWith('\\\\')) {
    baseWatchPath = '\\' + baseWatchPath;
  }

  console.log('[DEBUG SYNC]', { jobId, jobNum, baseWatchPath, exists: fs.existsSync(baseWatchPath) });

  try {
    const profile = await getCurrentProfile();
    const supabase = await createSupabaseServerClient();

    const cleanNum = jobNum.replace(/\D/g, '');
    const dashedNum = cleanNum.length === 7 ? `${cleanNum.slice(0, 4)}-${cleanNum.slice(4)}` : cleanNum;

    // Helper to find matching files recursively
    const findMatchingFiles = (dir: string): string[] => {
      let results: string[] = [];
      try {
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of list) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            results = results.concat(findMatchingFiles(fullPath));
          } else if (file.isFile()) {
            const ext = path.extname(file.name).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
              if (file.name.includes(jobNum) || file.name.includes(cleanNum) || file.name.includes(dashedNum)) {
                results.push(fullPath);
              }
            }
          }
        }
      } catch (err) {
        // Skip unreadable subfolders
      }
      return results;
    };

    let matchingFiles: string[] = [];

    if (fs.existsSync(baseWatchPath)) {
      matchingFiles = findMatchingFiles(baseWatchPath);
    }

    if (matchingFiles.length === 0) {
      // Fallback via PowerShell if fs scan yields nothing
      try {
        const { execSync } = await import('child_process');
        const cmd = `powershell -NoProfile -Command "Get-ChildItem -Path '${baseWatchPath}' -Recurse -File | Where-Object { $_.Name -like '*${cleanNum}*' -or $_.Name -like '*${dashedNum}*' } | Select-Object -ExpandProperty FullName"`;
        const stdout = execSync(cmd, { encoding: 'utf8', timeout: 12000 });
        matchingFiles = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && ['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(line).toLowerCase()));
      } catch (err) {
        console.error('[SYNC POWERSHELL ERR]', err);
      }
    }

    if (matchingFiles.length === 0) {
      return { error: `ไม่พบไฟล์รูปภาพที่มีเลขงาน ${jobNum} ในโฟลเดอร์ ${baseWatchPath}` };
    }

    // Sort files by mtime
    matchingFiles.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);

    let syncedCount = 0;
    for (const filePath of matchingFiles) {
      const stats = fs.statSync(filePath);
      if (stats.size > 15 * 1024 * 1024) continue;

      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const fileBuffer = fs.readFileSync(filePath);
      const base64 = fileBuffer.toString('base64');
      const imageUrl = `data:${mime};base64,${base64}`;

      const { data: existing } = await supabase
        .from('job_design_proofs')
        .select('id')
        .eq('job_id', jobId)
        .eq('note', fileName)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { data: existingProofs } = await supabase
        .from('job_design_proofs')
        .select('version')
        .eq('job_id', jobId)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existingProofs?.[0]?.version ?? 0) + 1;

      await supabase.from('job_design_proofs').insert({
        organization_id: profile.organization_id,
        job_id: jobId,
        version: nextVersion,
        image_url: imageUrl,
        note: fileName,
        created_by: profile.id,
      });

      syncedCount++;
    }

    if (syncedCount > 0) {
      await supabase.from('jobs').update({
        stage: 'DESIGN',
        design_status: 'WAITING_CUSTOMER',
      }).eq('id', jobId);

      revalidatePath(`/jobs/${jobId}`);
      revalidatePath('/jobs');
      revalidatePath('/');
      return { success: `ซิงก์สำเร็จ! พบและดึงรูปภาพใหม่ ${syncedCount} รายการเรียบร้อยแล้ว` };
    } else {
      return { success: `รูปภาพทั้งหมดของเลขงาน ${jobNum} ถูกซิงก์เข้าสู่ระบบเรียบร้อยแล้ว` };
    }
  } catch (err: any) {
    return { error: `เกิดข้อผิดพลาดในการซิงก์: ${err?.message || err}` };
  }
}

export async function sendProofToCustomerAction(formData: FormData) {
  const jobId = String(formData.get('jobId') ?? '').trim();
  if (!jobId) return;

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  // Check if job has at least 1 proof
  const { count: proofCount } = await supabase
    .from('design_proofs')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId);

  if (!proofCount || proofCount === 0) {
    return;
  }

  await supabase.from('jobs').update({
    stage: 'DESIGN',
    design_status: 'WAITING_CUSTOMER',
  }).eq('id', jobId);

  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    entity_type: 'JOB',
    entity_id: jobId,
    action: 'PROOF_SENT_TO_CUSTOMER',
    user_id: profile.id,
    metadata: { note: 'ส่งแบบร่างให้ลูกค้าพิจารณาเรียบร้อยแล้ว' },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/');
}

export async function confirmCustomerApproveAction(formData: FormData) {
  const jobId = String(formData.get('jobId') ?? '').trim();
  if (!jobId) return;

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  await supabase.from('jobs').update({
    design_status: 'APPROVED',
  }).eq('id', jobId);

  // Notify assigned graphic designer
  const { data: jobInfo } = await supabase
    .from('jobs')
    .select('job_number, title, assigned_graphic_id')
    .eq('id', jobId)
    .single();

  if (jobInfo?.assigned_graphic_id) {
    try {
      await supabase.from('notifications').insert({
        organization_id: profile.organization_id,
        recipient_id: jobInfo.assigned_graphic_id,
        sender_id: profile.id,
        job_id: jobId,
        notification_type: 'CUSTOMER_APPROVED',
        title: `ลูกค้ายืนยันแบบแล้ว [${jobInfo.job_number}]`,
        message: `งาน "${jobInfo.title}" ผ่านการอนุมัติแบบแล้ว สามารถส่งไฟล์เข้าโฟลเดอร์ผลิตและยืนยันการผลิตได้`,
      });
    } catch {
      // Ignore notification insert error if table not yet initialized
    }
  }

  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    entity_type: 'JOB',
    entity_id: jobId,
    action: 'CUSTOMER_APPROVED_DESIGN',
    user_id: profile.id,
    metadata: {},
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/notifications');
  revalidatePath('/');
}

export async function confirmProductionReadyAction(formData: FormData) {
  const jobId = String(formData.get('jobId') ?? '').trim();
  if (!jobId) return;

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  await supabase.from('jobs').update({
    stage: 'PRODUCTION',
    design_status: 'APPROVED',
  }).eq('id', jobId);

  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    entity_type: 'JOB',
    entity_id: jobId,
    action: 'GRAPHIC_CONFIRMED_PRODUCTION',
    user_id: profile.id,
    metadata: {},
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/');
}

export async function deleteDesignProofAction(formData: FormData) {
  const jobId = String(formData.get('jobId') ?? '').trim();
  const proofId = String(formData.get('proofId') ?? '').trim();
  if (!jobId || !proofId) return;

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  // 1. Try delete from job_design_proofs
  try {
    await supabase.from('job_design_proofs').delete().eq('id', proofId);
  } catch (e) {}

  // 2. Record deletion in activity_logs
  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    entity_type: 'JOB',
    entity_id: jobId,
    action: 'DESIGN_PROOF_REMOVED',
    user_id: profile.id,
    metadata: { deleted_proof_id: proofId },
  });

  // 3. If no active proofs remain, reset job design_status back to DESIGNING
  try {
    const { data: allLogs } = await supabase
      .from('activity_logs')
      .select('id, action, metadata')
      .eq('entity_id', jobId)
      .in('action', ['DESIGN_PROOF', 'DESIGN_PROOF_REMOVED']);

    const deletedIds = new Set(
      (allLogs || []).filter((l: any) => l.action === 'DESIGN_PROOF_REMOVED').map((l: any) => l.metadata?.deleted_proof_id).filter(Boolean)
    );
    deletedIds.add(proofId);

    const activeRemaining = (allLogs || []).filter((l: any) => l.action === 'DESIGN_PROOF' && !deletedIds.has(l.id));

    if (activeRemaining.length === 0) {
      await supabase.from('jobs').update({
        stage: 'DESIGN',
        design_status: 'DESIGNING',
      }).eq('id', jobId);
    }
  } catch (e) {}

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/');
}

export async function updateJobStageAction(jobId: string, targetStepIndex: number) {
  if (!jobId || !targetStepIndex) return { error: 'ข้อมูลไม่ถูกต้อง' };

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  let updatePayload: { stage: string; design_status: string; status?: string } = {
    stage: 'DESIGN',
    design_status: 'DESIGNING',
  };

  let stageLabel = 'กำลังออกแบบ';

  switch (targetStepIndex) {
    case 1: // 1. รอยืนยัน
      updatePayload = { stage: 'ADMIN', design_status: 'WAITING_DESIGN', status: 'OPEN' };
      stageLabel = 'รอยืนยัน';
      break;
    case 2: // 2. กำลังออกแบบ
      updatePayload = { stage: 'DESIGN', design_status: 'DESIGNING', status: 'OPEN' };
      stageLabel = 'กำลังออกแบบ';
      break;
    case 3: // 3. ส่งแบบ
      {
        const { count: proofCount } = await supabase
          .from('design_proofs')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', jobId);

        if (!proofCount || proofCount === 0) {
          return { error: 'ยังไม่มีรูปภาพแบบร่าง! กรุณาซิงก์รูปจากโฟลเดอร์ หรืออัปโหลดรูปแบบร่างอย่างน้อย 1 รูป ก่อนเปลี่ยนสถานะเป็น "ส่งแบบ"' };
        }

        updatePayload = { stage: 'DESIGN', design_status: 'WAITING_CUSTOMER', status: 'OPEN' };
        stageLabel = 'ส่งแบบ';
      }
      break;
    case 4: // 4. ผลิต
      updatePayload = { stage: 'PRODUCTION', design_status: 'APPROVED', status: 'OPEN' };
      stageLabel = 'ผลิต';
      break;
    case 5: // 5. เสร็จสิ้น
      updatePayload = { stage: 'COMPLETE', design_status: 'APPROVED', status: 'COMPLETED' };
      stageLabel = 'เสร็จสิ้น';
      break;
    default:
      return { error: 'ไม่พบขั้นตอนที่ระบุ' };
  }

  const { error } = await supabase
    .from('jobs')
    .update(updatePayload)
    .eq('id', jobId);

  if (error) {
    return { error: `ไม่สามารถเปลี่ยนสถานะได้: ${error.message}` };
  }

  // Record stage transition in activity logs
  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    entity_type: 'JOB',
    entity_id: jobId,
    action: `STAGE_CHANGED_STEP_${targetStepIndex}`,
    user_id: profile.id,
    metadata: {
      target_step: targetStepIndex,
      stage_label: stageLabel,
      updated_by_name: profile.full_name,
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/');

  return { success: `เปลี่ยนสถานะเป็น "${stageLabel}" เรียบร้อยแล้ว` };
}

export async function confirmProofImageAction(formData: FormData) {
  const jobId = String(formData.get('jobId') ?? '').trim();
  const proofId = String(formData.get('proofId') ?? '').trim();
  const imageUrl = String(formData.get('imageUrl') ?? '').trim();

  if (!jobId || !imageUrl) return { error: 'ข้อมูลไม่ครบถ้วน' };

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  // Update job stage to "ส่งแบบ" (WAITING_CUSTOMER)
  await supabase.from('jobs').update({
    stage: 'DESIGN',
    design_status: 'WAITING_CUSTOMER',
    status: 'OPEN',
  }).eq('id', jobId);

  // Record confirmation activity log
  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    entity_type: 'JOB',
    entity_id: jobId,
    action: 'DESIGN_PROOF_CONFIRMED',
    user_id: profile.id,
    metadata: {
      confirmed_proof_id: proofId,
      image_url: imageUrl,
      confirmed_by: profile.full_name,
      confirmed_at: new Date().toISOString(),
      note: 'ยืนยันแบบร่างและเปลี่ยนสถานะเป็นส่งแบบเรียบร้อยแล้ว',
    },
  });

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/');

  return { success: 'ยืนยันการส่งแบบ และเปลี่ยนสถานะเป็น "ส่งแบบ" เรียบร้อยแล้ว!' };
}

export async function notifyGraphicRevisionAction(formData: FormData) {
  const jobId = String(formData.get('jobId') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();

  if (!jobId) return { error: 'ข้อมูลไม่ครบถ้วน' };

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  // 1. Update job stage to DESIGN and design_status to REVISION
  const { error: updateErr } = await supabase.from('jobs').update({
    stage: 'DESIGN',
    design_status: 'REVISION',
    status: 'OPEN',
  }).eq('id', jobId);

  if (updateErr) {
    return { error: `ไม่สามารถอัปเดตสถานะได้: ${updateErr.message}` };
  }

  // 2. Record activity log
  await supabase.from('activity_logs').insert({
    organization_id: profile.organization_id,
    entity_type: 'JOB',
    entity_id: jobId,
    action: 'CUSTOMER_REVISION_REQUESTED',
    user_id: profile.id,
    metadata: {
      note: note || 'ลูกค้าแจ้งแก้ไขแบบร่าง',
      requested_by: profile.full_name,
      requested_at: new Date().toISOString(),
    },
  });

  // 3. Notify assigned graphic designer
  const { data: jobInfo } = await supabase
    .from('jobs')
    .select('job_number, title, assigned_graphic_id')
    .eq('id', jobId)
    .single();

  if (jobInfo?.assigned_graphic_id) {
    try {
      await supabase.from('notifications').insert({
        organization_id: profile.organization_id || OKSIGN_ORG_ID,
        recipient_id: jobInfo.assigned_graphic_id,
        sender_id: profile.id,
        job_id: jobId,
        notification_type: 'REVISION_REQUESTED',
        title: `ลูกค้าแจ้งแก้ไขแบบ [${jobInfo.job_number || 'งาน'}]`,
        message: note ? `หมายเหตุ: ${note}` : `งาน "${jobInfo.title}" มีการขอแก้ไขแบบร่าง โดย ${profile.full_name}`,
        is_read: false,
      });
    } catch (notifErr) {
      console.error('Failed to send revision notification:', notifErr);
    }
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/jobs');
  revalidatePath('/');
  revalidatePath('/notifications');

  return { success: 'ส่งแจ้งเตือนการแก้ไขงานให้กราฟิกเรียบร้อยแล้ว!' };
}


