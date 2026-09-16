# Supabase Email Setup — Brevo SMTP

This project uses **Brevo (formerly Sendinblue)** as the custom SMTP provider for Supabase auth emails, bypassing Supabase's default 2 emails/hour rate limit.

There are **two email channels** in this project:
1. **Supabase auth emails** (signup confirmation, password reset, invites) — sent by Supabase through Brevo SMTP, configured in the Supabase Dashboard.
2. **App-triggered emails** (welcome email after signup) — sent by the Next.js app through Brevo's HTTP API, configured via `BREVO_API_KEY` env var.

---

## Step 1 — Configure Brevo SMTP in Supabase Dashboard

> Supabase Dashboard → Authentication → SMTP Settings

| Setting        | Value                                       |
| -------------- | ------------------------------------------- |
| Enable Custom SMTP | **ON**                                  |
| Sender email   | `noreply@yourdomain.com` (must be verified in Brevo) |
| Sender name    | `Nexus`                                     |
| Host           | `smtp-relay.brevo.com`                      |
| Port number    | `587`                                       |
| Minimum interval between emails | `0` (Brevo handles rate limiting) |
| Username       | Your Brevo login email                      |
| Password       | Your Brevo **SMTP key** (NOT account password) |

**How to get your Brevo SMTP key:**
1. Log in to [Brevo](https://app.brevo.com)
2. Go to **Settings** → **SMTP & API** → **SMTP** tab
3. Copy the SMTP key (starts with `xsmtpsib-...`)

---

## Step 2 — Verify Sender Email in Brevo

> Brevo → Settings → Senders & IPs → Senders

1. Add `noreply@yourdomain.com` as a sender
2. Verify the email (Brevo sends a confirmation email)
3. This MUST match the "Sender email" in Supabase SMTP settings

If you use a custom domain, also add DNS records (DKIM, SPF) in Brevo → Settings → Senders & IPs → Domains to improve deliverability.

---

## Step 3 — Configure Auth URL Settings

> Supabase Dashboard → Authentication → URL Configuration

| Setting        | Value                                       |
| -------------- | ------------------------------------------- |
| Site URL       | `https://zamar-nexus-app.vercel.app`        |
| Redirect URLs  | Add ALL of these:                           |
|                | `https://zamar-nexus-app.vercel.app/**`     |
|                | `https://*.vercel.app/**` (preview deploys) |
|                | `http://localhost:3000/**` (local dev)       |

---

## Step 4 — Configure Auth General Settings

> Supabase Dashboard → Authentication → Providers → Email

| Setting                    | Value    |
| -------------------------- | -------- |
| Enable Email Signup        | **ON**   |
| Confirm email              | **ON**   |
| Secure email change        | **ON**   |
| OTP Expiry                 | `86400` (24 hours — matches link-based flow) |

---

## Step 5 — Update Email Templates

> Supabase Dashboard → Authentication → Email Templates

All templates use `{{ .ConfirmationURL }}` (clickable link), NOT `{{ .Token }}` (OTP code).

### Confirm Signup
- **Subject:** `Verify your Nexus account`
- **Body:** Paste the HTML from `getSignupConfirmEmail()` in `lib/email-templates.ts`

### Magic Link
- **Subject:** `Verify your Nexus account`
- **Body:** Paste the **same** HTML as Confirm Signup above
- *(Supabase uses the Magic Link template for signup resends)*

### Reset Password
- **Subject:** `Reset your Nexus password`
- **Body:** Paste the HTML from `getPasswordResetEmail()` in `lib/email-templates.ts`

### Invite User
- **Subject:** `You've been invited to Nexus`
- **Body:** Use Supabase's default invite template, or paste custom HTML
- *(The invite flow uses `{{ .ConfirmationURL }}` by default)*

**To get the HTML:**
```bash
npm run preview:emails
```
Then open `.email-previews/signup-confirm.html` and `.email-previews/password-reset.html` — copy the full HTML source and paste it into the Supabase template editor.

---

## Step 6 — Set Environment Variables

### Vercel (Production + Preview)

> Vercel Dashboard → Project Settings → Environment Variables

| Variable               | Value                                    | Environments      |
| ---------------------- | ---------------------------------------- | ----------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | `https://your-project.supabase.co`  | All               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key                   | All               |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key               | All               |
| `NEXT_PUBLIC_SITE_URL` | `https://zamar-nexus-app.vercel.app`     | Production        |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000`                  | Development       |
| `BREVO_API_KEY`        | Your Brevo API key (`xkeysib-...`)       | Production        |
| `BREVO_SENDER_EMAIL`   | `noreply@yourdomain.com`                 | Production        |
| `BREVO_SENDER_NAME`    | `Nexus`                                  | Production        |

**How to get your Brevo API key:**
1. Brevo → Settings → SMTP & API → **API Keys** tab
2. Create or copy an API key (starts with `xkeysib-...`)
3. This is different from the SMTP key — the API key is for Brevo's HTTP API

### Local Development (.env.local)

Copy `.env.local.example` and fill in your values. Emails are logged to console in dev mode.

---

## Step 7 — Test the Full Flow

After all configuration, verify these flows end-to-end:

### Signup
1. Go to `/signup` and create an account
2. Check email inbox → should receive "Verify your Nexus account" from Brevo
3. Click the verification link → should land on `/dashboard`
4. Check inbox again → should receive "Welcome to Nexus" email

### Password Reset
1. Go to `/forgot-password` and enter your email
2. Check email inbox → should receive "Reset your Nexus password" from Brevo
3. Click the reset link → should land on `/reset-password`
4. Set new password → should redirect to `/login`

### Team Invite
1. From `/dashboard/team-members`, invite a new member
2. Invited user checks email → should receive invite from Brevo
3. Click accept link → should land on `/reset-password` to set password
4. After setting password → should redirect to `/dashboard`

### Verify in Brevo
- Brevo → Transactional → Email Activity
- Confirm emails are appearing and showing "Delivered" status
- Check for any bounces or blocks

---

## Architecture Overview

```
┌────────────────────────────┐    ┌──────────────┐
│ Supabase Auth              │───▶│ Brevo SMTP   │──▶ User inbox
│ (signup, reset, invite)    │    │ smtp-relay.   │
│ Configured in Dashboard    │    │ brevo.com:587 │
└────────────────────────────┘    └──────────────┘

┌────────────────────────────┐    ┌──────────────┐
│ Next.js App                │───▶│ Brevo API    │──▶ User inbox
│ /api/send-email            │    │ api.brevo.   │
│ (welcome email)            │    │ com/v3/smtp  │
│ Uses BREVO_API_KEY env var │    └──────────────┘
└────────────────────────────┘
```

---

## Troubleshooting

**Emails not arriving?**
1. Check Brevo → Transactional → Email Activity for delivery status
2. Verify sender email is confirmed in Brevo → Settings → Senders
3. Check Supabase Dashboard → Authentication → SMTP Settings are saved
4. Check spam/junk folder

**"Link expired" errors?**
1. Set OTP Expiry to `86400` in Supabase Dashboard → Auth → Providers → Email
2. Ensure `NEXT_PUBLIC_SITE_URL` matches the Site URL in Supabase Dashboard
3. Ensure redirect URLs are listed in Supabase Dashboard → Auth → URL Configuration

**Rate limit errors on signup/reset?**
- Brevo free tier: 300 emails/day
- Check Brevo dashboard for quota usage
- The app surfaces Supabase rate-limit errors to the user

**Welcome email not sending?**
- Check `BREVO_API_KEY` is set in Vercel environment variables
- Check Vercel function logs for `[Email] Brevo API error` messages
- Welcome emails are non-critical — auth flow continues even if they fail
