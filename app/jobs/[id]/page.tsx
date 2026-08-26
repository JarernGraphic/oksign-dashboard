import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Banknote, CalendarDays, CheckCircle2, CircleDot,
  FileSpreadsheet, PackageCheck, Printer, UserRound
} from 'lucide-react';
import { AppShell } from '../../../components/app-shell';
import { getCurrentProfile } from '../../../lib/current-profile';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { PaymentForm } from '../../payments/payment-form';
import { updateJobStageAction } from '../actions';

import { DesignWorkbench, type DesignProof } from '../../../components/design-workbench';

type JobDetail = {
  id: string;
  job_number: string;
  title: string;
  stage: string;
  status: string;
  design_status: string;
  accepted_at: string | null;
  approved_at: string | null;
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

const stages = ['ADMIN', 'DESIGN', 'PRODUCTION', 'DELIVERY', 'COMPLETE'] as const;
const labels: Record<string, string> = {
  ADMIN: 'รับงาน',
  DESIGN: 'ออกแบบ',
  PRODUCTION: 'ผลิต',
  DELIVERY: 'ส่งมอบ',
  COMPLETE: 'เสร็จสิ้น',
};

const nextStage: Record<string, string | undefined> = {
  ADMIN: 'DESIGN',
  DESIGN: 'PRODUCTION',
  PRODUCTION: 'DELIVERY',
  DELIVERY: 'COMPLETE',
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

type JobSpec = {
  receiverName?: string;
  dimensions?: string;
  quantity?: number;
  unitPrice?: number;
  installCost?: number;
  installLocation?: string;
  depositMethod?: string;
  remainingMethod?: string;
  designCondition?: string;
  contactChannel?: string;
  shapes?: string[];
  printers?: string[];
  materials?: string[];
  boardTypes?: string[];
  finishing?: string[];
  customFinishing?: string;
  notes?: string;
};

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

  const [{ data: jobData }, { data: paymentsData }, { data: activitiesData }] = await Promise.all([
    supabase
      .from('jobs')
      .select(`
        id,
        job_number,
        title,
        stage,
        status,
        priority,
        deadline,
        grand_total_satang,
        paid_amount_satang,
        created_at,
        assigned_graphic_id,
        customer:customers(name, phone, line_name),
        brief:briefs(requirements, dimensions, material, quantity)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('payments')
      .select('id, amount_satang, method, payment_type, paid_at, reference, slip_path')
      .eq('job_id', id)
      .order('paid_at', { ascending: false }),
    supabase
      .from('activity_logs')
      .select('id, action, created_at, user:profiles(full_name)')
      .eq('entity_id', id)
      .order('created_at', { ascending: false }),
  ]);

  if (!jobData) notFound();
  const job = jobData as unknown as JobDetail;

  // Safely fetch design status & proofs (handles cases where DB migration isn't applied remotely)
  let design_status = 'WAITING_DESIGN';
  let accepted_at: string | null = null;
  let approved_at: string | null = null;
  let proofsData: any[] = [];

  try {
    const { data: extraJobFields } = await supabase
      .from('jobs')
      .select('design_status, accepted_at, approved_at')
      .eq('id', id)
      .single();
    if (extraJobFields) {
      if (extraJobFields.design_status) design_status = extraJobFields.design_status;
      if (extraJobFields.accepted_at) accepted_at = extraJobFields.accepted_at;
      if (extraJobFields.approved_at) approved_at = extraJobFields.approved_at;
    }
  } catch {
    // Ignore if columns do not exist yet
  }

  try {
    const { data: proofs } = await supabase
      .from('job_design_proofs')
      .select('id, version, image_url, note, created_at, creator:profiles(full_name)')
      .eq('job_id', id)
      .order('version', { ascending: false });
    if (proofs) proofsData = proofs;
  } catch {
    // Ignore if table does not exist yet
  }

  let assignedGraphicName = '';
  if (job.assigned_graphic_id) {
    const { data: graphicProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', job.assigned_graphic_id)
      .single();
    if (graphicProfile?.full_name) {
      assignedGraphicName = graphicProfile.full_name;
    }
  }
  const payments = (paymentsData ?? []) as Payment[];
  const activities = (activitiesData ?? []) as unknown as Activity[];
  const remaining = job.grand_total_satang - job.paid_amount_satang;
  const currentIndex = stages.indexOf(job.stage as typeof stages[number]);

  // Parse structured spec
  let spec: JobSpec = {};
  if (job.brief?.requirements) {
    try {
      spec = JSON.parse(job.brief.requirements);
    } catch {
      spec = { notes: job.brief.requirements };
    }
  }

  const slipUrls = new Map<string, string>();
  await Promise.all(
    payments
      .filter((payment) => payment.slip_path)
      .map(async (payment) => {
        const { data } = await supabase.storage.from('payment-slips').createSignedUrl(payment.slip_path!, 300);
        if (data?.signedUrl) slipUrls.set(payment.id, data.signedUrl);
      })
  );

  return (
    <AppShell profile={profile} active="/jobs">
      {query.created ? <div className="success-banner">เปิด Job และสร้างเลขที่งานเรียบร้อยแล้ว</div> : null}

      <div className="job-header">
        <div>
          <p>{job.job_number}</p>
          <h1>{job.title}</h1>
          <span>{job.customer?.name ?? '-'} · {job.priority}</span>
        </div>

        <div className="header-actions">
          <Link className="secondary-button" href={`/jobs/${job.id}/print`}>
            <Printer size={16} />
            พิมพ์ใบรับงาน (A5)
          </Link>

          {nextStage[job.stage] ? (
            <form action={updateJobStageAction}>
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="stage" value={nextStage[job.stage]} />
              <button className="primary-button">
                <PackageCheck size={17} />
                {job.stage === 'ADMIN'
                  ? 'ส่งออกแบบ'
                  : job.stage === 'DESIGN'
                  ? 'อนุมัติและส่งผลิต'
                  : job.stage === 'PRODUCTION'
                  ? 'ผลิตเสร็จ'
                  : job.stage === 'DELIVERY'
                  ? 'ปิด Job'
                  : 'อัปเดต'}
              </button>
            </form>
          ) : (
            <span className="complete-badge">
              <CheckCircle2 size={16} />
              ปิดงานแล้ว
            </span>
          )}
        </div>
      </div>

      <div className="stage-progress">
        {stages.map((stage, index) => (
          <div className={index <= currentIndex ? 'done' : ''} key={stage}>
            <span>{index < currentIndex ? <CheckCircle2 /> : <CircleDot />}</span>
            <p>{labels[stage]}</p>
          </div>
        ))}
      </div>

      {/* DESIGN WORKBENCH & PROOF MANAGEMENT */}
      <DesignWorkbench
        jobId={job.id}
        stage={job.stage}
        designStatus={design_status}
        acceptedAt={accepted_at}
        approvedAt={approved_at}
        assignedGraphicName={assignedGraphicName}
        isAssignedGraphic={Boolean(job.assigned_graphic_id && job.assigned_graphic_id === profile.id)}
        isOwnerOrAdmin={['OWNER', 'ADMIN'].includes(profile.role?.code || '')}
        proofs={proofsData as unknown as DesignProof[]}
      />

      <div className="detail-grid">
        <div className="detail-main">
          {/* ข้อมูลใบรับงาน (Job Order Spec) */}
          <section className="panel detail-card">
            <div className="panel-header">
              <div>
                <h2>
                  <FileSpreadsheet size={18} />
                  ข้อมูลใบรับงาน & สเปกการผลิต
                </h2>
                <p>รายละเอียดตามใบรับงาน OKSIGN</p>
              </div>
              <Link className="text-link" href={`/jobs/${job.id}/print`}>
                เปิดดูใบงาน A5 ➔
              </Link>
            </div>

            <div className="detail-fields">
              <div>
                <span>ผู้รับงาน</span>
                <strong>{spec.receiverName || '-'}</strong>
              </div>
              <div>
                <span>ลูกค้า</span>
                <strong>{job.customer?.name}</strong>
              </div>
              <div>
                <span>เบอร์โทร</span>
                <strong>{job.customer?.phone ?? '-'}</strong>
              </div>
              <div>
                <span>LINE / ช่องทาง</span>
                <strong>{spec.contactChannel || job.customer?.line_name || '-'}</strong>
              </div>
              <div>
                <span>ขนาด</span>
                <strong>{spec.dimensions || job.brief?.dimensions || '-'}</strong>
              </div>
              <div>
                <span>จำนวน</span>
                <strong>{spec.quantity ?? job.brief?.quantity ?? 1} ชิ้น</strong>
              </div>
              <div>
                <span>ราคา/ชิ้น</span>
                <strong>{spec.unitPrice ? `฿${spec.unitPrice.toLocaleString('th-TH')}` : '-'}</strong>
              </div>
              <div>
                <span>ค่าแรงติดตั้ง</span>
                <strong>{spec.installCost ? `฿${spec.installCost.toLocaleString('th-TH')}` : '-'}</strong>
              </div>
              {spec.installLocation ? (
                <div className="span-2">
                  <span>สถานที่ติดตั้ง</span>
                  <p>{spec.installLocation}</p>
                </div>
              ) : null}
              <div>
                <span>สถานะแบบ</span>
                <span className="badge blue">{spec.designCondition || 'ดูแบบ'}</span>
              </div>
              <div>
                <span>กำหนดส่ง</span>
                <strong>
                  {job.deadline
                    ? new Intl.DateTimeFormat('th-TH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Asia/Bangkok',
                      }).format(new Date(job.deadline))
                    : 'ไม่ระบุ'}
                </strong>
              </div>
            </div>

            {/* Checkbox Spec Summaries */}
            <div className="spec-tags-section">
              {spec.printers?.length ? (
                <div className="spec-tag-group">
                  <span>เครื่องพิมพ์:</span>
                  <div>
                    {spec.printers.map((p) => (
                      <b key={p} className="badge red">{p}</b>
                    ))}
                  </div>
                </div>
              ) : null}

              {spec.materials?.length ? (
                <div className="spec-tag-group">
                  <span>วัสดุ:</span>
                  <div>
                    {spec.materials.map((m) => (
                      <b key={m} className="badge gray">{m}</b>
                    ))}
                  </div>
                </div>
              ) : null}

              {spec.boardTypes?.length ? (
                <div className="spec-tag-group">
                  <span>โครงสร้าง/บอร์ด:</span>
                  <div>
                    {spec.boardTypes.map((b) => (
                      <b key={b} className="badge amber">{b}</b>
                    ))}
                  </div>
                </div>
              ) : null}

              {spec.finishing?.length ? (
                <div className="spec-tag-group">
                  <span>ประกอบงาน:</span>
                  <div>
                    {spec.finishing.map((f) => (
                      <b key={f} className="badge cyan">{f}</b>
                    ))}
                  </div>
                </div>
              ) : null}

              {spec.shapes?.length ? (
                <div className="spec-tag-group">
                  <span>รูปทรง:</span>
                  <div>
                    {spec.shapes.map((s) => (
                      <b key={s} className="badge blue">{s}</b>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {spec.notes ? (
              <div className="spec-notes-box">
                <span>รายละเอียดเพิ่มเติม:</span>
                <p>{spec.notes}</p>
              </div>
            ) : null}
          </section>

          {/* Timeline */}
          <section className="panel detail-card">
            <div className="panel-header">
              <div>
                <h2>Timeline</h2>
                <p>ประวัติสำคัญของ Job</p>
              </div>
            </div>
            <div className="timeline">
              {activities.map((activity) => (
                <div key={activity.id}>
                  <i />
                  <span>
                    <strong>{actionLabels[activity.action] ?? activity.action}</strong>
                    <small>
                      {activity.user?.full_name ?? 'ระบบ'} ·{' '}
                      {new Intl.DateTimeFormat('th-TH', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Asia/Bangkok',
                      }).format(new Date(activity.created_at))}
                    </small>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: การเงิน & ข้อมูลเพิ่มเติม */}
        <aside className="detail-side">
          <section className="panel finance-card">
            <div className="panel-header">
              <div>
                <h2>
                  <Banknote size={17} />
                  การชำระเงิน
                </h2>
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
              {payments.map((payment) => (
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
              ))}
            </div>
          </section>

          <section className="panel info-card">
            <p>
              <CalendarDays size={15} />
              สร้างเมื่อ{' '}
              {new Intl.DateTimeFormat('th-TH', {
                dateStyle: 'medium',
                timeZone: 'Asia/Bangkok',
              }).format(new Date(job.created_at))}
            </p>
            <p>
              <UserRound size={15} />
              Admin: {profile.full_name}
            </p>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
