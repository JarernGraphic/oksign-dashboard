'use client';

import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function PrintHeaderActions({ jobId }: { jobId: string }) {
  return (
    <div className="print-screen-header no-print">
      <Link href={`/jobs/${jobId}`} className="secondary-button">
        <ArrowLeft size={16} />
        กลับหน้ารายละเอียดงาน
      </Link>
      <div className="print-header-info">
        <span>ขนาดเอกสาร: A5 (148 × 210 มม.)</span>
        <button
          className="primary-button"
          onClick={() => window.print()}
          type="button"
        >
          <Printer size={18} />
          พิมพ์ใบรับงาน (Print A5)
        </button>
      </div>
    </div>
  );
}
