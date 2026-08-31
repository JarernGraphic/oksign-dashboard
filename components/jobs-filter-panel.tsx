'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';

export type ProfileFilterOption = {
  id: string;
  name: string;
  avatar_url?: string | null;
  role_name?: string;
};

export function JobsFilterPanel({
  isDesignPage = false,
  stage = '',
  selectedDesignStatus = '',
  selectedYear = '',
  selectedMonth = '',
  selectedGraphicId = '',
  selectedAdminId = '',
  selectedSort = 'date_desc',
  graphicsList = [],
  adminsList = [],
}: {
  isDesignPage?: boolean;
  stage?: string;
  selectedDesignStatus?: string;
  selectedYear?: string;
  selectedMonth?: string;
  selectedGraphicId?: string;
  selectedAdminId?: string;
  selectedSort?: string;
  graphicsList?: ProfileFilterOption[];
  adminsList?: ProfileFilterOption[];
}) {
  // If year, month, graphic, or admin is actively filtered, auto-expand
  const hasExtraFilters = Boolean(selectedYear || selectedMonth || selectedGraphicId || selectedAdminId || (selectedSort && selectedSort !== 'date_desc'));
  const [isExpanded, setIsExpanded] = useState<boolean>(hasExtraFilters);

  const monthsList = [
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
  ];

  const buildUrl = (override: {
    stage?: string;
    design_status?: string;
    year?: string;
    month?: string;
    graphic_id?: string;
    admin_id?: string;
    sort?: string;
  }) => {
    const p = new URLSearchParams();
    const curStage = override.stage !== undefined ? override.stage : (isDesignPage ? 'DESIGN' : stage);
    const curDesignStatus = override.design_status !== undefined ? override.design_status : selectedDesignStatus;
    const curYear = override.year !== undefined ? override.year : selectedYear;
    const curMonth = override.month !== undefined ? override.month : selectedMonth;
    const curGraphic = override.graphic_id !== undefined ? override.graphic_id : selectedGraphicId;
    const curAdmin = override.admin_id !== undefined ? override.admin_id : selectedAdminId;
    const curSort = override.sort !== undefined ? override.sort : selectedSort;

    if (curStage) p.set('stage', curStage);
    if (isDesignPage) {
      p.set('queue', 'design');
      if (curDesignStatus) p.set('design_status', curDesignStatus);
    }
    if (curYear) p.set('year', curYear);
    if (curMonth) p.set('month', curMonth);
    if (curGraphic) p.set('graphic_id', curGraphic);
    if (curAdmin) p.set('admin_id', curAdmin);
    if (curSort) p.set('sort', curSort);

    const str = p.toString();
    return str ? `/jobs?${str}` : '/jobs';
  };

  return (
    <div className="panel jobs-filter-panel-box">
      {/* 1. PRIMARY ROW: STAGE / STATUS + TOGGLE BUTTON */}
      <div className="filter-primary-header-row">
        {/* Stage / Status Pills */}
        {isDesignPage ? (
          <div className="filter-pill-row">
            <span className="filter-row-label">สถานะ:</span>
            {[
              { v: '', l: 'งานทั้งหมด' },
              { v: 'WAITING_DESIGN', l: 'รอยืนยัน' },
              { v: 'DESIGNING', l: 'กำลังออกแบบ' },
              { v: 'WAITING_CUSTOMER', l: 'ส่งแบบแล้ว' },
              { v: 'APPROVED', l: 'ผลิตแล้ว' },
            ].map((f) => {
              const isActive = selectedDesignStatus === f.v;
              return (
                <Link
                  key={f.v}
                  href={buildUrl({ design_status: f.v })}
                  className={`filter-pill ${isActive ? 'active' : ''}`}
                >
                  {f.l}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="filter-pill-row">
            <span className="filter-row-label">ขั้นตอน:</span>
            {[
              { v: '', l: 'ทั้งหมด' },
              { v: 'ADMIN', l: 'รับงาน' },
              { v: 'DESIGN', l: 'ออกแบบ' },
              { v: 'PRODUCTION', l: 'ผลิต' },
              { v: 'DELIVERY', l: 'ส่งมอบ' },
              { v: 'COMPLETE', l: 'เสร็จสิ้น' },
            ].map((f) => {
              const isActive = (stage || '') === f.v;
              return (
                <Link
                  key={f.v}
                  href={buildUrl({ stage: f.v })}
                  className={`filter-pill ${isActive ? 'active' : ''}`}
                >
                  {f.l}
                </Link>
              );
            })}
          </div>
        )}

        {/* COLLAPSE / EXPAND TOGGLE BUTTON */}
        <button
          type="button"
          className={`filter-toggle-expand-btn ${isExpanded ? 'expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? 'ย่อตัวกรอง' : 'ขยายตัวกรองเพิ่มเติม'}
        >
          <SlidersHorizontal size={14} />
          <span>{isExpanded ? 'ย่อตัวกรอง' : 'ตัวกรองเพิ่มเติม'}</span>
          {hasExtraFilters && !isExpanded && <span className="filter-active-dot" />}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 2. COLLAPSIBLE EXTRA FILTERS SECTION */}
      {isExpanded && (
        <div className="filter-collapsible-content">
          {/* Year Row */}
          <div className="filter-pill-row">
            <span className="filter-row-label">ปี:</span>
            {[
              { v: '', l: 'ทุกปี' },
              { v: '2026', l: '2026' },
              { v: '2025', l: '2025' },
            ].map((f) => {
              const isActive = selectedYear === f.v;
              return (
                <Link
                  key={f.v}
                  href={buildUrl({ year: f.v })}
                  className={`filter-pill ${isActive ? 'active' : ''}`}
                >
                  {f.l}
                </Link>
              );
            })}
          </div>

          {/* Month Row */}
          <div className="filter-pill-row">
            <span className="filter-row-label">เดือน:</span>
            {monthsList.map((f) => {
              const isActive = selectedMonth === f.v;
              return (
                <Link
                  key={f.v}
                  href={buildUrl({ month: f.v })}
                  className={`filter-pill filter-pill-sm ${isActive ? 'active' : ''}`}
                >
                  {f.l}
                </Link>
              );
            })}
          </div>

          {/* CONTINUOUS ROW: Graphic & Admin Filters */}
          {!isDesignPage && (
            <div className="filter-pill-row continuous-staff-row">
              {/* Graphic Group */}
              <div className="staff-pill-group">
                <span className="filter-row-label">แยกตามกราฟิก:</span>
                <Link
                  href={buildUrl({ graphic_id: '' })}
                  className={`filter-pill ${!selectedGraphicId ? 'active' : ''}`}
                >
                  กราฟิกทุกคน
                </Link>
                {graphicsList.map((g) => {
                  const isActive = selectedGraphicId === g.id;
                  return (
                    <Link
                      key={g.id}
                      href={buildUrl({ graphic_id: g.id })}
                      className={`filter-profile-pill ${isActive ? 'active' : ''}`}
                    >
                      {g.avatar_url ? (
                        <img src={g.avatar_url} alt={g.name} className="pill-avatar-img" />
                      ) : (
                        <span className="pill-avatar-placeholder">{g.name.slice(0, 1)}</span>
                      )}
                      <span>{g.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Admin Group (Continuous right after) */}
              <div className="staff-pill-group">
                <span className="filter-row-label">แยกตามแอดมิน:</span>
                <Link
                  href={buildUrl({ admin_id: '' })}
                  className={`filter-pill ${!selectedAdminId ? 'active' : ''}`}
                >
                  แอดมินทุกคน
                </Link>
                {adminsList.map((a) => {
                  const isActive = selectedAdminId === a.id;
                  return (
                    <Link
                      key={a.id}
                      href={buildUrl({ admin_id: a.id })}
                      className={`filter-profile-pill ${isActive ? 'active' : ''}`}
                    >
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt={a.name} className="pill-avatar-img" />
                      ) : (
                        <span className="pill-avatar-placeholder admin">{a.name.slice(0, 1)}</span>
                      )}
                      <span>{a.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
