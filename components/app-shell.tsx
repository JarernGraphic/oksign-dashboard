import Link from 'next/link';
import {
  Bell, Boxes, BriefcaseBusiness, ChevronDown, CircleDollarSign, ClipboardList, FileText,
  LayoutDashboard, Paintbrush, Plus, Search, Settings, Truck, Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { CurrentProfile } from '../lib/current-profile';
import { logoutAction } from '../app/actions';

const navigation = [
  { label: 'ภาพรวม', items: [{ name: 'แดชบอร์ด', icon: LayoutDashboard, href: '/' }] },
  { label: 'งานขาย', items: [
    { name: 'ใบรับงาน', icon: ClipboardList, href: '/jobs/new' },
    { name: 'ลูกค้า', icon: Users, href: '/customers' },
    { name: 'ใบเสนอราคา', icon: FileText, href: '/quotations' },
    { name: 'รายการงาน', icon: BriefcaseBusiness, href: '/jobs' },
  ] },
  { label: 'การดำเนินงาน', items: [
    { name: 'งานออกแบบ', icon: Paintbrush, href: '/jobs?stage=DESIGN' },
    { name: 'งานผลิต', icon: Boxes, href: '/jobs?stage=PRODUCTION' },
    { name: 'จัดส่ง / ติดตั้ง', icon: Truck, href: '/jobs?stage=DELIVERY' },
  ] },
  { label: 'การเงินและระบบ', items: [
    { name: 'รับชำระเงิน', icon: CircleDollarSign, href: '/payments' },
    { name: 'ตั้งค่า', icon: Settings, href: '/settings' },
  ] },
];

export function AppShell({ children, profile, active, createHref = '/jobs/new' }: { children: ReactNode; profile: CurrentProfile; active: string; createHref?: string }) {
  return <main className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><img src="/oksign_logo.png" alt="OKSIGN Logo" className="brand-logo" /><div><strong>OKSIGN</strong><span>Dashboard</span></div></Link>
      <nav className="navigation" aria-label="เมนูหลัก">
        {navigation.map((section) => <div className="nav-section" key={section.label}><p>{section.label}</p>{section.items.map((item) => {
          const Icon = item.icon;
          return <Link className={`nav-item ${active === item.href ? 'active' : ''}`} href={item.href} key={item.name}><Icon size={18} /><span>{item.name}</span></Link>;
        })}</div>)}
      </nav>
      <form action={logoutAction}><button className="sidebar-user" type="submit" title="ออกจากระบบ"><div className="avatar">{profile.full_name.slice(0,1)}</div><div><strong>{profile.full_name}</strong><span>{profile.role.name_th}</span></div><ChevronDown size={16} /></button></form>
    </aside>
    <section className="workspace">
      <header className="topbar"><div className="mobile-brand"><img src="/oksign_logo.png" alt="OKSIGN" className="mobile-brand-logo" /><span>OKSIGN</span></div><form className="global-search" action="/search"><Search size={18} /><input name="q" aria-label="ค้นหาทั้งระบบ" placeholder="ค้นหาเลขที่งาน ลูกค้า เบอร์โทร..." /><kbd>Enter</kbd></form><div className="top-actions"><Link className="icon-button" href="/notifications" aria-label="การแจ้งเตือน"><Bell size={20} /></Link><Link className="primary-button" href={createHref}><Plus size={18} />สร้างงานใหม่</Link></div></header>
      <div className="content">{children}<footer><span>{profile.organization.name} · OKSIGN Dashboard</span><span>เชื่อมต่อฐานข้อมูลแล้ว <i /></span></footer></div>
    </section>
  </main>;
}
