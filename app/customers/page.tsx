import Link from 'next/link';
import {
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  MessageCircle,
  Phone,
  Plus,
  Search,
  User,
  UserPlus,
  Users,
  MapPin,
} from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';

type Customer = {
  id: string;
  customer_number: string;
  name: string;
  customer_type: 'PERSON' | 'BUSINESS';
  phone: string | null;
  line_name: string | null;
  facebook_name: string | null;
  address: string | null;
  created_at: string;
  lead_source: { name: string } | null;
  jobs: { count: number }[];
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; created?: string }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  // Fetch all customers to compute accurate stats
  const { data: allCustomersData } = await supabase
    .from('customers')
    .select(`
      id, customer_number, name, customer_type, phone, line_name, facebook_name, address, created_at,
      lead_source:lead_sources(name),
      jobs:jobs(count)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const allCustomers = (allCustomersData ?? []) as unknown as Customer[];

  // Calculate statistics
  const totalCount = allCustomers.length;
  const personCount = allCustomers.filter((c) => c.customer_type === 'PERSON').length;
  const businessCount = allCustomers.filter((c) => c.customer_type === 'BUSINESS').length;
  const totalJobsCount = allCustomers.reduce((acc, c) => acc + (c.jobs?.[0]?.count ?? 0), 0);

  const personPercent = totalCount > 0 ? Math.round((personCount / totalCount) * 100) : 0;
  const businessPercent = totalCount > 0 ? Math.round((businessCount / totalCount) * 100) : 0;

  // Filter based on search params
  let filteredCustomers = allCustomers;

  if (params.q?.trim()) {
    const term = params.q.trim().toLowerCase();
    filteredCustomers = filteredCustomers.filter(
      (c) =>
        (c.name && c.name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.customer_number && c.customer_number.toLowerCase().includes(term)) ||
        (c.line_name && c.line_name.toLowerCase().includes(term)) ||
        (c.facebook_name && c.facebook_name.toLowerCase().includes(term))
    );
  }

  if (params.type && ['PERSON', 'BUSINESS'].includes(params.type)) {
    filteredCustomers = filteredCustomers.filter((c) => c.customer_type === params.type);
  }

  return (
    <AppShell profile={profile} active="/customers" createHref="/customers/new">
      {/* SECTION HEADER */}
      <div className="section-heading">
        <div>
          <p>งานขาย & CRM</p>
          <h1>จัดการข้อมูลลูกค้า (Customers Overview)</h1>
          <span>ค้นหา จัดการข้อมูล และดูประวัติการสั่งงาน/ประวัติการเงินรายบุคคล</span>
        </div>
        <Link className="primary-button" href="/customers/new" style={{ borderRadius: '12px' }}>
          <UserPlus size={17} />
          <span>เพิ่มลูกค้าใหม่</span>
        </Link>
      </div>

      {params.created ? (
        <div className="success-banner">บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว</div>
      ) : null}

      {/* TOP KPI STATS CARDS (Matching Reference Image 2 Style) */}
      <div className="customer-stats-grid">
        {/* Card 1: Total Customers */}
        <div className="customer-stat-card">
          <div className="customer-stat-icon-wrapper red">
            <Users size={22} />
          </div>
          <div className="customer-stat-info">
            <span className="customer-stat-value">{totalCount}</span>
            <span className="customer-stat-label">ลูกค้าทั้งหมดในระบบ</span>
            <span className="customer-stat-subtext">ฐานข้อมูลลูกค้า Active ทั้งหมด</span>
          </div>
        </div>

        {/* Card 2: Individual Customers */}
        <div className="customer-stat-card">
          <div className="customer-stat-icon-wrapper rose">
            <User size={22} />
          </div>
          <div className="customer-stat-info">
            <span className="customer-stat-value">{personCount}</span>
            <span className="customer-stat-label">บุคคลธรรมดา</span>
            <span className="customer-stat-subtext">{personPercent}% ของลูกค้าทั้งหมด</span>
          </div>
        </div>

        {/* Card 3: Corporate Customers */}
        <div className="customer-stat-card">
          <div className="customer-stat-icon-wrapper amber">
            <Building2 size={22} />
          </div>
          <div className="customer-stat-info">
            <span className="customer-stat-value">{businessCount}</span>
            <span className="customer-stat-label">นิติบุคคล / ร้านค้า</span>
            <span className="customer-stat-subtext">{businessPercent}% ของลูกค้าทั้งหมด</span>
          </div>
        </div>

        {/* Card 4: Total Accumulated Jobs */}
        <div className="customer-stat-card">
          <div className="customer-stat-icon-wrapper blue">
            <BriefcaseBusiness size={22} />
          </div>
          <div className="customer-stat-info">
            <span className="customer-stat-value">{totalJobsCount} งาน</span>
            <span className="customer-stat-label">งานสั่งทำรวมทั้งหมด</span>
            <span className="customer-stat-subtext">
              เฉลี่ย {(totalJobsCount / (totalCount || 1)).toFixed(1)} งาน/คน
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CUSTOMER TABLE PANEL */}
      <section className="customer-list-panel">
        {/* TOOLBAR: SEARCH & PILL FILTERS */}
        <div className="customer-toolbar">
          {/* Search Form */}
          <form className="customer-search-form" method="GET" action="/customers">
            <div className="customer-search-input-wrap">
              <Search size={17} />
              <input
                name="q"
                defaultValue={params.q}
                placeholder="ค้นหาชื่อ, เบอร์โทร, LINE, Facebook หรือรหัสลูกค้า..."
                className="customer-search-input"
              />
            </div>
            {params.type && <input type="hidden" name="type" value={params.type} />}
            <button type="submit" className="customer-search-submit-btn">
              ค้นหา
            </button>
          </form>

          {/* Filter Pills Group */}
          <div className="customer-pills-group">
            <Link
              href={`/customers${params.q ? `?q=${params.q}` : ''}`}
              className={`customer-pill-item ${!params.type ? 'active' : ''}`}
            >
              <span>ทั้งหมด</span>
              <span style={{ opacity: 0.85, fontSize: '11px' }}>({totalCount})</span>
            </Link>
            <Link
              href={`/customers?type=PERSON${params.q ? `&q=${params.q}` : ''}`}
              className={`customer-pill-item ${params.type === 'PERSON' ? 'active' : ''}`}
            >
              <User size={14} />
              <span>บุคคลธรรมดา</span>
              <span style={{ opacity: 0.85, fontSize: '11px' }}>({personCount})</span>
            </Link>
            <Link
              href={`/customers?type=BUSINESS${params.q ? `&q=${params.q}` : ''}`}
              className={`customer-pill-item ${params.type === 'BUSINESS' ? 'active' : ''}`}
            >
              <Building2 size={14} />
              <span>นิติบุคคล / ร้านค้า</span>
              <span style={{ opacity: 0.85, fontSize: '11px' }}>({businessCount})</span>
            </Link>
          </div>
        </div>

        {/* CUSTOMER TABLE */}
        {filteredCustomers.length ? (
          <div className="customer-table-container">
            <table className="customer-modern-table">
              <thead>
                <tr>
                  <th style={{ width: '130px' }}>รหัสลูกค้า</th>
                  <th style={{ minWidth: '240px' }}>ชื่อลูกค้า & ประเภท</th>
                  <th style={{ minWidth: '200px' }}>การติดต่อ (เบอร์โทร / โซเชียล)</th>
                  <th style={{ minWidth: '130px' }}>ช่องทาง</th>
                  <th style={{ minWidth: '120px' }}>ประวัติงาน</th>
                  <th style={{ minWidth: '130px' }}>วันที่เพิ่ม</th>
                  <th style={{ width: '70px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const jobCount = customer.jobs?.[0]?.count ?? 0;
                  const isBusiness = customer.customer_type === 'BUSINESS';

                  return (
                    <tr key={customer.id} className="customer-row-item">
                      {/* Code */}
                      <td>
                        <Link href={`/customers/${customer.id}`} style={{ textDecoration: 'none' }}>
                          <span className="c-code-badge">
                            {customer.customer_number || 'CUS-NEW'}
                          </span>
                        </Link>
                      </td>

                      {/* Name & Avatar */}
                      <td>
                        <Link href={`/customers/${customer.id}`} className="c-profile-cell">
                          <div className={`c-avatar-circle ${isBusiness ? 'business' : 'person'}`}>
                            {isBusiness ? <Building2 size={18} /> : <User size={18} />}
                          </div>
                          <div className="c-name-box">
                            <span className="c-name-text">{customer.name}</span>
                            <span className={`c-type-tag ${isBusiness ? 'business' : 'person'}`}>
                              {isBusiness ? 'นิติบุคคล / ร้านค้า' : 'บุคคลธรรมดา'}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* Contact Info */}
                      <td>
                        <div className="c-contact-stack">
                          {customer.phone ? (
                            <a href={`tel:${customer.phone}`} className="c-phone-link">
                              <Phone size={13} style={{ color: '#dc2626' }} />
                              <span>{customer.phone}</span>
                            </a>
                          ) : (
                            <span style={{ color: '#a1a1aa', fontSize: '12px' }}>ไม่ระบุเบอร์</span>
                          )}

                          <div className="c-social-row">
                            {customer.line_name && (
                              <span className="c-social-pill line">
                                <MessageCircle size={11} />
                                <span>{customer.line_name}</span>
                              </span>
                            )}
                            {customer.facebook_name && (
                              <span className="c-social-pill fb">
                                <span>FB: {customer.facebook_name}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Lead Source */}
                      <td>
                        <span className="c-lead-source-tag">
                          {customer.lead_source?.name ?? 'ไม่ระบุ'}
                        </span>
                      </td>

                      {/* Job History */}
                      <td>
                        <Link
                          href={`/customers/${customer.id}?tab=jobs`}
                          className={`c-job-badge ${jobCount > 0 ? 'has-jobs' : 'empty'}`}
                        >
                          <BriefcaseBusiness size={13} />
                          <span>{jobCount} งาน</span>
                        </Link>
                      </td>

                      {/* Date */}
                      <td>
                        <span style={{ fontSize: '12px', color: '#71717a', fontWeight: 500 }}>
                          {new Intl.DateTimeFormat('th-TH', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            timeZone: 'Asia/Bangkok',
                          }).format(new Date(customer.created_at))}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'center' }}>
                        <Link
                          href={`/customers/${customer.id}`}
                          className="c-view-btn"
                          title="ดูรายละเอียดลูกค้า"
                        >
                          <ChevronRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            style={{
              padding: '60px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              textAlign: 'center',
              color: '#71717a',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={28} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#18181b', margin: 0 }}>
              ไม่พบข้อมูลลูกค้าที่ค้นหา
            </h3>
            <p style={{ fontSize: '13px', margin: 0, color: '#71717a' }}>
              {params.q
                ? `ไม่พบคำว่า "${params.q}" ลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่อีกครั้ง`
                : 'เริ่มต้นเพิ่มลูกค้ารายแรกเพื่อเปิดใช้งานระบบ CRM'}
            </p>
            <Link className="primary-button" href="/customers/new" style={{ marginTop: '6px' }}>
              <Plus size={16} />
              <span>เพิ่มลูกค้าใหม่</span>
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
