// ---------------------------------------------------------------------------
// Email HTML templates — plain HTML strings for maximum email client compat.
// No React, no JSX. Inline styles only (email clients strip <style> blocks).
// ---------------------------------------------------------------------------

// ── Shared pieces ──────────────────────────────────────────────────────────

/** Escape HTML special characters to prevent injection in email templates. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const FONT_STACK =
  "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function header() {
  return `
    <tr>
      <td align="center" style="padding: 32px 0 24px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align: middle; padding-right: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 10px; background: linear-gradient(135deg, #7c3aed, #5b21b6); text-align: center; line-height: 32px; font-size: 14px; font-weight: 700; color: #ffffff;">N</div>
            </td>
            <td style="vertical-align: middle; font-family: ${FONT_STACK}; font-size: 20px; font-weight: 700; color: #18181b; letter-spacing: -0.03em;">
              Nexus
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function footer() {
  return `
    <tr>
      <td style="padding: 32px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="border-top: 1px solid #e4e4e7;"></td></tr>
          <tr>
            <td align="center" style="padding: 24px 0 8px; font-family: ${FONT_STACK}; font-size: 12px; color: #a1a1aa; line-height: 1.6;">
              &copy; 2026 Nexus. All rights reserved.
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 0 24px; font-family: ${FONT_STACK}; font-size: 11px; color: #d4d4d8; line-height: 1.5;">
              This is an automated message &mdash; please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function shell(topBorderGradient: string, inner: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Nexus</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden;">
          <!-- Top border strip -->
          <tr><td style="height: 4px; background: linear-gradient(90deg, ${topBorderGradient});"></td></tr>
          ${inner}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── 1. Signup confirmation email (link-based) ────────────────────────────
// Uses {{ .ConfirmationURL }} — Supabase replaces it with the verification link.
// Paste this template HTML into Supabase Dashboard > Auth > Email Templates > Confirm Signup
// AND into the "Magic Link" template (Supabase uses Magic Link for resends).

export function getSignupConfirmEmail(): string {
  const inner = `
    ${header()}

    <tr>
      <td align="center" style="padding: 0 32px 24px;">
        <!-- Icon -->
        <div style="width: 52px; height: 52px; border-radius: 14px; background-color: #f5f3ff; text-align: center; line-height: 52px; font-size: 24px; margin-bottom: 20px;">&#9993;</div>

        <h1 style="margin: 0 0 8px; font-family: ${FONT_STACK}; font-size: 22px; font-weight: 700; color: #18181b; letter-spacing: -0.02em;">
          Verify your email address
        </h1>
        <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 14px; color: #52525b; line-height: 1.6;">
          You&rsquo;re almost there. Click the button below to verify your email and finish creating your Nexus workspace.
        </p>
      </td>
    </tr>

    <!-- CTA Button -->
    <tr>
      <td align="center" style="padding: 0 32px 24px;">
        <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #5b21b6); color: #ffffff; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; letter-spacing: 0.01em;">
          Verify Email Address &rarr;
        </a>
      </td>
    </tr>

    <!-- Body text -->
    <tr>
      <td style="padding: 0 32px 8px; font-family: ${FONT_STACK}; font-size: 13px; color: #a1a1aa; line-height: 1.6; text-align: center;">
        This link expires in 24 hours.
      </td>
    </tr>

    <tr>
      <td style="padding: 8px 32px 24px; font-family: ${FONT_STACK}; font-size: 14px; color: #52525b; line-height: 1.7;">
        If the button doesn&rsquo;t work, copy and paste this URL into your browser:<br/>
        <span style="font-size: 12px; color: #7c3aed; word-break: break-all;">{{ .ConfirmationURL }}</span>
      </td>
    </tr>

    <!-- Security notice -->
    <tr>
      <td style="padding: 0 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 10px;">
          <tr>
            <td style="padding: 16px 20px; font-family: ${FONT_STACK}; font-size: 13px; color: #713f12; line-height: 1.6;">
              <span style="font-size: 15px; margin-right: 6px;">&#9888;&#65039;</span>
              If you did not create a Nexus account, you can safely ignore this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${footer()}`;

  return shell('#7c3aed, #5b21b6', inner);
}

// ── 2. Password reset email (link-based) ──────────────────────────────────
// Uses {{ .ConfirmationURL }} — Supabase replaces it with the password reset link.
// Paste this template HTML into Supabase Dashboard > Auth > Email Templates > Reset Password

export function getPasswordResetEmail(): string {
  const inner = `
    ${header()}

    <tr>
      <td align="center" style="padding: 0 32px 24px;">
        <!-- Icon -->
        <div style="width: 52px; height: 52px; border-radius: 14px; background-color: #fffbeb; text-align: center; line-height: 52px; font-size: 24px; margin-bottom: 20px;">&#128273;</div>

        <h1 style="margin: 0 0 8px; font-family: ${FONT_STACK}; font-size: 22px; font-weight: 700; color: #18181b; letter-spacing: -0.02em;">
          Reset your password
        </h1>
        <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 14px; color: #52525b; line-height: 1.6;">
          We received a request to reset the password for your Nexus account. Click the button below to set a new password.
        </p>
      </td>
    </tr>

    <!-- CTA Button -->
    <tr>
      <td align="center" style="padding: 0 32px 24px;">
        <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d97706, #b45309); color: #ffffff; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; letter-spacing: 0.01em;">
          Reset Password &rarr;
        </a>
      </td>
    </tr>

    <!-- Expiry + fallback -->
    <tr>
      <td style="padding: 0 32px 8px; font-family: ${FONT_STACK}; font-size: 13px; color: #a1a1aa; line-height: 1.6; text-align: center;">
        This link expires in 24 hours.
      </td>
    </tr>

    <tr>
      <td style="padding: 8px 32px 24px; font-family: ${FONT_STACK}; font-size: 14px; color: #52525b; line-height: 1.7;">
        If the button doesn&rsquo;t work, copy and paste this URL into your browser:<br/>
        <span style="font-size: 12px; color: #d97706; word-break: break-all;">{{ .ConfirmationURL }}</span>
      </td>
    </tr>

    <!-- Security notice — red -->
    <tr>
      <td style="padding: 0 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef2f2; border-radius: 10px;">
          <tr>
            <td style="padding: 16px 20px; font-family: ${FONT_STACK}; line-height: 1.6;">
              <div style="font-size: 13px; font-weight: 700; color: #dc2626; margin-bottom: 4px;">Did not request this?</div>
              <div style="font-size: 13px; color: #7f1d1d;">
                If you did not request a password reset, ignore this email. Your password will not change.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${footer()}`;

  return shell('#d97706, #b45309', inner);
}

// ── 3. Welcome email (sent by app after signup) ────────────────────────────

export function getWelcomeEmail(options: {
  memberName: string;
  companyName: string;
}): string {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const inner = `
    ${header()}

    <tr>
      <td align="center" style="padding: 0 32px 24px;">
        <!-- Icon -->
        <div style="width: 52px; height: 52px; border-radius: 14px; background-color: #ecfdf5; text-align: center; line-height: 52px; font-size: 24px; margin-bottom: 20px;">&#127881;</div>

        <h1 style="margin: 0 0 8px; font-family: ${FONT_STACK}; font-size: 22px; font-weight: 700; color: #18181b; letter-spacing: -0.02em;">
          Your workspace is ready
        </h1>
        <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 14px; color: #52525b; line-height: 1.6;">
          Hi {{MEMBER_NAME}}, your Nexus workspace for <strong>{{COMPANY_NAME}}</strong> has been created and is ready to use.
        </p>
      </td>
    </tr>

    <!-- Checklist -->
    <tr>
      <td style="padding: 0 32px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7;">
          <tr>
            <td style="padding: 20px 24px; font-family: ${FONT_STACK}; font-size: 14px; color: #3f3f46; line-height: 2;">
              <span style="color: #059669; font-weight: 700;">&#10003;</span>&nbsp; Add your team members<br/>
              <span style="color: #059669; font-weight: 700;">&#10003;</span>&nbsp; Create your first project<br/>
              <span style="color: #059669; font-weight: 700;">&#10003;</span>&nbsp; Add your clients
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA Button -->
    <tr>
      <td align="center" style="padding: 0 32px 24px;">
        <a href="${appUrl}/dashboard" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #5b21b6); color: #ffffff; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; letter-spacing: 0.01em;">
          Go to your dashboard &rarr;
        </a>
      </td>
    </tr>

    ${footer()}`
    .replace(/\{\{MEMBER_NAME\}\}/g, escapeHtml(options.memberName))
    .replace(/\{\{COMPANY_NAME\}\}/g, escapeHtml(options.companyName));

  return shell('#059669, #047857', inner);
}

// ── 4. Team invite email (sent when admin invites a new member) ─────────

export function getTeamInviteEmail(options: {
  memberName: string;
  companyName: string;
  inviterName: string;
  inviteLink: string;
}): string {
  const inner = `
    ${header()}

    <tr>
      <td align="center" style="padding: 0 32px 24px;">
        <!-- Icon -->
        <div style="width: 52px; height: 52px; border-radius: 14px; background-color: #f5f3ff; text-align: center; line-height: 52px; font-size: 24px; margin-bottom: 20px;">&#128101;</div>

        <h1 style="margin: 0 0 8px; font-family: ${FONT_STACK}; font-size: 22px; font-weight: 700; color: #18181b; letter-spacing: -0.02em;">
          You&rsquo;ve been invited
        </h1>
        <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 14px; color: #52525b; line-height: 1.6;">
          Hi {{MEMBER_NAME}}, <strong>{{INVITER_NAME}}</strong> has invited you to join <strong>{{COMPANY_NAME}}</strong> on Nexus.
        </p>
      </td>
    </tr>

    <!-- What to expect -->
    <tr>
      <td style="padding: 0 32px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border-radius: 12px; border: 1px solid #e4e4e7;">
          <tr>
            <td style="padding: 20px 24px; font-family: ${FONT_STACK}; font-size: 14px; color: #3f3f46; line-height: 2;">
              <span style="color: #7c3aed; font-weight: 700;">1.</span>&nbsp; Click the button below<br/>
              <span style="color: #7c3aed; font-weight: 700;">2.</span>&nbsp; Set your password<br/>
              <span style="color: #7c3aed; font-weight: 700;">3.</span>&nbsp; Start collaborating with your team
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- CTA Button -->
    <tr>
      <td align="center" style="padding: 0 32px 24px;">
        <a href="{{INVITE_LINK}}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #5b21b6); color: #ffffff; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 12px; letter-spacing: 0.01em;">
          Accept Invitation &rarr;
        </a>
      </td>
    </tr>

    <!-- Expiry note -->
    <tr>
      <td style="padding: 0 32px 8px; font-family: ${FONT_STACK}; font-size: 13px; color: #a1a1aa; line-height: 1.6; text-align: center;">
        This invitation link expires in 24 hours.
      </td>
    </tr>

    <!-- Security notice -->
    <tr>
      <td style="padding: 8px 32px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fef3c7; border-radius: 10px;">
          <tr>
            <td style="padding: 16px 20px; font-family: ${FONT_STACK}; font-size: 13px; color: #713f12; line-height: 1.6;">
              <span style="font-size: 15px; margin-right: 6px;">&#9888;&#65039;</span>
              If you did not expect this invitation, you can safely ignore this email. Do not click the link if you don&rsquo;t recognize the sender.
            </td>
          </tr>
        </table>
      </td>
    </tr>

    ${footer()}`
    .replace(/\{\{MEMBER_NAME\}\}/g, escapeHtml(options.memberName))
    .replace(/\{\{COMPANY_NAME\}\}/g, escapeHtml(options.companyName))
    .replace(/\{\{INVITER_NAME\}\}/g, escapeHtml(options.inviterName))
    .replace(/\{\{INVITE_LINK\}\}/g, options.inviteLink);

  return shell('#7c3aed, #5b21b6', inner);
}