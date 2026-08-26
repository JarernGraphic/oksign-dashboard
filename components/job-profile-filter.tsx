'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronDown, Filter, Search, User, UserCheck, X } from 'lucide-react';

export type ProfileOption = {
  id: string;
  name: string;
  avatar_url?: string | null;
  role_name?: string;
};

export function JobProfileFilter({
  graphics,
  admins,
  selectedGraphicId = '',
  selectedAdminId = '',
  stage = '',
  selectedYear = '',
  selectedMonth = '',
}: {
  graphics: ProfileOption[];
  admins: ProfileOption[];
  selectedGraphicId?: string;
  selectedAdminId?: string;
  stage?: string;
  selectedYear?: string;
  selectedMonth?: string;
}) {
  const router = useRouter();

  const [graphicId, setGraphicId] = useState<string>(selectedGraphicId);
  const [adminId, setAdminId] = useState<string>(selectedAdminId);

  const [isGraphicOpen, setIsGraphicOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  const [graphicSearch, setGraphicSearch] = useState<string>('');
  const [adminSearch, setAdminSearch] = useState<string>('');

  const graphicRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (graphicRef.current && !graphicRef.current.contains(event.target as Node)) {
        setIsGraphicOpen(false);
      }
      if (adminRef.current && !adminRef.current.contains(event.target as Node)) {
        setIsAdminOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedGraphic = graphics.find((g) => g.id === graphicId);
  const selectedAdmin = admins.find((a) => a.id === adminId);

  const filteredGraphics = graphics.filter((g) => {
    const q = graphicSearch.toLowerCase().trim();
    if (!q) return true;
    return g.name.toLowerCase().includes(q) || (g.role_name && g.role_name.toLowerCase().includes(q));
  });

  const filteredAdmins = admins.filter((a) => {
    const q = adminSearch.toLowerCase().trim();
    if (!q) return true;
    return a.name.toLowerCase().includes(q) || (a.role_name && a.role_name.toLowerCase().includes(q));
  });

  const applyFilters = (newGraphicId = graphicId, newAdminId = adminId) => {
    const p = new URLSearchParams();
    if (stage) p.set('stage', stage);
    if (selectedYear) p.set('year', selectedYear);
    if (selectedMonth) p.set('month', selectedMonth);
    if (newGraphicId) p.set('graphic_id', newGraphicId);
    if (newAdminId) p.set('admin_id', newAdminId);

    const str = p.toString();
    router.push(str ? `/jobs?${str}` : '/jobs');
  };

  const handleSelectGraphic = (id: string) => {
    setGraphicId(id);
    setIsGraphicOpen(false);
    applyFilters(id, adminId);
  };

  const handleSelectAdmin = (id: string) => {
    setAdminId(id);
    setIsAdminOpen(false);
    applyFilters(graphicId, id);
  };

  const handleClearFilters = () => {
    setGraphicId('');
    setAdminId('');
    applyFilters('', '');
  };

  return (
    <div className="job-profile-filter-row">
      {/* GRAPHIC PROFILE SELECTOR */}
      <div className="profile-filter-item" ref={graphicRef}>
        <label className="filter-label">แยกตามกราฟิก:</label>
        <div
          className={`profile-filter-trigger ${isGraphicOpen ? 'open' : ''} ${graphicId ? 'active' : ''}`}
          onClick={() => {
            setIsGraphicOpen(!isGraphicOpen);
            setIsAdminOpen(false);
          }}
        >
          {selectedGraphic ? (
            <div className="trigger-profile-content">
              {selectedGraphic.avatar_url ? (
                <img src={selectedGraphic.avatar_url} alt={selectedGraphic.name} className="filter-avatar-img" />
              ) : (
                <div className="filter-avatar-placeholder">{selectedGraphic.name.slice(0, 1)}</div>
              )}
              <span className="filter-profile-name">{selectedGraphic.name}</span>
            </div>
          ) : (
            <div className="trigger-profile-content placeholder">
              <User size={15} className="filter-icon" />
              <span>กราฟิกทุกคน</span>
            </div>
          )}
          <ChevronDown size={14} className="filter-arrow" />
        </div>

        {/* Graphic Dropdown Menu */}
        {isGraphicOpen && (
          <div className="profile-filter-popover">
            <div className="filter-search-box">
              <Search size={13} />
              <input
                type="text"
                placeholder="ค้นหากราฟิก..."
                value={graphicSearch}
                onChange={(e) => setGraphicSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="filter-options-scroll">
              <div
                className={`profile-option-row ${!graphicId ? 'active' : ''}`}
                onClick={() => handleSelectGraphic('')}
              >
                <div className="filter-avatar-placeholder all">ALL</div>
                <div className="profile-option-info">
                  <span className="opt-name">กราฟิกทุกคน</span>
                  <span className="opt-role">แสดงงานของทุกคน</span>
                </div>
                {!graphicId && <Check size={14} className="check-mark" />}
              </div>

              {filteredGraphics.map((g) => (
                <div
                  key={g.id}
                  className={`profile-option-row ${graphicId === g.id ? 'active' : ''}`}
                  onClick={() => handleSelectGraphic(g.id)}
                >
                  {g.avatar_url ? (
                    <img src={g.avatar_url} alt={g.name} className="filter-avatar-img" />
                  ) : (
                    <div className="filter-avatar-placeholder">{g.name.slice(0, 1)}</div>
                  )}
                  <div className="profile-option-info">
                    <span className="opt-name">{g.name}</span>
                    <span className="opt-role">{g.role_name || 'กราฟิก'}</span>
                  </div>
                  {graphicId === g.id && <Check size={14} className="check-mark" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ADMIN PROFILE SELECTOR */}
      <div className="profile-filter-item" ref={adminRef}>
        <label className="filter-label">แยกตามแอดมิน:</label>
        <div
          className={`profile-filter-trigger ${isAdminOpen ? 'open' : ''} ${adminId ? 'active' : ''}`}
          onClick={() => {
            setIsAdminOpen(!isAdminOpen);
            setIsGraphicOpen(false);
          }}
        >
          {selectedAdmin ? (
            <div className="trigger-profile-content">
              {selectedAdmin.avatar_url ? (
                <img src={selectedAdmin.avatar_url} alt={selectedAdmin.name} className="filter-avatar-img" />
              ) : (
                <div className="filter-avatar-placeholder admin">{selectedAdmin.name.slice(0, 1)}</div>
              )}
              <span className="filter-profile-name">{selectedAdmin.name}</span>
            </div>
          ) : (
            <div className="trigger-profile-content placeholder">
              <UserCheck size={15} className="filter-icon" />
              <span>แอดมินทุกคน</span>
            </div>
          )}
          <ChevronDown size={14} className="filter-arrow" />
        </div>

        {/* Admin Dropdown Menu */}
        {isAdminOpen && (
          <div className="profile-filter-popover">
            <div className="filter-search-box">
              <Search size={13} />
              <input
                type="text"
                placeholder="ค้นหาแอดมิน..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="filter-options-scroll">
              <div
                className={`profile-option-row ${!adminId ? 'active' : ''}`}
                onClick={() => handleSelectAdmin('')}
              >
                <div className="filter-avatar-placeholder all">ALL</div>
                <div className="profile-option-info">
                  <span className="opt-name">แอดมินทุกคน</span>
                  <span className="opt-role">แสดงงานของทุกคน</span>
                </div>
                {!adminId && <Check size={14} className="check-mark" />}
              </div>

              {filteredAdmins.map((a) => (
                <div
                  key={a.id}
                  className={`profile-option-row ${adminId === a.id ? 'active' : ''}`}
                  onClick={() => handleSelectAdmin(a.id)}
                >
                  {a.avatar_url ? (
                    <img src={a.avatar_url} alt={a.name} className="filter-avatar-img" />
                  ) : (
                    <div className="filter-avatar-placeholder admin">{a.name.slice(0, 1)}</div>
                  )}
                  <div className="profile-option-info">
                    <span className="opt-name">{a.name}</span>
                    <span className="opt-role">{a.role_name || 'แอดมิน'}</span>
                  </div>
                  {adminId === a.id && <Check size={14} className="check-mark" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clear Filters Button if any profile is selected */}
      {(graphicId || adminId) && (
        <button
          type="button"
          className="clear-profile-filter-btn"
          onClick={handleClearFilters}
          title="ล้างตัวกรองผู้รับผิดชอบ"
        >
          <X size={14} />
          <span>ล้างตัวกรอง</span>
        </button>
      )}
    </div>
  );
}
