import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertCircle, ArrowLeft, Banknote, BriefcaseBusiness, Building2,
  Calendar, CheckCircle2, ChevronRight, CircleDollarSign, Clock,
  FileText, Mail, MapPin, MessageCircle, Phone, Plus, Tag, User,
  Wallet, Wrench
} from 'lucide-react';
import { AppShell } from '../../../components/app-shell';
import { getCurrentProfile } from '../../../lib/current-profile';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { money, thaiDate } from '../../../lib/format';

const stageLabels: Record<string, string> = {
  ADMIN: 'รอจัดสรร',
  DESIGN: 'กำลังออกแบบ',
  PRODUCTION: 'กำลังผลิต',
  DELIVERY: 'จัดส่ง / ติดตั้ง',
  COMPLETE: 'เสร็จสมบูรณ์',
};

const stageBadgeColor: Record<string, string> = {
  ADMIN: 'gray',
  DESIGN: 'blue',
  PRODUCTION: 'amber',
  DELIVERY: 'cyan',
  COMPLETE: 'green',
};

const priorityLabels: Record<string, string> = {
  LOW: 'ต่ำ',
  NORMAL: 'ปกติ',
  HIGH: 'สูง',
  URGENT: 'ด่วนพิเศษ',
};

export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; created?: string; updated?: string }>;
}) {
  const { id } = await params;
  const { tab = 'overview', created, updated } = await searchParams;

  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const [{ data: customer }, { data: jobsData }, { data: quotationsData }] = await Promise.all([
    supabase
      .from('customers')
      .select('*, lead_source:lead_sources(name)')
      .eq('id', id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('jobs')
      .select('id, job_number, title, stage, status, priority, deadline, grand_total_satang, paid_amount_satang, created_at')
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('quotations')
      .select('id, quotation_number, status, grand_total_satang, valid_until, created_at')
      .eq('customer_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
  ]);

  if (!customer) notFound();

  const jobs = jobsData ?? [];
  const quotations = quotationsData ?? [];

  // Fetch payments for all customer's jobs
  const jobIds = jobs.map((j) => j.id);
  let payments: any[] = [];
  if (jobIds.length > 0) {
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('id, amount_satang, method, payment_type, paid_at, reference, slip_path, job:jobs(id, job_number, title)')
      .in('job_id', jobIds)
      .is('deleted_at', null)
      .order('paid_at', { ascending: false });
    payments = paymentsData ?? [];
  }

  // Financial summary
  const totalSpentSatang = jobs.reduce((sum, j) => sum + (j.grand_total_satang || 0), 0);
  const totalPaidSatang = jobs.reduce((sum, j) => sum + (j.paid_amount_satang || 0), 0);
  const totalOutstandingSatang = Math.max(0, totalSpentSatang - totalPaidSatang);

  return (
    <AppShell profile={profile} active="/customers">
      {/* Back Button & Top Action */}
      <div className="profile-header-actions">
        <Link href="/customers" className="back-link-btn">
          <ArrowLeft size={16} />
          <span>กลับหน้ารายชื่อลูกค้า</span>
        </Link>
        <Link href={`/jobs/new`} className="primary-button">
          <Plus size={16} />
          <span>เปิดใบรับงานใหม่</span>
        </Link>
      </div>

      {created && <div className="success-banner">เพิ่มลูกค้าใหม่เรียบร้อยแล้ว</div>}
      {updated && <div className="success-banner">อัปเดตข้อมูลลูกค้าเรียบร้อยแล้ว</div>}

      {/* Customer Hero Profile Card */}
      <div className="customer-hero-card">
        <div className="hero-avatar">
          {customer.avatar_url ? (
            <img src={customer.avatar_url} alt={customer.name} className="hero-avatar-img" />
          ) : customer.customer_type === 'BUSINESS' ? (
            <Building2 size={36} />
          ) : (
            <User size={36} />
          )}
        </div>

        <div className="hero-main-info">
          <div className="hero-title-row">
            <h1>{customer.name}</h1>
            {customer.company_name && <span className="hero-company-name">({customer.company_name})</span>}
            <span className={`customer-type-pill ${customer.customer_type === 'BUSINESS' ? 'biz' : 'pers'}`}>
              {customer.customer_type === 'BUSINESS' ? 'นิติบุคคล / ร้านค้า' : 'บุคคลธรรมดา'}
            </span>
          </div>

          <div className="hero-meta-badges">
            <span className="meta-badge-code">
              <strong>รหัส:</strong> {customer.customer_number || 'CUS-NEW'}
            </span>
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="meta-badge contact">
                <Phone size={13} /> {customer.phone}
              </a>
            )}
            {customer.line_name && (
              <span className="meta-badge line">
                <MessageCircle size={13} /> {customer.line_name}
              </span>
            )}
            {customer.facebook_name && (
              <span className="meta-badge fb">
                FB: {customer.facebook_name}
              </span>
            )}
            {customer.lead_source?.name && (
              <span className="meta-badge source">
                <Tag size={13} /> ช่องทาง: {customer.lead_source.name}
              </span>
            )}
          </div>
        </div>

        <div className="hero-financial-stats">
          <div className="fin-stat-box">
            <span className="stat-label">ยอดสั่งซื้อสะสม</span>
            <strong className="stat-val">{money(totalSpentSatang)}</strong>
            <small>{jobs.length} งาน</small>
          </div>
          <div className="fin-stat-box">
            <span className="stat-label">ชำระแล้ว</span>
            <strong className="stat-val text-green">{money(totalPaidSatang)}</strong>
          </div>
          <div className={`fin-stat-box ${totalOutstandingSatang > 0 ? 'alert' : ''}`}>
            <span className="stat-label">ยอดค้างชำระ</span>
            <strong className={`stat-val ${totalOutstandingSatang > 0 ? 'text-red' : 'text-green'}`}>
              {money(totalOutstandingSatang)}
            </strong>
          </div>
        </div>
      </div>

      {/* Profile Tabs Navigation */}
      <div className="profile-tabs-bar">
        <Link
          href={`/customers/${customer.id}?tab=overview`}
          className={`profile-tab-item ${tab === 'overview' ? 'active' : ''}`}
        >
          <User size={16} />
          <span>ข้อมูลลูกค้า (Overview)</span>
        </Link>

        <Link
          href={`/customers/${customer.id}?tab=jobs`}
          className={`profile-tab-item ${tab === 'jobs' ? 'active' : ''}`}
        >
          <BriefcaseBusiness size={16} />
          <span>ประวัติงาน (Jobs)</span>
          <span className="tab-pill-count">{jobs.length}</span>
        </Link>

        <Link
          href={`/customers/${customer.id}?tab=quotations`}
          className={`profile-tab-item ${tab === 'quotations' ? 'active' : ''}`}
        >
          <FileText size={16} />
          <span>ใบเสนอราคา (Quotations)</span>
          <span className="tab-pill-count">{quotations.length}</span>
        </Link>

        <Link
          href={`/customers/${customer.id}?tab=payments`}
          className={`profile-tab-item ${tab === 'payments' ? 'active' : ''}`}
        >
          <Banknote size={16} />
          <span>ประวัติรับเงิน (Payments)</span>
          <span className="tab-pill-count">{payments.length}</span>
        </Link>
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="customer-overview-grid">
          {/* Card 1: Contact Details */}
          <div className="panel info-panel">
            <div className="panel-header">
              <h2>ข้อมูลการติดต่อ & ที่อยู่</h2>
            </div>
            <div className="detail-rows-list">
              <div className="detail-row">
                <span className="label">ชื่อลูกค้า / กิจการ:</span>
                <strong>{customer.name}</strong>
              </div>
              <div className="detail-row">
                <span className="label">ประเภท:</span>
                <span>{customer.customer_type === 'BUSINESS' ? 'นิติบุคคล / ร้านค้า' : 'บุคคลธรรมดา'}</span>
              </div>
              <div className="detail-row">
                <span className="label">เบอร์โทรศัพท์:</span>
                <strong>{customer.phone || '-'}</strong>
              </div>
              <div className="detail-row">
                <span className="label">LINE:</span>
                <span>{customer.line_name || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">Facebook:</span>
                <span>{customer.facebook_name || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">อีเมล:</span>
                <span>{customer.email || '-'}</span>
              </div>
              <div className="detail-row">
                <span className="label">เลขประจำตัวผู้เสียภาษี (Tax ID):</span>
                <span>{customer.tax_id || '-'}</span>
              </div>
              <div className="detail-row full">
                <span className="label">ที่อยู่ / สถานที่จัดส่ง / ติดตั้ง:</span>
                <p className="address-box">{customer.address || 'ไม่ได้ระบุที่อยู่'}</p>
              </div>
            </div>
          </div>

          {/* Card 2: CRM Metadata & Notes */}
          <div className="panel info-panel">
            <div className="panel-header">
              <h2>ข้อมูล CRM & หมายเหตุ</h2>
            </div>
            <div className="detail-rows-list">
              <div className="detail-row">
                <span className="label">ช่องทางที่ลูกค้าเข้ามา:</span>
                <span className="badge red mini">{customer.lead_source?.name || 'ไม่ระบุ'}</span>
              </div>
              <div className="detail-row">
                <span className="label">วันที่ลงทะเบียนในระบบ:</span>
                <span>
                  {new Intl.DateTimeFormat('th-TH', {
                    dateStyle: 'full',
                    timeZone: 'Asia/Bangkok',
                  }).format(new Date(customer.created_at))}
                </span>
              </div>
              <div className="detail-row full">
                <span className="label">หมายเหตุพิเศษ / ความชอบของลูกค้า:</span>
                <div className="customer-notes-callout">
                  {customer.note || 'ไม่มีหมายเหตุเพิ่มเติมสำหรับลูกค้ารายนี้'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: JOBS */}
      {tab === 'jobs' && (
        <section className="panel list-panel">
          <div className="panel-header">
            <div>
              <h2>ประวัติงานทั้งหมดของ {customer.name}</h2>
              <p>รวม {jobs.length} รายการงาน</p>
            </div>
            <Link href="/jobs/new" className="primary-button small">
              <Plus size={15} /> เปิดใบรับงานใหม่
            </Link>
          </div>

          {jobs.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>รหัสงาน (7 หลัก)</th>
                    <th>ชื่องาน</th>
                    <th>ขั้นตอน</th>
                    <th>กำหนดส่ง</th>
                    <th>ความสำคัญ</th>
                    <th>ยอดสุทธิ</th>
                    <th>สถานะชำระ</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const remaining = (job.grand_total_satang || 0) - (job.paid_amount_satang || 0);
                    return (
                      <tr key={job.id}>
                        <td>
                          <Link href={`/jobs/${job.id}`} className="job-code-link">
                            <strong>{job.job_number}</strong>
                          </Link>
                        </td>
                        <td>
                          <Link href={`/jobs/${job.id}`} className="job-title-link">
                            <strong>{job.title}</strong>
                          </Link>
                        </td>
                        <td>
                          <span className={`badge ${stageBadgeColor[job.stage] || 'gray'}`}>
                            <i></i>
                            {stageLabels[job.stage] || job.stage}
                          </span>
                        </td>
                        <td>
                          {job.deadline ? (
                            new Intl.DateTimeFormat('th-TH', {
                              dateStyle: 'medium',
                              timeZone: 'Asia/Bangkok',
                            }).format(new Date(job.deadline))
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td>
                          <span className={`priority ${job.priority === 'URGENT' ? 'red' : job.priority === 'HIGH' ? 'orange' : 'gray'}`}>
                            {priorityLabels[job.priority] || job.priority}
                          </span>
                        </td>
                        <td>
                          <strong>{money(job.grand_total_satang)}</strong>
                        </td>
                        <td>
                          {remaining <= 0 ? (
                            <span className="badge green mini">ชำระครบ</span>
                          ) : job.paid_amount_satang > 0 ? (
                            <span className="badge amber mini">มัดจำแล้ว (ค้าง {money(remaining)})</span>
                          ) : (
                            <span className="badge red mini">ยังไม่ชำระ</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <BriefcaseBusiness size={36} />
              <h3>ยังไม่มีรายการงาน</h3>
              <p>สร้างใบรับงานแรกให้กับลูกค้ารายนี้</p>
              <Link href="/jobs/new" className="primary-button">
                <Plus size={15} /> เปิดใบรับงาน
              </Link>
            </div>
          )}
        </section>
      )}

      {/* TAB CONTENT 3: QUOTATIONS */}
      {tab === 'quotations' && (
        <section className="panel list-panel">
          <div className="panel-header">
            <div>
              <h2>ใบเสนอราคาของ {customer.name}</h2>
              <p>รวม {quotations.length} ใบเสนอราคา</p>
            </div>
            <Link href="/quotations/new" className="primary-button small">
              <Plus size={15} /> สร้างใบเสนอราคา
            </Link>
          </div>

          {quotations.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>เลขที่ใบเสนอราคา</th>
                    <th>สถานะ</th>
                    <th>ยอดรวมสุทธิ</th>
                    <th>ยืนราคาถึง</th>
                    <th>วันที่สร้าง</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id}>
                      <td>
                        <Link href={`/quotations/${q.id}`}>
                          <strong>{q.quotation_number}</strong>
                        </Link>
                      </td>
                      <td>
                        <span className="badge gray">{q.status}</span>
                      </td>
                      <td>
                        <strong>{money(q.grand_total_satang)}</strong>
                      </td>
                      <td>
                        {q.valid_until ? (
                          new Intl.DateTimeFormat('th-TH', {
                            dateStyle: 'medium',
                            timeZone: 'Asia/Bangkok',
                          }).format(new Date(q.valid_until))
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        {new Intl.DateTimeFormat('th-TH', {
                          dateStyle: 'medium',
                          timeZone: 'Asia/Bangkok',
                        }).format(new Date(q.created_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={36} />
              <h3>ยังไม่มีใบเสนอราคา</h3>
              <p>สามารถออกใบเสนอราคาให้ลูกค้านี้ได้</p>
              <Link href="/quotations/new" className="primary-button">
                <Plus size={15} /> สร้างใบเสนอราคา
              </Link>
            </div>
          )}
        </section>
      )}

      {/* TAB CONTENT 4: PAYMENTS */}
      {tab === 'payments' && (
        <section className="panel list-panel">
          <div className="panel-header">
            <div>
              <h2>ประวัติการรับชำระเงินของ {customer.name}</h2>
              <p>รวม {payments.length} รายการรับชำระ</p>
            </div>
          </div>

          {payments.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>รหัส Job</th>
                    <th>ชื่องาน</th>
                    <th>ประเภทชำระ</th>
                    <th>ช่องทาง</th>
                    <th>วันที่</th>
                    <th>จำนวนเงิน</th>
                    <th>หลักฐาน</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/jobs/${p.job?.id}`}>
                          <strong>{p.job?.job_number || '-'}</strong>
                        </Link>
                      </td>
                      <td>{p.job?.title || '-'}</td>
                      <td>
                        <span className="badge blue mini">
                          {p.payment_type === 'DEPOSIT' ? 'มัดจำ' : p.payment_type === 'FINAL' ? 'ยอดปิดงาน' : 'ค่างวด'}
                        </span>
                      </td>
                      <td>
                        <strong>{p.method === 'CASH' ? 'เงินสด' : 'โอนจ่าย'}</strong>
                        {p.reference && <small className="text-muted d-block">อ้างอิง: {p.reference}</small>}
                      </td>
                      <td>
                        {new Intl.DateTimeFormat('th-TH', {
                          dateStyle: 'medium',
                          timeZone: 'Asia/Bangkok',
                        }).format(new Date(p.paid_at))}
                      </td>
                      <td>
                        <strong className="money-positive">{money(p.amount_satang)}</strong>
                      </td>
                      <td>
                        {p.slip_path ? (
                          <a href={`/api/slips/${p.id}`} target="_blank" rel="noreferrer" className="text-link">
                            ดูสลิป
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <Banknote size={36} />
              <h3>ยังไม่มีประวัติการรับชำระ</h3>
              <p>เมื่อลูกค้าชำระเงินมัดจำหรือยอดคงเหลือ รายการจะแสดงที่นี่</p>
            </div>
          )}
        </section>
      )}
    </AppShell>
  );
}
