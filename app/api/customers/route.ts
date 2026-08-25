import { NextResponse } from 'next/server';
import { getCurrentProfile } from '../../../lib/current-profile';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, any>;
    const {
      name, companyName, customerType = 'PERSON', phone, email,
      lineName, facebookName, website, taxId, address,
      leadSourceId, note, avatarUrl,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'กรุณากรอกชื่อลูกค้า' }, { status: 400 });
    }

    const profile = await getCurrentProfile();
    const supabase = await createSupabaseServerClient();

    const insertPayload: any = {
      organization_id: profile.organization_id,
      customer_number: '',
      customer_type: customerType === 'BUSINESS' ? 'BUSINESS' : 'PERSON',
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      line_name: lineName?.trim() || null,
      facebook_name: facebookName?.trim() || null,
      tax_id: taxId?.trim() || null,
      address: address?.trim() || null,
      lead_source_id: leadSourceId || null,
      note: note?.trim() || null,
      created_by: profile.id,
    };

    // If company_name / avatar_url / website exist or we pack into payload:
    if (companyName?.trim()) insertPayload.company_name = companyName.trim();
    if (avatarUrl?.trim()) insertPayload.avatar_url = avatarUrl.trim();
    if (website?.trim()) insertPayload.website = website.trim();

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(insertPayload)
      .select('id, customer_number, name, phone, line_name, facebook_name')
      .single();

    if (error) {
      // If company_name / avatar_url column error, retry without extra fields
      if (error.message.includes('column') || error.code === '42703') {
        delete insertPayload.company_name;
        delete insertPayload.avatar_url;
        delete insertPayload.website;
        const { data: fallbackCustomer, error: fallbackError } = await supabase
          .from('customers')
          .insert(insertPayload)
          .select('id, customer_number, name, phone, line_name, facebook_name')
          .single();
        if (fallbackError) return NextResponse.json({ error: fallbackError.message }, { status: 500 });
        return NextResponse.json({ success: true, customer: fallbackCustomer });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, customer: newCustomer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
