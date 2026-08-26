import Link from 'next/link';
import {
  BriefcaseBusiness, Calendar, Clock, FileCheck, Layers, Plus, Sparkles, User, UserCheck
} from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { JobTableRow } from '../../components/job-table-row';

type Job = {
  id: string;
  job_number: string;
  title: string;
  stage: string;
  status: string;
  design_status?: string;
  priority: string;
  deadline: string | null;
  grand_total_satang: number;
  assigned_graphic_id: string | null;
  created_by: string | null;
  created_at: string;
  customer: { name: string } | null;
};

const stageLabels: Record<string, string> = {
  ADMIN: 'รับงาน',
  DESIGN: 'ออกแบบ',
  PRODUCTION: 'ผลิต',
  DELIVERY: 'ส่งมอบ',
  COMPLETE: 'เสร็จสิ้น',
};

const priorityLabels: Record<string, string> = {
  LOW: 'ต่ำ',
  NORMAL: 'ปกติ',
  HIGH: 'สูง',
  URGENT: 'ด่วนที่สุด',
};

const monthsList = [
  { value: '1', label: 'มกราคม' },
  { value: '2', label: 'กุมภาพันธ์' },
  { value: '3', label: 'มีนาคม' },
  { value: '4', label: 'เมษายน' },
  { value: '5', label: 'พฤษภาคม' },
  { value: '6', label: 'มิถุนายน' },
  { value: '7', label: 'กรกฎาคม' },
  { value: '8', label: 'สิงหาคม' },
  { value: '9', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' },
];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    stage?: string;
    design_status?: string;
    year?: string;
    month?: string;
    graphic_id?: string;
    admin_id?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const stage = params.stage;
  const isDesignPage = stage === 'DESIGN';
  const selectedDesignStatus = params.design_status || '';
  const selectedYear = params.year || '';
  const selectedMonth = params.month || '';
  const selectedGraphicId = params.graphic_id || (isDesignPage && profile.role.code === 'GRAPHIC' ? profile.id : '');
  const selectedAdminId = params.admin_id || '';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // 1. Fetch all profiles for Filter dropdowns (Admins & Graphics)
  const { data: allProfilesData } = await supabase
    .from('profiles')
    .select('id, full_name, role:roles(code, name_th)')
    .order('full_name');

  const allProfiles = allProfilesData || [];
  const graphicsList = allProfiles.filter((p: any) => p.role?.code === 'GRAPHIC' || p.role?.code === 'OWNER');
  const adminsList = allProfiles.filter((p: any) => ['ADMIN', 'OWNER'].includes(p.role?.code));

  // Map profile names for easy lookup
  const profileMap = new Map<string, string>();
  allProfiles.forEach((p: any) => profileMap.set(p.id, p.full_name));

  // 2. Query summary statistics for Top Cards
  const startOfThisMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
  const endOfThisMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

  let statWaitingCount = 0;
  let statDesigningCount = 0;
  let statSentProofCount = 0;
  let statMonthlyTotalCount = 0;

  if (isDesignPage) {
    const targetGraphic = selectedGraphicId || profile.id;
    const [
      { count: waitingCount },
      { count: designingCount },
      { count: sentProofCount },
      { count: monthlyCount },
    ] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('assigned_graphic_id', targetGraphic).eq('stage', 'ADMIN'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('assigned_graphic_id', targetGraphic).eq('stage', 'DESIGN'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('assigned_graphic_id', targetGraphic).eq('stage', 'DESIGN').eq('design_status', 'WAITING_CUSTOMER'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('assigned_graphic_id', targetGraphic).gte('created_at', startOfThisMonth).lte('created_at', endOfThisMonth),
    ]);

    statWaitingCount = waitingCount || 0;
    statDesigningCount = designingCount || 0;
    statSentProofCount = sentProofCount || 0;
    statMonthlyTotalCount = monthlyCount || 0;
  } else {
    const { count: monthlyCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfThisMonth)
      .lte('created_at', endOfThisMonth);

    statMonthlyTotalCount = monthlyCount || 0;
  }

  // 3. Main Jobs Query
  let mainQuery = supabase
    .from('jobs')
    .select('id, job_number, title, stage, status, priority, deadline, grand_total_satang, assigned_graphic_id, created_by, created_at, customer:customers(name)')
    .order('created_at', { ascending: false });

  if (isDesignPage) {
    // Graphic Design page ALWAYS scopes to graphic's assigned jobs (never leaves design page)
    const targetGraphic = selectedGraphicId || profile.id;
    if (targetGraphic) {
      mainQuery = mainQuery.eq('assigned_graphic_id', targetGraphic);
    }

    if (selectedDesignStatus === 'WAITING_DESIGN') {
      mainQuery = mainQuery.or('stage.eq.ADMIN,design_status.eq.WAITING_DESIGN');
    } else if (selectedDesignStatus === 'DESIGNING') {
      mainQuery = mainQuery.eq('stage', 'DESIGN').or('design_status.eq.DESIGNING,design_status.is.null');
    } else if (selectedDesignStatus === 'WAITING_CUSTOMER') {
      mainQuery = mainQuery.eq('design_status', 'WAITING_CUSTOMER');
    } else if (selectedDesignStatus === 'APPROVED') {
      mainQuery = mainQuery.or('design_status.eq.APPROVED,stage.eq.PRODUCTION');
    }
  } else {
    if (stage) {
      mainQuery = mainQuery.eq('stage', stage);
    }
    if (selectedGraphicId) {
      mainQuery = mainQuery.eq('assigned_graphic_id', selectedGraphicId);
    }
  }

  if (selectedAdminId) {
    mainQuery = mainQuery.eq('created_by', selectedAdminId);
  }

  const targetYear = selectedYear ? parseInt(selectedYear) : currentYear;

  if (selectedMonth) {
    const m = parseInt(selectedMonth);
    const startDate = new Date(targetYear, m - 1, 1, 0, 0, 0).toISOString();
    const endDate = new Date(targetYear, m, 0, 23, 59, 59, 999).toISOString();
    mainQuery = mainQuery.gte('created_at', startDate).lte('created_at', endDate);
  } else if (selectedYear) {
    const y = parseInt(selectedYear);
    const startDate = new Date(y, 0, 1, 0, 0, 0).toISOString();
    const endDate = new Date(y, 11, 31, 23, 59, 59, 999).toISOString();
    mainQuery = mainQuery.gte('created_at', startDate).lte('created_at', endDate);
  }

  const { data: rawJobsData, error } = await mainQuery;
  const jobs = (rawJobsData ?? []) as unknown as Job[];

  // 4. Fetch latest proof images for Thumbnails
  const jobIds = jobs.map((j) => j.id);
  const proofThumbnails = new Map<string, string>();
  if (jobIds.length > 0) {
    try {
      const { data: proofs } = await supabase
        .from('job_design_proofs')
        .select('job_id, image_url, version')
        .in('job_id', jobIds)
        .order('version', { ascending: false });

      proofs?.forEach((p) => {
        if (!proofThumbnails.has(p.job_id)) {
          proofThumbnails.set(p.job_id, p.image_url);
        }
      });
    } catch {
      // Ignore if table not yet migrated
    }
  }

  const activeNav = isDesignPage ? '/jobs?stage=DESIGN' : '/jobs';

  return (
    <AppShell profile={profile} active={activeNav} showCreateButton={false}>
      <div className="section-heading" style={{ marginBottom: '22px' }}>
        <div>
          <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>
            {isDesignPage ? 'การดำเนินงาน' : 'งานขาย'}
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>
            {isDesignPage ? 'งานออกแบบ' : 'รายการงานทั้งหมด'}
          </h1>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            {isDesignPage
              ? 'ติดตามและจัดการคิวงานออกแบบของทีมงาน'
              : 'ติดตามและบริหารจัดการ Job ทั้งหมดของร้าน'}
          </span>
        </div>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      {isDesignPage ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', borderRadius: '10px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={24} />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>งานที่รอยืนยัน</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0 0', color: '#0f172a' }}>{statWaitingCount}</h2>
            </div>
          </div>

          <div className="panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', borderRadius: '10px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={24} />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>งานที่กำลังออกแบบ</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0 0', color: '#0f172a' }}>{statDesigningCount}</h2>
            </div>
          </div>

          <div className="panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', borderRadius: '10px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileCheck size={24} />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>งานที่ส่งแบบแล้ว</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0 0', color: '#0f172a' }}>{statSentProofCount}</h2>
            </div>
          </div>

          <div className="panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', borderRadius: '10px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={24} />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>งานทั้งหมดของเดือนนี้</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0 0', color: '#0f172a' }}>{statMonthlyTotalCount}</h2>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div className="panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', borderRadius: '10px', gridColumn: 'span 1' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BriefcaseBusiness size={24} />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>จำนวนงานของเดือนนี้</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0 0', color: '#0f172a' }}>{statMonthlyTotalCount} งาน</h2>
            </div>
          </div>
        </div>
      )}

      {/* 2. FILTERS TOOLBAR */}
      <div className="panel" style={{ padding: '18px 22px', marginBottom: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Category Stage / Status Pill Buttons */}
        {isDesignPage ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', minWidth: '55px' }}>สถานะ:</span>
            {[
              { v: '', l: 'งานทั้งหมด' },
              { v: 'WAITING_DESIGN', l: 'รอยืนยัน' },
              { v: 'DESIGNING', l: 'กำลังออกแบบ' },
              { v: 'WAITING_CUSTOMER', l: 'ส่งแบบแล้ว' },
              { v: 'APPROVED', l: 'ผลิตแล้ว' },
            ].map((f) => {
              const isActive = selectedDesignStatus === f.v;
              const buildUrl = () => {
                const p = new URLSearchParams();
                p.set('stage', 'DESIGN');
                if (f.v) p.set('design_status', f.v);
                if (selectedYear) p.set('year', selectedYear);
                if (selectedMonth) p.set('month', selectedMonth);
                if (params.graphic_id) p.set('graphic_id', params.graphic_id);
                return `/jobs?${p.toString()}`;
              };

              return (
                <Link
                  key={f.v}
                  href={buildUrl()}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    background: isActive ? '#dc2626' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? '1px solid #dc2626' : '1px solid #cbd5e1',
                    boxShadow: isActive ? '0 3px 8px rgba(220, 38, 38, 0.22)' : '0 1px 2px rgba(0,0,0,0.03)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {f.l}
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', minWidth: '55px' }}>ขั้นตอน:</span>
            {[
              { v: '', l: 'ทั้งหมด' },
              { v: 'ADMIN', l: 'รับงาน' },
              { v: 'DESIGN', l: 'ออกแบบ' },
              { v: 'PRODUCTION', l: 'ผลิต' },
              { v: 'DELIVERY', l: 'ส่งมอบ' },
              { v: 'COMPLETE', l: 'เสร็จสิ้น' },
            ].map((f) => {
              const isActive = (stage || '') === f.v;
              const buildUrl = () => {
                const p = new URLSearchParams();
                if (f.v) p.set('stage', f.v);
                if (selectedYear) p.set('year', selectedYear);
                if (selectedMonth) p.set('month', selectedMonth);
                if (selectedGraphicId) p.set('graphic_id', selectedGraphicId);
                if (selectedAdminId) p.set('admin_id', selectedAdminId);
                const str = p.toString();
                return str ? `/jobs?${str}` : '/jobs';
              };

              return (
                <Link
                  key={f.v}
                  href={buildUrl()}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    background: isActive ? '#dc2626' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    border: isActive ? '1px solid #dc2626' : '1px solid #cbd5e1',
                    boxShadow: isActive ? '0 3px 8px rgba(220, 38, 38, 0.22)' : '0 1px 2px rgba(0,0,0,0.03)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {f.l}
                </Link>
              );
            })}
          </div>
        )}

        {/* Year Pill Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', minWidth: '55px' }}>ปี:</span>
          {[
            { v: '', l: 'ทุกปี' },
            { v: '2026', l: '2026' },
            { v: '2025', l: '2025' },
          ].map((f) => {
            const isActive = selectedYear === f.v;
            const buildUrl = () => {
              const p = new URLSearchParams();
              if (stage) p.set('stage', stage);
              if (f.v) p.set('year', f.v);
              if (selectedMonth) p.set('month', selectedMonth);
              if (selectedGraphicId) p.set('graphic_id', selectedGraphicId);
              if (selectedAdminId) p.set('admin_id', selectedAdminId);
              const str = p.toString();
              return str ? `/jobs?${str}` : '/jobs';
            };

            return (
              <Link
                key={f.v}
                href={buildUrl()}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  background: isActive ? '#dc2626' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  border: isActive ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  boxShadow: isActive ? '0 2px 6px rgba(220, 38, 38, 0.22)' : '0 1px 2px rgba(0,0,0,0.03)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {f.l}
              </Link>
            );
          })}
        </div>

        {/* Month Pill Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', minWidth: '55px' }}>เดือน:</span>
          {[
            { v: '', l: 'ทุกเดือน' },
            { v: '1', l: 'ม.ค.' },
            { v: '2', l: 'ก.พ.' },
            { v: '3', l: 'มี.ค.' },
            { v: '4', l: 'เม.ย.' },
            { v: '5', l: 'พ.ค.' },
            { v: '6', l: 'มิ.ย.' },
            { v: '7', l: 'ก.ค.' },
            { v: '8', l: 'ส.ค.' },
            { v: '9', l: 'ก.ย.' },
            { v: '10', l: 'ต.ค.' },
            { v: '11', l: 'พ.ย.' },
            { v: '12', l: 'ธ.ค.' },
          ].map((f) => {
            const isActive = selectedMonth === f.v;
            const buildUrl = () => {
              const p = new URLSearchParams();
              if (stage) p.set('stage', stage);
              if (selectedYear) p.set('year', selectedYear);
              if (f.v) p.set('month', f.v);
              if (selectedGraphicId) p.set('graphic_id', selectedGraphicId);
              if (selectedAdminId) p.set('admin_id', selectedAdminId);
              const str = p.toString();
              return str ? `/jobs?${str}` : '/jobs';
            };

            return (
              <Link
                key={f.v}
                href={buildUrl()}
                style={{
                  padding: '5px 13px',
                  borderRadius: '18px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  background: isActive ? '#dc2626' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  border: isActive ? '1px solid #dc2626' : '1px solid #cbd5e1',
                  boxShadow: isActive ? '0 2px 6px rgba(220, 38, 38, 0.22)' : '0 1px 2px rgba(0,0,0,0.03)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {f.l}
              </Link>
            );
          })}
        </div>

        {/* Graphic & Admin Filters Form (Main List Only) */}
        {!isDesignPage ? (
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <form method="get" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
              {stage ? <input type="hidden" name="stage" value={stage} /> : null}
              {selectedYear ? <input type="hidden" name="year" value={selectedYear} /> : null}
              {selectedMonth ? <input type="hidden" name="month" value={selectedMonth} /> : null}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>แยกตามกราฟิก:</label>
                <select
                  name="graphic_id"
                  defaultValue={selectedGraphicId}
                  style={{ padding: '7px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="">กราฟิกทุกคน</option>
                  {graphicsList.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.full_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>แยกตามแอดมิน:</label>
                <select
                  name="admin_id"
                  defaultValue={selectedAdminId}
                  style={{ padding: '7px 12px', fontSize: '14px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="">แอดมินทุกคน</option>
                  {adminsList.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.full_name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="secondary-button"
                style={{ height: '36px', padding: '0 16px', fontSize: '14px', borderRadius: '8px', marginLeft: 'auto' }}
              >
                กรองผู้รับผิดชอบ
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {/* 3. TABLE SECTION */}
      <section className="panel list-panel" style={{ borderRadius: '10px' }}>
        {error ? (
          <div className="error-state" style={{ padding: '20px', color: '#dc2626', fontSize: '14px' }}>{error.message}</div>
        ) : jobs.length ? (
          <div className="table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                  <th style={{ width: '70px', padding: '14px 16px', textAlign: 'center', fontWeight: '600' }}>รูปงาน</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>รหัสงาน</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>ชื่องาน</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>ชื่อลูกค้า</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>สถานะงาน</th>
                  {!isDesignPage ? <th style={{ padding: '14px 16px', fontWeight: '600' }}>ชื่อคนออกแบบ</th> : null}
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>ชื่อ Admin</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600' }}>ความสำคัญ</th>
                  {!isDesignPage ? <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600' }}>ยอดงาน</th> : null}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const graphicName = job.assigned_graphic_id
                    ? profileMap.get(job.assigned_graphic_id) || 'ไม่ระบุ'
                    : 'ยังไม่ได้เลือก';
                  const adminName = job.created_by
                    ? profileMap.get(job.created_by) || 'ระบบ'
                    : 'ไม่ระบุ';

                  const thumbnailUrl = proofThumbnails.get(job.id);

                  return (
                    <JobTableRow key={job.id} jobId={job.id}>
                      {/* 1. รูป Thumbnail ทางซ้ายสุด */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {thumbnailUrl ? (
                          <img
                            src={thumbnailUrl}
                            alt={job.title}
                            style={{ width: '52px', height: '52px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '52px',
                              height: '52px',
                              borderRadius: '8px',
                              background: '#f1f5f9',
                              border: '1px dashed #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#94a3b8',
                              margin: '0 auto'
                            }}
                          >
                            <Layers size={24} />
                          </div>
                        )}
                      </td>

                      {/* 2. รหัสงาน */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: '700', color: '#2563eb', fontSize: '15px' }}>
                          {job.job_number}
                        </span>
                      </td>

                      {/* 3. ชื่องาน */}
                      <td style={{ padding: '14px 16px', fontWeight: '600', color: '#1e293b', fontSize: '15px' }}>
                        {job.title}
                      </td>

                      {/* 4. ชื่อลูกค้า */}
                      <td style={{ padding: '14px 16px', color: '#334155', fontSize: '14px' }}>
                        {job.customer?.name ?? '-'}
                      </td>

                      {/* 5. สถานะงาน */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          className={`badge ${job.stage === 'DESIGN' ? 'amber' : job.stage === 'ADMIN' ? 'blue' : 'green'}`}
                          style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '16px' }}
                        >
                          {stageLabels[job.stage] || job.stage}
                        </span>
                      </td>

                      {/* 6. ชื่อคนออกแบบ (หน้ารายการงานเท่านั้น) */}
                      {!isDesignPage ? (
                        <td style={{ padding: '14px 16px', fontSize: '14px' }}>
                          <span style={{ fontWeight: 500, color: job.assigned_graphic_id ? '#0284c7' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={15} />
                            {graphicName}
                          </span>
                        </td>
                      ) : null}

                      {/* 7. ชื่อ Admin */}
                      <td style={{ padding: '14px 16px', fontSize: '14px', color: '#475569' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={15} />
                          {adminName}
                        </span>
                      </td>

                      {/* 8. ความสำคัญ */}
                      <td style={{ padding: '14px 16px' }}>
                        <span
                          className={`priority ${
                            job.priority === 'URGENT'
                              ? 'red'
                              : job.priority === 'HIGH'
                              ? 'orange'
                              : 'gray'
                          }`}
                          style={{ fontSize: '13px', padding: '5px 12px' }}
                        >
                          {priorityLabels[job.priority] ?? job.priority}
                        </span>
                      </td>

                      {/* 9. ยอดงาน (หน้ารายการงานเท่านั้น) */}
                      {!isDesignPage ? (
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>
                          {new Intl.NumberFormat('th-TH', {
                            style: 'currency',
                            currency: 'THB',
                          }).format(job.grand_total_satang / 100)}
                        </td>
                      ) : null}
                    </JobTableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '50px 20px', textAlign: 'center' }}>
            <BriefcaseBusiness size={44} style={{ color: '#94a3b8', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '17px', color: '#334155' }}>ยังไม่มีรายการงานในตัวกรองนี้</h3>
            <p style={{ fontSize: '14px', color: '#64748b' }}>ลองปรับเปลี่ยนตัวเลือกปี เดือน หรือประเภทการกรอง</p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
