import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { getCurrentProfile } from '../../../../lib/current-profile';
import { PrintHeaderActions } from './print-actions';
import { JobPaperSheet } from '../../../../components/job-paper-sheet';

type JobOrderSpec = {
  receiverName?: string;
  title?: string;
  dimensions?: string;
  width?: string;
  height?: string;
  quantity?: number;
  unitPrice?: number;
  installCost?: number;
  installLocation?: string;
  totalBaht?: number;
  depositBaht?: number;
  depositMethod?: string;
  remainingBaht?: number;
  remainingMethod?: string;
  openedDate?: string;
  dueDate?: string;
  designCondition?: string;
  contactChannel?: string;
  facebookContact?: string;
  lineContact?: string;
  phoneContact?: string;
  shapes?: string[];
  printers?: string[];
  materials?: string[];
  customMaterial?: string;
  boardTypes?: string[];
  finishing?: string[];
  customFinishing?: string;
  notes?: string;
  priority?: string;
};

type JobDataResult = {
  id: string;
  job_number: string;
  title: string;
  stage: string;
  status: string;
  priority: string;
  deadline: string | null;
  grand_total_satang: number;
  paid_amount_satang: number;
  created_at: string;
  customer: { name: string; phone: string | null; line_name: string | null } | null;
  brief: { requirements: string; dimensions: string | null; material: string | null; quantity: number; created_at: string } | null;
};

export default async function JobPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getCurrentProfile();
  const supabase = await createSupabaseServerClient();

  const { data: jobData, error } = await supabase
    .from('jobs')
    .select(`
      id,
      job_number,
      title,
      stage,
      status,
      priority,
      deadline,
      grand_total_satang,
      paid_amount_satang,
      created_at,
      customer:customers(name, phone, line_name),
      brief:briefs(requirements, dimensions, material, quantity, created_at)
    `)
    .eq('id', id)
    .single();

  if (error || !jobData) notFound();
  const job = jobData as unknown as JobDataResult;

  // Parse structured spec if available
  let spec: JobOrderSpec = {};
  if (job.brief?.requirements) {
    try {
      spec = JSON.parse(job.brief.requirements);
    } catch {
      spec = { notes: job.brief.requirements };
    }
  }

  return (
    <div className="print-page-wrapper">
      <PrintHeaderActions jobId={job.id} />

      <div className="print-a5-container">
        <JobPaperSheet
          job={job as any}
          spec={spec}
          hideToolbar={true}
          printMode={true}
        />
      </div>
    </div>
  );
}
