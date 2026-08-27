import Link from 'next/link';
import {
  Bell, BriefcaseBusiness, CircleDollarSign, ClipboardList, FileText,
  LayoutDashboard, LogOut, Paintbrush, Plus, Search, Settings, Users, UserCheck, ChevronRight
} from 'lucide-react';
import type { ReactNode } from 'react';
import { logoutAction } from '../app/actions';
import { ThemeToggle } from './theme-toggle';
import { SidebarUserCard } from './sidebar-user-card';

export type CurrentProfile = {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string | null;
  unreadCount?: number;
  role?: { code: string; name_th: string } | null;
  organization: { id: string; name: string };
};

const navigation = [
  { label: 'ภาพรวม', items: [{ name: 'แดชบอร์ด', icon: LayoutDashboard, href: '/' }] },
  { label: 'งานขาย', items: [
    { name: 'ใบรับงาน', icon: ClipboardList, href: '/jobs/new' },
    { name: 'รายการงาน', icon: BriefcaseBusiness, href: '/jobs' },
    { name: 'ลูกค้า', icon: Users, href: '/customers' },
  ] },
  { label: 'การดำเนินงาน', items: [
    { name: 'งานออกแบบ', icon: Paintbrush, href: '/jobs?stage=DESIGN' },
    { name: 'พนักงาน', icon: UserCheck, href: '/staff' },
  ] },
  { label: 'การเงินและระบบ', items: [
    { name: 'ใบเสนอราคา', icon: FileText, href: '/quotations' },
    { name: 'รับชำระเงิน', icon: CircleDollarSign, href: '/payments' },
    { name: 'ตั้งค่า', icon: Settings, href: '/settings' },
  ] },
];

export function AppShell({
  children,
  profile,
  active,
  activeSubItem,
  createHref = '/jobs/new',
  showCreateButton = true,
}: {
  children: ReactNode;
  profile: CurrentProfile;
  active: string;
  activeSubItem?: { title: string; subtitle?: string; href?: string };
  createHref?: string;
  showCreateButton?: boolean;
}) {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <img src="/oksign_logo.png" alt="OKSIGN Logo" className="brand-logo" />
          <div><strong>OKSIGN</strong><span>Dashboard</span></div>
        </Link>
        <nav className="navigation" aria-label="เมนูหลัก">
          {navigation.map((section) => (
            <div className="nav-section" key={section.label}>
              <p>{section.label}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                const isItemActive = active === item.href || (item.href === '/jobs?stage=DESIGN' && active.includes('DESIGN'));
                return (
                  <div key={item.name} className="nav-item-wrapper">
                    <Link
                      className={`nav-item ${isItemActive ? 'active' : ''}`}
                      href={item.href}
                    >
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </Link>

                    {/* SUB-BRANCH NESTED ITEM (CONNECTED UNDER ACTIVE MENU) */}
                    {isItemActive && activeSubItem ? (
                      <div className="nav-sub-branch">
                        <div className="nav-sub-tree-line" />
                        <div className="nav-sub-item active" title={activeSubItem.title}>
                          <ChevronRight size={13} className="sub-arrow" />
                          <div className="sub-item-text">
                            <span className="sub-item-title">{activeSubItem.title}</span>
                            {activeSubItem.subtitle && (
                              <small className="sub-item-sub">{activeSubItem.subtitle}</small>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>
        <SidebarUserCard profile={profile as any} />
      </aside>
      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand">
            <img src="/oksign_logo.png" alt="OKSIGN" className="mobile-brand-logo" />
            <span>OKSIGN</span>
          </div>
          <form className="global-search" action="/search">
            <Search size={18} />
            <input name="q" aria-label="ค้นหาทั้งระบบ" placeholder="ค้นหาเลขที่งาน ลูกค้า เบอร์โทร..." />
            <kbd>Enter</kbd>
          </form>
          <div className="top-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ThemeToggle />
            <Link className="icon-button" href="/notifications" aria-label="การแจ้งเตือน" style={{ position: 'relative' }}>
              <Bell size={20} />
              {profile.unreadCount && profile.unreadCount > 0 ? (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    width: '9px',
                    height: '9px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    border: '2px solid #ffffff'
                  }}
                  title={`มี ${profile.unreadCount} การแจ้งเตือนใหม่`}
                />
              ) : null}
            </Link>
          </div>
        </header>
        <div className="content">
          {children}
          <footer>
            <span>{profile.organization.name} · OKSIGN Dashboard</span>
            <span>เชื่อมต่อฐานข้อมูลแล้ว <i /></span>
          </footer>
        </div>
      </section>
    </main>
  );
}