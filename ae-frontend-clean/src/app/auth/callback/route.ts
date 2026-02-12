import { createApiRouteClient } from '@/lib/supabase/server';
import { EDITOR_ROUTE } from '@/lib/routes'
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Auth Callback Route
 * Handles Supabase OAuth/email confirmation callbacks
 * Exchanges auth code for session and redirects to appropriate page
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || EDITOR_ROUTE

  if (code) {
    // Create response object that will be returned
    const response = NextResponse.next()
    const { supabase } = await createApiRouteClient()

    console.log('[auth:callback] Exchanging code for session...');
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      console.log('[auth:callback] ✓ Session exchanged successfully');
      // Create profile if it doesn't exist
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check if profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        // Create profile if it doesn't exist
        if (!profile) {
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
          })

          // Create billing_status record if it doesn't exist
          await supabase.from('billing_status').insert({
            user_id: user.id,
            plan: 'free',
            status: 'locked',
          })
        }
      }

      // Redirect to next page or editor
      console.log('[auth:callback] Redirecting to:', next);
      const redirectResponse = NextResponse.redirect(new URL(next, request.url))
      
      // Copy cookies from response to redirect response
      response.cookies.getAll().forEach(({ name, value }) => {
        redirectResponse.cookies.set(name, value);
      });
      
      return redirectResponse;
    } else {
      console.error('[auth:callback] Failed to exchange code:', error.message);
    }
  } else {
    console.error('[auth:callback] No code provided in callback');
  }

  // Redirect to login if there was an error
  return NextResponse.redirect(new URL('/login?error=auth', request.url))
}
