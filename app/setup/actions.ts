'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type SetupState = { error?: string };
const schema = z.object({ name: z.string().trim().min(2), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), fullName: z.string().trim().min(2) });

export async function setupAction(_state: SetupState, formData: FormData): Promise<SetupState> {
  const parsed = schema.safeParse({ name: formData.get('name'), slug: formData.get('slug'), fullName: formData.get('fullName') });
  if (!parsed.success) return { error: 'กรุณากรอกข้อมูลให้ครบ และใช้ slug ภาษาอังกฤษตัวเล็ก' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('bootstrap_organization', { organization_name: parsed.data.name, organization_slug: parsed.data.slug, owner_full_name: parsed.data.fullName });
  if (error) return { error: error.message };
  redirect('/');
}
