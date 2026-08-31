import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Banknote, CalendarDays, CheckCircle2, CircleDot, Clock,
  FileSpreadsheet, History, PackageCheck, Printer, UserCheck, UserRound
} from 'lucide-react';
import { AppShell } from '../../../components/app-shell';
import { getCurrentProfile } from '../../../lib/current-profile';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { PaymentForm } from '../../payments/payment-form';
import {
  acceptJobAction,
  confirmCustomerApproveAction,
  confirmProductionReadyAction,
  updateJobStageAction
} from '../actions';
import { DesignWorkbench, type DesignProof } from '../../../components/design-workbench';
import { JobInteractiveStepper } from '../../../components/job-interactive-stepper';
import { JobPaperSheet, type JobOrderSpec } from '../../../components/job-paper-sheet';
import { JobTimeline, type ActivityLogItem } from '../../../components/job-timeline';

type JobDetail = {
  id: string;
  job_number: string;
  title: string;
  stage: string;
  status: string;
  design_status?: string;
  priority: string;
  deadline: string | null;
  grand_total_satang: number;
  paid_amount_satang: number;
  created_at: string;
  assigned_graphic_id: string | null;
  assigned_graphic?: { full_name: string } | null;
  customer: { name: string; phone: string | null; line_name: string | null } | null;
  brief: { requirements: string; dimensions: string | null; material: string | null; quantity: number } | null;
};

type Payment = {
  id: string;
  amount_satang: number;
  method: string;
  payment_type: string;
  paid_at: string;
  reference: string | null;
  slip_path: string | null;
};

type Activity = {
  id: string;
  action: string;
  created_at: string;
  user: { full_name: string } | null;
};

const actionLabels: Record<string, string> = {
  JOB_CREATED: 'สร้าง Job',
  JOB_CREATED_FROM_QUOTATION: 'สร้าง Job จากใบเสนอราคา',
  PAYMENT_RECORDED: 'บันทึกรับชำระเงิน',
  GRAPHIC_ACCEPTED_JOB: 'กราฟิกยืนยันรับงานออกแบบ',
  DESIGN_PROOF_UPLOADED_V1: 'อัปโหลดแบบร่าง v1',
  DESIGN_PROOF_UPLOADED_V2: 'อัปโหลดแบบร่าง v2',
  DESIGN_PROOF_UPLOADED_V3: 'อัปโหลดแบบร่าง v3',
  CUSTOMER_APPROVED_DESIGN: 'ลูกค้ายืนยันแบบแล้ว',
  GRAPHIC_CONFIRMED_PRODUCTION: 'กราฟิกยืนยันส่งผลิต',
  STAGE_CHANGED_DESIGN: 'ส่งเข้าฝ่ายออกแบบ',
  STAGE_CHANGED_PRODUCTION: 'อนุมัติและส่งผลิต',
  STAGE_CHANGED_DELIVERY: 'ผลิตเสร็จและรอส่งมอบ',
  STAGE_CHANGED_COMPLETE: 'ปิด Job',
};

const paymentTypeLabels: Record<string, string> = {
  DEPOSIT: 'มัดจำ',
  INSTALLMENT: 'แบ่งชำระ',
  FINAL: 'งวดสุดท้าย',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'เงินสด',
  BANK_TRANSFER: 'โอนธนาคาร',
  PROMPTPAY: 'PromptPay',
  OTHER: 'อื่น ๆ',
};

const money = (satang: number) =>
  new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(satang / 100);

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(profile.role?.code || '');
  const isGraphic = profile.role?.code === 'GRAPHIC';

  const proofsPromise = (async () => {
    try {
      const res = await supabase
        .from('job_design_proofs')
        .select('id, version, image_url, note, created_at, creator:profiles(full_name)')
        .eq('job_id', id)
        .order('version', { ascending: false });
      return res.data || [];
    } catch {
      return [];
    }
  })();

  const [
    { data: jobData },
    { data: paymentsData },
    { data: activitiesData },
    fetchedProofs,
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select(`
        id,
        job_number,
        title,
        stage,
        status,
        design_status,
        priority,
        deadline,
        grand_total_satang,
        paid_amount_satang,
        created_at,
        assigned_graphic_id,
        assigned_graphic:profiles!assigned_graphic_id(full_name),
        customer:customers(name, phone, line_name),
        brief:briefs(requirements, dimensions, material, quantity)
      `)
      .eq('id', id)
      .single(),
    isOwnerOrAdmin
      ? supabase
          .from('payments')
          .select('id, amount_satang, method, payment_type, paid_at, reference, slip_path')
          .eq('job_id', id)
          .order('paid_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    supabase
      .from('activity_logs')
      .select('id, action, created_at, metadata, user:profiles(full_name)')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
    proofsPromise,
  ]);

  if (!jobData) notFound();
  const job = jobData as unknown as JobDetail;

  const design_status = job.design_status || 'WAITING_DESIGN';
  let proofsData: any[] = fetchedProofs || [];

  // Fail-safe fallback: use already fetched activity_logs for proof records if proofsData is empty
  if (proofsData.length === 0 && activitiesData && activitiesData.length > 0) {
    const allLogs = activitiesData as any[];
    const deletedIds = new Set(
      allLogs
        .filter((l: any) => l.action === 'DESIGN_PROOF_REMOVED')
        .map((l: any) => l.metadata?.deleted_proof_id)
        .filter(Boolean)
    );

    const activeProofLogs = allLogs.filter(
      (l: any) => l.action === 'DESIGN_PROOF' && !deletedIds.has(l.id)
    );

    if (activeProofLogs.length > 0) {
      proofsData = activeProofLogs.map((log: any, index: number) => ({
        id: log.id,
        version: log.metadata?.version || (activeProofLogs.length - index),
        image_url: log.metadata?.image_url,
        note: log.metadata?.note,
        created_at: log.created_at,
        creator: log.user,
      }));
    }
  }

  const assignedGraphicName = job.assigned_graphic?.full_name || '';
  const payments = (paymentsData ?? []) as Payment[];
  const activities = (activitiesData ?? []) as unknown as Activity[];
  const remaining = job.grand_total_satang - job.paid_amount_satang;

  // Parse structured spec
  let spec: JobOrderSpec = {};
  if (job.brief?.requirements) {
    try {
      spec = JSON.parse(job.brief.requirements);
    } catch {
      spec = { notes: job.brief.requirements };
    }
  }

  const slipUrls = new Map<string, string>();
  if (isOwnerOrAdmin) {
    await Promise.all(
      payments
        .filter((payment) => payment.slip_path)
        .map(async (payment) => {
          const { data } = await supabase.storage.from('payment-slips').createSignedUrl(payment.slip_path!, 300);
          if (data?.signedUrl) slipUrls.set(payment.id, data.signedUrl);
        })
    );
  }

  // Determine active sidebar menu based on User Role:
  // Graphic role -> "งานออกแบบ" (/jobs?stage=DESIGN&queue=design)
  // Technician / Production role -> "งานประกอบ" (/technician)
  // Admin / Owner / System -> "รายการงาน" (/jobs)
  const isTechnician = ['PRODUCTION', 'TECHNICIAN'].includes(profile.role?.code || '');
  const activeMenu = isGraphic
    ? '/jobs?stage=DESIGN&queue=design'
    : isTechnician
    ? '/technician'
    : '/jobs';

  // Stepper logical state calculation
  // 1: ADMIN (รับงาน), 2: DESIGN (ออกแบบ), 3: PRODUCTION (ผลิต), 4: DELIVERY (ส่งมอบ), 5: COMPLETE (เสร็จสิ้น)
  const isWaitingAcceptance = job.stage === 'ADMIN' || design_status === 'WAITING_DESIGN';
  const isDesigning = job.stage === 'DESIGN' && (design_status === 'DESIGNING' || design_status === 'REVISION');
  const isWaitingCustomer = job.stage === 'DESIGN' && design_status === 'WAITING_CUSTOMER';
  const isDesignApproved = design_status === 'APPROVED' || ['PRODUCTION', 'DELIVERY', 'COMPLETE'].includes(job.stage);

  return (
    <AppShell
      profile={profile}
      active={activeMenu}
      activeSubItem={{
        title: `${job.job_number} ${job.title}`,
        subtitle: job.customer?.name ? `ลูกค้า: ${job.customer.name}` : undefined,
      }}
    >
      {query.created ? <div className="success-banner">เปิด Job และสร้างเลขที่งานเรียบร้อยแล้ว</div> : null}

      {/* MODERN SPLIT-WORKBENCH LAYOUT */}
      <div className="job-workspace-layout">
        {/* LEFT COLUMN: THE AUTHENTIC JOB RECEIPT SHEET */}
        <aside className="job-workspace-paper-col">
          <JobPaperSheet job={job} spec={spec} />
        </aside>

        {/* RIGHT COLUMN: WORKSPACE, STAGE PIPELINE, PROOFS, PAYMENTS & TIMELINE */}
        <main className="job-workspace-main-col">
          {/* COMPACT TOP HEADER & PIPELINE */}
          <div className="job-meta-header-card">
            <div className="meta-top-row">
              <div className="meta-title-group">
                <div className="meta-number-badge">
                  <span>{job.job_number}</span>
                  <span className="priority-pill">{job.priority}</span>
                </div>
                <h1 className="meta-heading">{job.title}</h1>
                <p className="meta-subtext">
                  ลูกค้า: <strong>{job.customer?.name ?? '-'}</strong> {job.customer?.phone ? `(${job.customer.phone})` : ''}
                  {job.deadline ? ` · กำหนดส่ง ${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeZone: 'Asia/Bangkok' }).format(new Date(job.deadline))}` : ''}
                </p>
              </div>

              <div className="meta-actions">
                <Link className="secondary-button" href={`/jobs/${job.id}/print`} target="_blank">
                  <Printer size={15} /> พิมพ์ใบรับงาน
                </Link>
              </div>
            </div>

            {/* INTERACTIVE 5-STEP PIPELINE (CLICK TO CHANGE STAGE VIA MODAL) */}
            <JobInteractiveStepper
              jobId={job.id}
              stage={job.stage}
              designStatus={job.design_status}
              status={job.status}
              jobNumber={job.job_number}
              hasProofs={proofsData.length > 0}
            />
          </div>

          {/* DESIGN PROOFS & WORKBENCH */}
          <DesignWorkbench
            jobId={job.id}
            jobNumber={job.job_number}
            stage={job.stage}
            designStatus={design_status}
            assignedGraphicName={assignedGraphicName}
            isAssignedGraphic={Boolean(job.assigned_graphic_id && job.assigned_graphic_id === profile.id)}
            isOwnerOrAdmin={isOwnerOrAdmin}
            proofs={proofsData as unknown as DesignProof[]}
          />

          {/* FINANCIAL SECTION (VISIBLE ONLY TO ADMIN & OWNER) */}
          {isOwnerOrAdmin ? (
            <section className="panel finance-card" style={{ marginBottom: '16px' }}>
              <div className="panel-header">
                <div>
                  <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Banknote size={18} className="text-primary" /> การเงิน & การชำระเงิน
                  </h2>
                  <p>สรุปยอดชำระและรายการสลิป (เฉพาะแอดมินและเจ้าของร้าน)</p>
                </div>
              </div>

              <div className="finance-numbers">
                <span>
                  ยอดทั้งหมด<strong>{money(job.grand_total_satang)}</strong>
                </span>
                <span>
                  ชำระแล้ว<strong className="paid">{money(job.paid_amount_satang)}</strong>
                </span>
                <span>
                  คงเหลือ<strong className={remaining ? 'unpaid' : 'paid'}>{money(remaining)}</strong>
                </span>
              </div>

              {remaining > 0 ? <PaymentForm jobId={job.id} remainingBaht={remaining / 100} /> : null}

              <div className="payment-list">
                {payments.length === 0 ? (
                  <p className="mini-empty" style={{ padding: '12px', textAlign: 'center' }}>ยังไม่มีรายการชำระเงิน</p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id}>
                      <span>
                        <strong>{money(payment.amount_satang)}</strong>
                        <small>
                          {paymentTypeLabels[payment.payment_type] ?? payment.payment_type} ·{' '}
                          {paymentMethodLabels[payment.method] ?? payment.method} ·{' '}
                          {new Intl.DateTimeFormat('th-TH', {
                            dateStyle: 'short',
                            timeZone: 'Asia/Bangkok',
                          }).format(new Date(payment.paid_at))}
                        </small>
                      </span>
                      <small>
                        {slipUrls.get(payment.id) ? (
                          <a className="text-link" href={slipUrls.get(payment.id)} target="_blank" rel="noreferrer">
                            ดูสลิป
                          </a>
                        ) : payment.reference ? (
                          `อ้างอิง ${payment.reference}`
                        ) : (
                          'ไม่มีเลขอ้างอิง'
                        )}
                      </small>
                    </div>
                  ))
                )}
              </div>
            </section>
          ) : null}

          {/* TIMELINE & ACTIVITY LOG (PLACED AT THE BOTTOM) */}
          <section className="panel detail-card">
            <div className="panel-header" style={{ marginBottom: '18px' }}>
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <History size={18} className="text-primary" /> ประวัติกิจกรรม (Timeline)
                </h2>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#64748b' }}>บันทึกการทำงานและสถานะย้อนหลังของ Job นี้</p>
              </div>
            </div>

            <div className="timeline-wrapper" style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
              <JobTimeline activities={activities as unknown as ActivityLogItem[]} />
            </div>
          </section>
        </main>
      </div>
    </AppShell>
  );
}