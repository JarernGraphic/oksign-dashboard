import Link from 'next/link';
import {
  ArrowUpRight, BriefcaseBusiness, Calendar, CheckCircle2, Clock, Factory,
  FileCheck, Layers, Palette, Phone, Plus, Send, Sparkles, User, UserCheck
} from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { JobTableRow } from '../../components/job-table-row';
import { JobsFilterPanel } from '../../components/jobs-filter-panel';

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
  customer: { name: string; phone?: string | null } | null;
};

const stageLabels: Record<string, string> = {
  ADMIN: 'รับงาน',
  DESIGN: 'ออกแบบ/แก้ไข',
  PRODUCTION: 'ผลิต',
  DELIVERY: 'ส่งมอบ',
  COMPLETE: 'เสร็จสิ้น',
};

const getJobStatusBadge = (job: Job) => {
  if (job.stage === 'ADMIN' || job.design_status === 'WAITING_DESIGN') {
    return {
      label: 'รอยืนยัน',
      icon: Clock,
      style: { backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }
    };
  }
  if (job.stage === 'DESIGN') {
    if (job.design_status === 'WAITING_CUSTOMER') {
      return {
        label: 'ส่งแบบ/แก้ไข',
        icon: Send,
        style: { backgroundColor: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }
      };
    }
    if (job.design_status === 'APPROVED') {
      return {
        label: 'ยืนยันการผลิต',
        icon: Factory,
        style: { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fed7aa' }
      };
    }
    return {
      label: 'ออกแบบ/แก้ไข',
      icon: Palette,
      style: { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }
    };
  }
  if (job.stage === 'PRODUCTION') {
    return {
      label: 'รอผลิต',
      icon: Factory,
      style: { backgroundColor: '#ffedd5', color: '#c2410c', borderColor: '#fed7aa' }
    };
  }
  if (job.stage === 'DELIVERY' || job.stage === 'COMPLETE' || job.status === 'COMPLETED') {
    return {
      label: 'เสร็จสิ้น',
      icon: CheckCircle2,
      style: { backgroundColor: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }
    };
  }
  return {
    label: 'เสร็จสิ้น',
    icon: CheckCircle2,
    style: { backgroundColor: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }
  };
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
    queue?: string;
  }>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const stage = params.stage;
  const isDesignPage = stage === 'DESIGN' && params.queue === 'design';
  const selectedDesignStatus = params.design_status || '';
  const selectedYear = params.year || '';
  const selectedMonth = params.month || '';
  const selectedGraphicId = params.graphic_id || (isDesignPage && profile.role.code === 'GRAPHIC' ? profile.id : '');
  const selectedAdminId = params.admin_id || '';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const startOfThisMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
  const endOfThisMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

  // 1. Build Main Jobs Query
  let mainQuery = supabase
    .from('jobs')
    .select('id, job_number, title, stage, status, design_status, priority, deadline, grand_total_satang, assigned_graphic_id, created_by, created_at, customer:customers(name, phone)')
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
      mainQuery = mainQuery.eq('stage', 'DESIGN').or('design_status.eq.DESIGNING,design_status.eq.REVISION,design_status.is.null');
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

  // 2. Fetch Profiles, Stats, and Jobs Concurrently
  const allProfilesPromise = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role:roles(code, name_th)')
    .order('full_name');

  const statsPromise = isDesignPage
    ? Promise.all([
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('assigned_graphic_id', selectedGraphicId || profile.id).or('stage.eq.ADMIN,design_status.eq.WAITING_DESIGN'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('assigned_graphic_id', selectedGraphicId || profile.id).eq('stage', 'DESIGN').or('design_status.eq.DESIGNING,design_status.eq.REVISION,design_status.is.null'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('assigned_graphic_id', selectedGraphicId || profile.id).eq('stage', 'DESIGN').eq('design_status', 'WAITING_CUSTOMER'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('assigned_graphic_id', selectedGraphicId || profile.id).gte('created_at', startOfThisMonth).lte('created_at', endOfThisMonth),
      ])
    : Promise.all([
        Promise.resolve({ count: 0 }),
        Promise.resolve({ count: 0 }),
        Promise.resolve({ count: 0 }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).gte('created_at', startOfThisMonth).lte('created_at', endOfThisMonth),
      ]);

  const [{ data: allProfilesData }, [statWaitingRes, statDesigningRes, statSentProofRes, statMonthlyRes], { data: rawJobsData, error }] = await Promise.all([
    allProfilesPromise,
    statsPromise,
    mainQuery,
  ]);

  const allProfiles = allProfilesData || [];
  const graphicsList = allProfiles
    .filter((p: any) => p.role?.code === 'GRAPHIC' || p.role?.name_th?.includes('กราฟิก'))
    .map((p: any) => ({
      id: p.id,
      name: p.full_name,
      avatar_url: p.avatar_url,
      role_name: p.role?.name_th || 'กราฟิก',
    }));

  const adminsList = allProfiles
    .filter((p: any) => ['ADMIN', 'OWNER'].includes(p.role?.code))
    .map((p: any) => ({
      id: p.id,
      name: p.full_name,
      avatar_url: p.avatar_url,
      role_name: p.role?.name_th || (p.role?.code === 'OWNER' ? 'เจ้าของร้าน' : 'แอดมิน'),
    }));

  // Map profile names for easy lookup
  const profileMap = new Map<string, string>();
  allProfiles.forEach((p: any) => profileMap.set(p.id, p.full_name));

  const statWaitingCount = statWaitingRes.count || 0;
  const statDesigningCount = statDesigningRes.count || 0;
  const statSentProofCount = statSentProofRes.count || 0;
  const statMonthlyTotalCount = statMonthlyRes.count || 0;

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
      // Ignore if table or network error
    }
  }

  const activeNav = isDesignPage ? '/jobs?stage=DESIGN&queue=design' : '/jobs';

  return (
    <AppShell profile={profile} active={activeNav} showCreateButton={false}>
      <div className="section-heading" style={{ marginBottom: '22px' }}>
        <div>
          <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>
            {isDesignPage ? 'การดำเนินงาน' : 'งานขาย'}
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#0f172a', margin: '0 0 4px' }}>
            {isDesignPage ? 'งานออกแบบ/แก้ไข' : 'รายการงานทั้งหมด'}
          </h1>
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            {isDesignPage
              ? 'ติดตามและจัดการคิวงานออกแบบ/แก้ไขของทีมงาน'
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
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>งานที่กำลังออกแบบ/แก้ไข</span>
              <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '2px 0 0', color: '#0f172a' }}>{statDesigningCount}</h2>
            </div>
          </div>

          <div className="panel" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '16px', background: '#fff', borderRadius: '10px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileCheck size={24} />
            </div>
            <div>
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>งานที่ส่งแบบ/แก้ไข</span>
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
      <JobsFilterPanel
        isDesignPage={isDesignPage}
        stage={stage}
        selectedDesignStatus={selectedDesignStatus}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        selectedGraphicId={selectedGraphicId}
        selectedAdminId={selectedAdminId}
        graphicsList={graphicsList}
        adminsList={adminsList}
      />

      {/* 3. MODERN TABLE SECTION */}
      <section className="panel list-panel" style={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden', background: '#fff' }}>
        {error ? (
          <div className="error-state" style={{ padding: '24px', color: '#dc2626', fontSize: '14px' }}>{error.message}</div>
        ) : jobs.length ? (
          <div className="table-wrap" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                  <th style={{ width: '76px', padding: '14px 16px', textAlign: 'center', fontWeight: '600' }}>รูปงาน</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '120px' }}>รหัสงาน / วันที่</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '180px' }}>ชื่องาน</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '150px' }}>ลูกค้า / เบอร์ติดต่อ</th>
                  <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '140px' }}>สถานะงาน</th>
                  {!isDesignPage ? <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '140px' }}>คนออกแบบ</th> : null}
                  <th style={{ padding: '14px 16px', fontWeight: '600', minWidth: '130px' }}>Admin</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '600', width: '100px' }}>ความสำคัญ</th>
                  {!isDesignPage ? <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: '600', width: '120px' }}>ยอดงาน</th> : null}
                  <th style={{ width: '48px', padding: '14px 12px', textAlign: 'center' }}></th>
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
                  const isUrgent = job.priority === 'URGENT';
                  const isHigh = job.priority === 'HIGH';
                  const isLow = job.priority === 'LOW';

                  return (
                    <JobTableRow key={job.id} jobId={job.id}>
                      {/* 1. รูป Thumbnail ทางซ้ายสุด */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#f8fafc',
                            margin: '0 auto',
                            position: 'relative'
                          }}
                        >
                          {thumbnailUrl ? (
                            <img
                              src={thumbnailUrl}
                              alt={job.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <Layers size={22} style={{ color: '#94a3b8' }} />
                          )}
                        </div>
                      </td>

                      {/* 2. รหัสงาน และวันที่สร้าง */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: '700', color: '#2563eb', fontSize: '14.5px', letterSpacing: '0.2px' }}>
                            #{job.job_number}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'Asia/Bangkok' }).format(new Date(job.created_at))}
                          </span>
                        </div>
                      </td>

                      {/* 3. ชื่องาน และกำหนดส่ง */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <strong style={{ fontSize: '14.5px', color: '#0f172a', fontWeight: '600', lineHeight: 1.35 }}>
                            {job.title}
                          </strong>
                          {job.deadline && (
                            <span style={{ fontSize: '12px', color: '#e11d48', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={11} /> ส่ง {new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(job.deadline))}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. ชื่อลูกค้า และเบอร์โทร */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                            {job.customer?.name ?? '-'}
                          </span>
                          {job.customer?.phone && (
                            <span style={{ fontSize: '12px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={11} /> {job.customer.phone}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. สถานะงานแบบ Pill Badge มีไอคอน */}
                      <td style={{ padding: '12px 16px' }}>
                        {(() => {
                          const badge = getJobStatusBadge(job);
                          const Icon = badge.icon;
                          return (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '12.5px',
                                fontWeight: '600',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                border: `1px solid ${badge.style.borderColor}`,
                                backgroundColor: badge.style.backgroundColor,
                                color: badge.style.color,
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Icon size={13} />
                              {badge.label}
                            </span>
                          );
                        })()}
                      </td>

                      {/* 6. ชื่อคนออกแบบ (หน้ารายการงานเท่านั้น) */}
                      {!isDesignPage ? (
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '13px',
                              fontWeight: '500',
                              color: job.assigned_graphic_id ? '#0284c7' : '#94a3b8',
                              backgroundColor: job.assigned_graphic_id ? '#f0f9ff' : '#f8fafc',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              border: job.assigned_graphic_id ? '1px solid #e0f2fe' : '1px solid #e2e8f0',
                            }}
                          >
                            <User size={13} />
                            {graphicName}
                          </span>
                        </td>
                      ) : null}

                      {/* 7. ชื่อ Admin */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                          <UserCheck size={14} style={{ color: '#64748b' }} />
                          {adminName}
                        </span>
                      </td>

                      {/* 8. ความสำคัญ */}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: '600',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            backgroundColor: isUrgent ? '#fee2e2' : isHigh ? '#ffedd5' : isLow ? '#f1f5f9' : '#f8fafc',
                            color: isUrgent ? '#dc2626' : isHigh ? '#ea580c' : isLow ? '#64748b' : '#475569',
                            border: isUrgent ? '1px solid #fecaca' : isHigh ? '1px solid #fed7aa' : '1px solid #e2e8f0',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {priorityLabels[job.priority] ?? job.priority}
                        </span>
                      </td>

                      {/* 9. ยอดงาน (หน้ารายการงานเท่านั้น) */}
                      {!isDesignPage ? (
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '700', color: '#0f172a', fontSize: '15px' }}>
                          {new Intl.NumberFormat('th-TH', {
                            style: 'currency',
                            currency: 'THB',
                          }).format(job.grand_total_satang / 100)}
                        </td>
                      ) : null}

                      {/* 10. ลูกศรดูรายละเอียดงาน */}
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#f1f5f9',
                            color: '#64748b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <ArrowUpRight size={15} />
                        </div>
                      </td>
                    </JobTableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '16px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#94a3b8' }}>
              <Layers size={32} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '600', color: '#1e293b', margin: '0 0 6px' }}>
              {isDesignPage ? 'ไม่พบคิวงานออกแบบที่ตรงกับเงื่อนไข' : 'ไม่พบรายการงานที่ตรงกับเงื่อนไข'}
            </h3>
            <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
              ลองปรับเปลี่ยนตัวกรองเดือน ปี หรือสถานะงาน เพื่อค้นหาข้อมูล
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}
