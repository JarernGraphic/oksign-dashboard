import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './supabase/server';

export type CurrentProfile = {
  id: string;
  organization_id: string;
  full_name: string;
  role: { code: string; name_th: string };
  organization: { name: string };
};

export async function getCurrentProfile(): Promise<CurrentProfile> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data, error } = await supabase
    .from('profiles')
    .select('id, organization_id, full_name, role:roles(code,name_th), organization:organizations(name)')
    .eq('id', user.id)
    .single();

  if (error || !data) redirect('/setup');
  return data as unknown as CurrentProfile;
}
