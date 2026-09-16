'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { provisionSignupAction } from './actions';

/**
 * Handles Supabase auth redirects that use the implicit flow (hash fragments).
 * Server-side Route Handlers cannot read URL hash fragments, so any emailRedirectTo
 * that Supabase resolves with tokens in the hash must point here instead.
 *
 * Handles: type=signup, type=recovery, type=invite
 */
export default function AuthConfirmPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Verifying…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleHashTokens() {
      const hash = window.location.hash.substring(1);
      if (!hash) {
        router.replace('/login?error=auth_callback_failed');
        return;
      }

      const params      = new URLSearchParams(hash);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token') ?? '';
      const type        = params.get('type');

      if (!accessToken) {
        router.replace('/login?error=auth_callback_failed');
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Establish session from hash tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token:  accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError('Authentication failed or link expired. Please try again.');
        return;
      }

      // Clear tokens from the URL bar without a page reload
      window.history.replaceState(null, '', window.location.pathname);

      if (type === 'signup') {
        setMessage('Setting up your workspace…');
        const result = await provisionSignupAction();
        if (result.error) {
          setError(result.error);
          return;
        }
        router.replace(result.redirectTo);
      } else if (type === 'recovery') {
        router.replace('/auth/reset-password');
      } else if (type === 'invite') {
        // Invited users must set their own password first
        router.replace('/auth/reset-password');
      } else {
        // Non-signup, non-recovery flow — redirect to dashboard (middleware will handle slug redirect)
        router.replace('/dashboard');
      }
    }

    handleHashTokens();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
        <div className="w-full max-w-[400px]">

          <div className="flex items-center justify-center gap-2.5 mb-8">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-md
              bg-[var(--tint-accent)] border border-[var(--accent-border)]">
              <Sparkles size={16} className="text-[var(--accent)]" />
            </div>
            <span className="text-[18px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
              Nexus App
            </span>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-default)]
            rounded-lg p-8 shadow-[var(--shadow-lg)] text-center">
            <div className="rounded-md px-3 py-2.5 text-[13px] text-[var(--priority-urgent)]
              bg-[var(--tint-red)] border border-[var(--tint-red-border)] mb-5">
              {error}
            </div>
            <Link href="/login"
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--accent)]
                hover:text-[var(--accent-hover)] transition-colors duration-150">
              <ArrowLeft size={14} />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md
          bg-[var(--tint-accent)] border border-[var(--accent-border)]">
          <Sparkles size={18} className="text-[var(--accent)]" />
        </div>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-border)] border-t-[#5e6ad2]" />
        <p className="text-[13px] text-[var(--text-subtle)]">{message}</p>
      </div>
    </div>
  );
}
