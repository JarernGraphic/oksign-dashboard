import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    const token = session?.access_token;
    const authHeader = token ? `Bearer ${token}` : request.headers.get('authorization') || '';

    const res = await fetch('http://localhost:3001/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: `ไม่สามารถเชื่อมต่อบริการซิงก์เซิร์ฟเวอร์ LAN ได้: ${err?.message}` }, { status: 500 });
  }
}
