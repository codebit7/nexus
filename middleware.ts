import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

/* ── Security headers ─────────────────────────────────────────────────────── */
function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://api.brevo.com; frame-src 'self' https://*.supabase.co; frame-ancestors 'none'");
  return response;
}

/* ── Route classification ─────────────────────────────────────────────────── */
const KNOWN_PREFIXES = [
  '/api', '/auth', '/login', '/signup', '/setup-org', '/forgot-password',
  '/portal', '/dashboard', '/_next', '/favicon.ico',
  '/brand_assets',
];

/** Slug pattern: lowercase alphanumeric with hyphens, e.g. "lums", "my-company" */
const SLUG_RE = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)(\/.*)?$/;

function classifyRoute(pathname: string): 'portal' | 'dashboard' | 'workspace' | 'other' {
  if (pathname.startsWith('/portal')) return 'portal';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  for (const prefix of KNOWN_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return 'other';
  }
  if (pathname === '/') return 'other';
  if (SLUG_RE.test(pathname)) return 'workspace';
  return 'other';
}

/* ── Supabase auth helper ─────────────────────────────────────────────────── */
function createMiddlewareSupabase(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, getResponse: () => supabaseResponse };
}

/** Copy auth cookies from the Supabase response to another response */
function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value, cookie as any);
  });
}

/* ── Main middleware ───────────────────────────────────────────────────────── */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const routeType = classifyRoute(pathname);

  // ── Portal routes (unchanged) ─────────────────────────────────────────────
  if (routeType === 'portal') {
    if (pathname === '/portal/login') return withSecurityHeaders(NextResponse.next());

    const portalClientId = request.cookies.get('portal_client_id');
    if (!portalClientId?.value) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const csrfToken = request.cookies.get('portal_csrf_token');
    if (!csrfToken?.value) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('portal_client_id');
      return response;
    }

    return withSecurityHeaders(NextResponse.next());
  }

  // ── Non-workspace routes — just add headers ───────────────────────────────
  if (routeType === 'other') {
    return withSecurityHeaders(NextResponse.next());
  }

  // ── Workspace routes (dashboard or /{slug}/*) — require team auth ─────────
  // Block portal sessions from workspace
  const portalClientId = request.cookies.get('portal_client_id');
  if (portalClientId?.value) {
    return NextResponse.redirect(new URL('/portal/tasks', request.url));
  }

  // Authenticate via Supabase
  const { supabase, getResponse } = createMiddlewareSupabase(request);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith('sb-')) {
        response.cookies.delete(cookie.name);
      }
    });
    return response;
  }

  // ── /dashboard/* → redirect to /{slug}/* ──────────────────────────────────
  if (routeType === 'dashboard') {
    // Look up the user's workspace slug (single joined query)
    const { data: memberData } = await supabase
      .from('team_members')
      .select('organisations(slug)')
      .eq('id', user.id)
      .single();

    const slug = (memberData?.organisations as any)?.slug as string | undefined;

    if (slug) {
      const rest = pathname === '/dashboard' ? '' : pathname.slice('/dashboard'.length);
      const redirectUrl = new URL(`/${slug}${rest}${request.nextUrl.search}`, request.url);
      const response = NextResponse.redirect(redirectUrl);
      copyCookies(getResponse(), response);
      return withSecurityHeaders(response);
    }

    // No org/slug — let through (page will redirect to /setup-org)
    return withSecurityHeaders(getResponse());
  }

  // ── /{slug}/* → rewrite to /dashboard/* ───────────────────────────────────
  const match = pathname.match(SLUG_RE)!;
  const urlSlug = match[1];
  const rest = match[2] || '';                    // e.g. "/projects/abc"
  const dashboardPath = `/dashboard${rest}`;

  const rewriteUrl = new URL(dashboardPath, request.url);
  rewriteUrl.search = request.nextUrl.search;

  const response = NextResponse.rewrite(rewriteUrl, { request });
  copyCookies(getResponse(), response);
  response.headers.set('x-workspace-slug', urlSlug);

  return withSecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/).*)'],
};
