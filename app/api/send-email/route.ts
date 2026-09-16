// Transactional email endpoint — sends app-triggered emails (welcome, etc.)
// via Brevo HTTP API in production, logs in development.
//
// Supabase handles all auth emails (confirmation, password reset, invites)
// directly through its own SMTP integration with Brevo.

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getTeamMemberByEmail } from '@/lib/db/team-members';
import { checkRateLimit, formatResetTime } from '@/lib/rate-limit';
import { isValidEmail } from '@/lib/validation';

export async function POST(req: NextRequest) {
  // Authenticate: only logged-in team members can trigger emails
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit by user ID
  const { success: allowed, resetMs } = checkRateLimit('send-email:' + user.id);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many email requests. Please try again in ${formatResetTime(resetMs)}.` },
      { status: 429 }
    );
  }

  let body: { to?: string; subject?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { to, subject, html } = body;

  if (!to || !subject || !html) {
    return NextResponse.json({ error: 'Missing required fields: to, subject, html' }, { status: 400 });
  }

  if (typeof to !== 'string' || !isValidEmail(to)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  if (typeof html !== 'string' || html.length > 512_000) {
    return NextResponse.json({ error: 'Email body too large' }, { status: 400 });
  }

  // Prevent the open-mailer: the `to` address must belong to the caller's own org —
  // either a team_member or a client within the same org_id.
  if (!user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const callerMember = await getTeamMemberByEmail(user.email);
  if (!callerMember?.org_id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const toLower = to.toLowerCase();
  const callerOrgId = callerMember.org_id;

  const [{ data: memberMatch }, { data: clientMatch }] = await Promise.all([
    supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('org_id', callerOrgId)
      .eq('email', toLower)
      .maybeSingle(),
    supabaseAdmin
      .from('clients')
      .select('id')
      .eq('org_id', callerOrgId)
      .eq('email', toLower)
      .maybeSingle(),
  ]);

  if (!memberMatch && !clientMatch) {
    return NextResponse.json(
      { error: 'Recipient must be a member or client of your workspace.' },
      { status: 400 }
    );
  }

  // Development: log summary (no PII)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Email] dev mode — subject: "${subject}", HTML length: ${html.length} chars`);
    return NextResponse.json({ success: true, mode: 'development' });
  }

  // Production: send via Brevo HTTP API
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error('[Email] BREVO_API_KEY is not set — skipping email send');
    return NextResponse.json({ success: true, mode: 'stub' });
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@nexusapp.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Nexus';

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`[Email] Brevo API error ${res.status}: ${errBody}`);
      return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 });
    }

    return NextResponse.json({ success: true, mode: 'brevo' });
  } catch (err) {
    console.error('[Email] Brevo API request failed:', err);
    return NextResponse.json({ error: 'Email delivery failed' }, { status: 502 });
  }
}
