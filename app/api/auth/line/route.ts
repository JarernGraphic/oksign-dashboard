import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const channelId = process.env.LINE_CHANNEL_ID ?? '2011256114';

  // Use current request origin for callback
  const redirectUri = `${requestUrl.origin}/api/auth/line/callback`;
  const state = Math.random().toString(36).substring(2, 15);

  const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  lineAuthUrl.searchParams.set('response_type', 'code');
  lineAuthUrl.searchParams.set('client_id', channelId);
  lineAuthUrl.searchParams.set('redirect_uri', redirectUri);
  lineAuthUrl.searchParams.set('state', state);
  lineAuthUrl.searchParams.set('scope', 'profile openid');

  const response = NextResponse.redirect(lineAuthUrl.toString());
  response.cookies.set('line_oauth_state', state, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
  });

  return response;
}
