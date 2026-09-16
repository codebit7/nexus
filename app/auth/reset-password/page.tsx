'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Eye, EyeOff, Lock, Sparkles, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

const INPUT_CLASS = `
  w-full pl-9 pr-10 py-2 rounded-md
  bg-[var(--bg-input)] border border-[var(--border-default)]
  text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-fainter)]
  focus:outline-none focus:border-[var(--border-hover)]
  focus:ring-1 focus:ring-[var(--accent-ring)]
  transition-colors duration-150
`;

const LABEL_CLASS = "block text-[11px] font-medium text-[var(--text-subtle)] uppercase tracking-[0.06em] mb-1.5";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    async function verifySession() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const hash = window.location.hash.slice(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && type === 'recovery') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? '',
          });
          if (sessionError) {
            router.replace('/login?error=session_expired');
            return;
          }
          window.history.replaceState(null, '', window.location.pathname);
          setChecking(false);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login?error=session_expired');
        return;
      }
      setChecking(false);
    }
    verifySession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push('/dashboard'), 2000);
  }

  if (checking) {
    return (
      <div className="relative min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
        <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-10">
          <ThemeToggle />
        </div>
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent-border)] border-t-[var(--accent)]" />
          <p className="text-[13px] text-[var(--text-subtle)]">Verifying your session...</p>
        </div>
      </div>
    );
  }

  const strength =
    password.length === 0 ? null :
    password.length < 6  ? { label: 'Too short', color: '#e5484d', bars: 1 } :
    password.length < 8  ? { label: 'Weak',      color: '#e5484d', bars: 2 } :
    password.length < 12 ? { label: 'Good',      color: '#e79d13', bars: 3 } :
                            { label: 'Strong',    color: '#26c97f', bars: 4 };

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-10">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[400px]">

        {/* Logo + wordmark in a single row */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="inline-flex h-8 w-8 items-center justify-center rounded-md
            bg-[var(--tint-accent)] border border-[var(--accent-border)]">
            <Sparkles size={16} className="text-[var(--accent)]" />
          </div>
          <span className="text-[18px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
            Nexus App
          </span>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)]
          rounded-lg p-6 sm:p-8 shadow-[var(--shadow-lg)]">

          <h1 className="text-[18px] font-medium text-[var(--text-primary)] tracking-[-0.02em] mb-1">
            {success ? 'Password updated' : 'Set new password'}
          </h1>
          <p className="text-[13px] text-[var(--text-subtle)] mb-6">
            {success ? 'Redirecting you to the dashboard…' : 'Choose a strong password for your account'}
          </p>

          {success && (
            <div className="rounded-md px-3 py-2.5 text-[13px] text-[var(--status-done)]
              bg-[var(--tint-green)] border border-[var(--tint-green-border)]
              flex items-start gap-2">
              <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
              Your password has been updated successfully.
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-md px-3 py-2.5 text-[13px] text-[var(--priority-urgent)]
              bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
              {error}
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={LABEL_CLASS}>New Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]
                      hover:text-[var(--text-primary)] transition-colors duration-150"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS}>Confirm Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat new password"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {strength && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="h-1 w-8 rounded-full transition-colors duration-150"
                        style={{
                          background: level <= strength.bars ? strength.color : 'rgba(255,255,255,0.08)',
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-[var(--text-subtle)]">{strength.label}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full inline-flex items-center justify-center gap-2
                  rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.99]
                  px-4 py-2 text-[13px] font-medium text-white
                  transition-colors duration-150
                  focus-visible:outline-none focus-visible:ring-2
                  focus-visible:ring-[var(--accent-ring)]
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    Update Password
                  </>
                )}
              </button>
            </form>
          )}

          {!success && (
            <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center">
              <span className="text-[12px] text-[var(--text-subtle)]">
                Remember your password?{' '}
                <Link href="/login"
                  className="group inline-flex items-center gap-1 text-[var(--accent)] hover:text-[var(--accent-hover)]
                    transition-colors duration-150 font-medium">
                  Sign in
                  <ArrowRight size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" />
                </Link>
              </span>
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-[11px] text-[var(--text-fainter)]">
          Secure login with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
