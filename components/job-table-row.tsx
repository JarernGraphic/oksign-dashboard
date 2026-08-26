'use client';

import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

export function JobTableRow({
  jobId,
  children,
}: {
  jobId: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/jobs/${jobId}`)}
      style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background-color 0.15s ease' }}
      className="clickable-job-row"
    >
      {children}
    </tr>
  );
}
