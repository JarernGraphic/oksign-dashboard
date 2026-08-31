'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ArrowUpDown } from 'lucide-react';

export function JobSortSelect({ currentSort = 'date_desc' }: { currentSort?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSortChange = (newSort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', newSort);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
      <ArrowUpDown size={14} style={{ color: '#64748b' }} />
      <span style={{ fontWeight: '500', color: '#64748b' }}>เรียงตาม:</span>
      <select
        value={currentSort}
        onChange={(e) => handleSortChange(e.target.value)}
        style={{
          padding: '5px 10px',
          borderRadius: '8px',
          border: '1px solid #cbd5e1',
          backgroundColor: '#ffffff',
          fontSize: '12.5px',
          color: '#0f172a',
          fontWeight: '600',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
      >
        <option value="date_desc">วันที่สร้าง (ล่าสุด)</option>
        <option value="date_asc">วันที่สร้าง (เก่าสุด)</option>
        <option value="job_number_desc">รหัสงาน (มากไปน้อย)</option>
        <option value="job_number_asc">รหัสงาน (น้อยไปมาก)</option>
      </select>
    </div>
  );
}
