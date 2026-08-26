import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../../lib/supabase/server';


export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');

  if (error || !code) {
    console.error('LINE OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=line_cancelled', requestUrl.origin));
  }

  const channelId = process.env.LINE_CHANNEL_ID ?? '2011256114';
  const channelSecret = process.env.LINE_CHANNEL_SECRET ?? '5a2ba451a88781a5b7f082f1ab931d94';
  const redirectUri = `${requestUrl.origin}/api/auth/line/callback`;

  try {
    // 1. Exchange authorization code for LINE Access Token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('LINE token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/login?error=line_token_failed', requestUrl.origin));
    }

    // 2. Fetch User Profile from LINE
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const profileData = await profileRes.json();

    if (!profileRes.ok || !profileData.userId) {
      console.error('LINE profile fetch failed:', profileData);
      return NextResponse.redirect(new URL('/login?error=line_profile_failed', requestUrl.origin));
    }

    const { userId, displayName, pictureUrl } = profileData;

    // 3. Create or Sign In Supabase Auth Account
    const syntheticEmail = `line_${userId.toLowerCase()}@staff.oksign.local`;
    const syntheticPassword = `LINE_Pass_${userId.substring(0, 12)}!`;

    const supabase = await createSupabaseServerClient();

    // Try signing up
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: syntheticEmail,
      password: syntheticPassword,
      options: {
        data: {
          full_name: displayName,
          avatar_url: pictureUrl || null,
          line_user_id: userId,
        },
      },
    });

    // Sign in to set HTTP Session Cookie
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: syntheticPassword,
    });

    if (signInErr && !signInErr.message.toLowerCase().includes('email not confirmed')) {
      console.error('LINE Supabase session login error:', signInErr);
      return NextResponse.redirect(new URL('/login?error=line_session_failed', requestUrl.origin));
    }

    // Redirect to home (which checks getCurrentProfile and routes unapproved to /pending-approval)
    return NextResponse.redirect(new URL('/', requestUrl.origin));
  } catch (err) {
    console.error('LINE OAuth Route Error:', err);
    return NextResponse.redirect(new URL('/login?error=line_unknown_error', requestUrl.origin));
  }
}
