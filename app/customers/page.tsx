import Link from 'next/link';
import {
  BriefcaseBusiness, Building2, ChevronRight, CircleDollarSign, Filter,
  MessageCircle, Phone, Plus, Search, User, UserPlus, Users
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

  let query = supabase
    .from('customers')
    .select(`
      id, customer_number, name, customer_type, phone, line_name, facebook_name, address, created_at,
      lead_source:lead_sources(name),
      jobs:jobs(count)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (params.q?.trim()) {
    const term = params.q.trim();
    query = query.or(
      `name.ilike.%${term}%,phone.ilike.%${term}%,customer_number.ilike.%${term}%,line_name.ilike.%${term}%,facebook_name.ilike.%${term}%`
    );
  }

  if (params.type && ['PERSON', 'BUSINESS'].includes(params.type)) {
    query = query.eq('customer_type', params.type);
  }

  const { data, error } = await query;
  const customers = (data ?? []) as unknown as Customer[];

  return (
    <AppShell profile={profile} active="/customers" createHref="/customers/new">
      <div className="section-heading">
        <div>
          <p>งานขาย & CRM</p>
          <h1>ลูกค้า (Customers)</h1>
          <span>ค้นหา จัดการข้อมูล และดูประวัติงาน/การเงินรายบุคคล</span>
        </div>
        <Link className="primary-button" href="/customers/new">
          <UserPlus size={17} />
          <span>เพิ่มลูกค้าใหม่</span>
        </Link>
      </div>

      {params.created ? (
        <div className="success-banner">บันทึกข้อมูลลูกค้าเรียบร้อยแล้ว</div>
      ) : null}

      <section className="panel list-panel">
        <div className="list-toolbar">
          <form className="search-form-wrap">
            <Search size={17} className="search-icon" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="ค้นหาชื่อ, เบอร์โทร, LINE, Facebook หรือรหัสลูกค้า..."
              className="search-input"
            />
            {params.type && <input type="hidden" name="type" value={params.type} />}
            <button type="submit" className="search-btn">ค้นหา</button>
          </form>

          <div className="filter-type-pills">
            <Link
              href={`/customers${params.q ? `?q=${params.q}` : ''}`}
              className={`filter-pill ${!params.type ? 'active' : ''}`}
            >
              ทั้งหมด ({customers.length})
            </Link>
            <Link
              href={`/customers?type=PERSON${params.q ? `&q=${params.q}` : ''}`}
              className={`filter-pill ${params.type === 'PERSON' ? 'active' : ''}`}
            >
              บุคคลธรรมดา
            </Link>
            <Link
              href={`/customers?type=BUSINESS${params.q ? `&q=${params.q}` : ''}`}
              className={`filter-pill ${params.type === 'BUSINESS' ? 'active' : ''}`}
            >
              นิติบุคคล / ร้านค้า
            </Link>
          </div>
        </div>

        {error ? (
          <div className="error-state">โหลดข้อมูลไม่สำเร็จ: {error.message}</div>
        ) : customers.length ? (
          <div className="table-wrap">
            <table className="customers-data-table">
              <thead>
                <tr>
                  <th>รหัสลูกค้า</th>
                  <th>ชื่อลูกค้า</th>
                  <th>เบอร์โทรศัพท์</th>
                  <th>LINE / Facebook</th>
                  <th>ช่องทาง</th>
                  <th>ประวัติงาน</th>
                  <th>วันที่เพิ่ม</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const jobCount = customer.jobs?.[0]?.count ?? 0;
                  return (
                    <tr key={customer.id} className="clickable-customer-row">
                      <td>
                        <Link href={`/customers/${customer.id}`} className="customer-code-link">
                          <strong>{customer.customer_number || 'CUS-NEW'}</strong>
                        </Link>
                      </td>
                      <td>
                        <Link href={`/customers/${customer.id}`} className="customer-name-cell">
                          <span className="customer-avatar-badge">
                            {customer.customer_type === 'BUSINESS' ? (
                              <Building2 size={16} />
                            ) : (
                              <User size={16} />
                            )}
                          </span>
                          <div>
                            <strong className="c-full-name">{customer.name}</strong>
                            <span className="c-type-sub">
                              {customer.customer_type === 'BUSINESS' ? 'บริษัท / ร้านค้า' : 'บุคคลธรรมดา'}
                            </span>
                          </div>
                        </Link>
                      </td>
                      <td>
                        {customer.phone ? (
                          <span className="phone-cell">
                            <Phone size={13} />
                            {customer.phone}
                          </span>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <div className="social-cell">
                          {customer.line_name && (
                            <span className="badge-social line">
                              <MessageCircle size={12} /> {customer.line_name}
                            </span>
                          )}
                          {customer.facebook_name && (
                            <span className="badge-social fb">
                              FB: {customer.facebook_name}
                            </span>
                          )}
                          {!customer.line_name && !customer.facebook_name && <span className="text-muted">-</span>}
                        </div>
                      </td>
                      <td>
                        <span className="badge gray mini">
                          {customer.lead_source?.name ?? 'ไม่ระบุ'}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/customers/${customer.id}?tab=jobs`}
                          className={`job-count-badge ${jobCount > 0 ? 'has-jobs' : ''}`}
                        >
                          <BriefcaseBusiness size={13} />
                          <span>{jobCount} งาน</span>
                        </Link>
                      </td>
                      <td>
                        <span className="date-muted">
                          {new Intl.DateTimeFormat('th-TH', {
                            dateStyle: 'medium',
                            timeZone: 'Asia/Bangkok',
                          }).format(new Date(customer.created_at))}
                        </span>
                      </td>
                      <td className="action-col">
                        <Link href={`/customers/${customer.id}`} className="view-profile-btn" title="ดูโปรไฟล์">
                          <ChevronRight size={18} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <Users size={36} />
            <h3>ไม่พบข้อมูลลูกค้า</h3>
            <p>{params.q ? 'ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง' : 'เริ่มเพิ่มลูกค้ารายแรกเพื่อเปิดใช้งาน'}</p>
            <Link className="primary-button" href="/customers/new">
              <Plus size={16} />
              <span>เพิ่มลูกค้า</span>
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
