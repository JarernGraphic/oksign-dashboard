import Link from 'next/link';
import {
  ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, BriefcaseBusiness, Calendar, CheckCircle2, Clock, Factory,
  FileCheck, Layers, Palette, Phone, Plus, Send, Sparkles, User, UserCheck
} from 'lucide-react';
import { AppShell } from '../../components/app-shell';
import { getCurrentProfile } from '../../lib/current-profile';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import { JobTableRow } from '../../components/job-table-row';
import { JobsFilterPanel } from '../../components/jobs-filter-panel';
import { JobSortSelect } from '../../components/job-sort-select';
import { ImageHoverPreview } from '../../components/image-hover-preview';
import { JobsInteractiveTable } from '../../components/jobs-interactive-table';

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
    sort?: string;
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
  const selectedSort = params.sort || 'date_desc';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const startOfThisMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
  const endOfThisMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59).toISOString();

  // 1. Build Main Jobs Query
  let mainQuery = supabase
    .from('jobs')
    .select('id, job_number, title, stage, status, design_status, priority, deadline, grand_total_satang, assigned_graphic_id, created_by, created_at, customer:customers(name, phone)');

  if (selectedSort === 'date_asc') {
    mainQuery = mainQuery.order('created_at', { ascending: true });
  } else if (selectedSort === 'job_number_desc') {
    mainQuery = mainQuery.order('job_number', { ascending: false });
  } else if (selectedSort === 'job_number_asc') {
    mainQuery = mainQuery.order('job_number', { ascending: true });
  } else {
    mainQuery = mainQuery.order('created_at', { ascending: false });
  }

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
  let filterStartDate: string;
  let filterEndDate: string;
  let periodLabel = 'ของเดือนนี้';

  const monthNames = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
  ];

  if (selectedMonth) {
    const m = parseInt(selectedMonth);
    filterStartDate = new Date(targetYear, m - 1, 1, 0, 0, 0).toISOString();
    filterEndDate = new Date(targetYear, m, 0, 23, 59, 59, 999).toISOString();
    periodLabel = `(${monthNames[m - 1]} ${targetYear + 543})`;
  } else if (selectedYear) {
    const y = parseInt(selectedYear);
    filterStartDate = new Date(y, 0, 1, 0, 0, 0).toISOString();
    filterEndDate = new Date(y, 11, 31, 23, 59, 59, 999).toISOString();
    periodLabel = `(ปี ${y + 543})`;
  } else {
    filterStartDate = startOfThisMonth;
    filterEndDate = endOfThisMonth;
    periodLabel = 'ของเดือนนี้';
  }

  mainQuery = mainQuery.gte('created_at', filterStartDate).lte('created_at', filterEndDate);

  // 2. Fetch Profiles, Stats, and Jobs Concurrently
  const allProfilesPromise = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role:roles(code, name_th)')
    .order('full_name');

  let qWaiting = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', filterStartDate)
    .lte('created_at', filterEndDate);

  let qDesigning = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', filterStartDate)
    .lte('created_at', filterEndDate);

  let qSentProof = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', filterStartDate)
    .lte('created_at', filterEndDate);

  let qTotalPeriod = supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', filterStartDate)
    .lte('created_at', filterEndDate);

  if (isDesignPage) {
    const targetGraphic = selectedGraphicId || profile.id;
    if (targetGraphic) {
      qWaiting = qWaiting.eq('assigned_graphic_id', targetGraphic);
      qDesigning = qDesigning.eq('assigned_graphic_id', targetGraphic);
      qSentProof = qSentProof.eq('assigned_graphic_id', targetGraphic);
      qTotalPeriod = qTotalPeriod.eq('assigned_graphic_id', targetGraphic);
    }

    qWaiting = qWaiting.or('stage.eq.ADMIN,design_status.eq.WAITING_DESIGN');
    qDesigning = qDesigning.eq('stage', 'DESIGN').or('design_status.eq.DESIGNING,design_status.eq.REVISION,design_status.is.null');
    qSentProof = qSentProof.eq('stage', 'DESIGN').eq('design_status', 'WAITING_CUSTOMER');
  } else {
    if (selectedGraphicId) {
      qTotalPeriod = qTotalPeriod.eq('assigned_graphic_id', selectedGraphicId);
    }
  }

  if (selectedAdminId) {
    qWaiting = qWaiting.eq('created_by', selectedAdminId);
    qDesigning = qDesigning.eq('created_by', selectedAdminId);
    qSentProof = qSentProof.eq('created_by', selectedAdminId);
    qTotalPeriod = qTotalPeriod.eq('created_by', selectedAdminId);
  }

  const statsPromise = Promise.all([qWaiting, qDesigning, qSentProof, qTotalPeriod]);

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

  // 100% Guaranteed In-Memory Sort
  if (selectedSort === 'date_asc') {
    jobs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (selectedSort === 'job_number_desc') {
    jobs.sort((a, b) => {
      const numA = parseInt(a.job_number.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.job_number.replace(/\D/g, '') || '0', 10);
      return numB - numA;
    });
  } else if (selectedSort === 'job_number_asc') {
    jobs.sort((a, b) => {
      const numA = parseInt(a.job_number.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.job_number.replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  } else {
    // date_desc (default)
    jobs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // 4. Fetch latest proof images for Thumbnails (with fail-safe fallback to activity_logs)
  const jobIds = jobs.map((j) => j.id);
  const proofThumbnails = new Map<string, string>();
  const technicianMap: Record<string, string> = {};

  if (jobIds.length > 0) {
    try {
      const [{ data: proofs }, { data: activityLogs }] = await Promise.all([
        supabase
          .from('job_design_proofs')
          .select('job_id, image_url, version')
          .in('job_id', jobIds)
          .order('version', { ascending: false }),
        supabase
          .from('activity_logs')
          .select('entity_id, action, metadata, user_id, user:profiles(full_name), created_at')
          .in('entity_id', jobIds)
          .in('action', ['DESIGN_PROOF', 'DESIGN_PROOF_CONFIRMED', 'DESIGN_PROOF_REMOVED', 'PROOF_SENT_TO_CUSTOMER', 'TECHNICIAN_CONFIRMED_ASSEMBLY'])
          .order('created_at', { ascending: false }),
      ]);

      proofs?.forEach((p) => {
        if (!proofThumbnails.has(p.job_id) && p.image_url) {
          proofThumbnails.set(p.job_id, p.image_url);
        }
      });

      if (activityLogs && activityLogs.length > 0) {
        const deletedIds = new Set(
          activityLogs
            .filter((l: any) => l.action === 'DESIGN_PROOF_REMOVED')
            .map((l: any) => l.metadata?.deleted_proof_id)
            .filter(Boolean)
        );

        activityLogs.forEach((l: any) => {
          if (l.action === 'TECHNICIAN_CONFIRMED_ASSEMBLY' && !technicianMap[l.entity_id]) {
            const techName = (l.user as any)?.full_name || l.metadata?.confirmed_by_name || l.metadata?.technician_name;
            if (techName) {
              technicianMap[l.entity_id] = techName;
            }
          }

          if (!proofThumbnails.has(l.entity_id) && !deletedIds.has(l.id)) {
            const imgUrl = l.metadata?.image_url || l.metadata?.publicUrl || l.metadata?.url;
            if (imgUrl) {
              proofThumbnails.set(l.entity_id, imgUrl);
            }
          }
        });
      }
    } catch {
      // Ignore if table or network error
    }
  }

  const activeNav = isDesignPage ? '/jobs?stage=DESIGN&queue=design' : '/jobs';

  const createSortUrl = (targetSort: string) => {
    const p = new URLSearchParams();
    if (stage) p.set('stage', stage);
    if (isDesignPage) {
      p.set('queue', 'design');
      if (selectedDesignStatus) p.set('design_status', selectedDesignStatus);
    }
    if (selectedYear) p.set('year', selectedYear);
    if (selectedMonth) p.set('month', selectedMonth);
    if (selectedGraphicId) p.set('graphic_id', selectedGraphicId);
    if (selectedAdminId) p.set('admin_id', selectedAdminId);
    if (targetSort) p.set('sort', targetSort);

    const str = p.toString();
    return str ? `/jobs?${str}` : '/jobs';
  };

  return (
    <AppShell profile={profile} active={activeNav} showCreateButton={false}>
      <div className="section-heading" style={{ marginBottom: '22px' }}>
        <div>
          <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', marginBottom: '2px' }}>
            {isDesignPage ? 'ออกแบบ' : 'งานขาย'}
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
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>งานทั้งหมด {periodLabel}</span>
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
              <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '500' }}>จำนวนงาน {periodLabel}</span>
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
        selectedSort={selectedSort}
        graphicsList={graphicsList}
        adminsList={adminsList}
      />

      {/* 3. MODERN TABLE SECTION */}
      {error ? (
        <div className="panel list-panel" style={{ padding: '24px', color: '#dc2626', fontSize: '14px', background: '#fff', borderRadius: '12px' }}>{error.message}</div>
      ) : (
        <JobsInteractiveTable
          jobs={jobs}
          proofThumbnails={Object.fromEntries(proofThumbnails)}
          profileMap={Object.fromEntries(profileMap)}
          technicianMap={technicianMap}
          isDesignPage={isDesignPage}
          initialSort={selectedSort}
        />
      )}
    </AppShell>
  );
}
