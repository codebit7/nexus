'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signInAction, type LoginState } from './actions';
import { Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="mt-2 w-full inline-flex items-center justify-center gap-2
        rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.99]
        px-4 py-2.5 text-[13px] font-medium text-white
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[var(--accent-ring)]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent)]"
    >
      {pending ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Signing in...
        </>
      ) : (
        <>
          Sign in
          <ArrowRight size={14} />
        </>
      )}
    </button>
  );
}

const initialState: LoginState = { error: null };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--bg-page)]" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [state, action] = useFormState<LoginState, FormData>(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();
  const verifyEmail = searchParams.get('verify') === 'email';
  const errorParam = searchParams.get('error');
  const [hashOtpExpired, setHashOtpExpired] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error_code=otp_expired') || (hash.includes('error=access_denied') && hash.includes('expired'))) {
      setHashOtpExpired(true);
      return;
    }
    if (hash.includes('access_token=') && (hash.includes('type=signup') || hash.includes('type=recovery') || hash.includes('type=invite'))) {
      window.location.replace('/auth/confirm' + window.location.hash);
    }
  }, []);

  const isLinkExpired = errorParam === 'link_expired' || hashOtpExpired;
  const authError = errorParam === 'auth_callback_failed' && !isLinkExpired;

  return (
    <div className="relative min-h-screen bg-[var(--bg-page)] flex items-center justify-center px-4 py-10 overflow-hidden">

      <Link href="/"
        className="group absolute top-3 left-3 sm:top-6 sm:left-6 z-10
          inline-flex items-center gap-1.5 rounded-md
          px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-muted)]
          hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]
          transition-colors duration-150">
        <ArrowLeft size={13} className="transition-transform duration-150 group-hover:-translate-x-0.5" />
        Back
      </Link>

      <div className="absolute top-3 right-3 sm:top-6 sm:right-6 z-10">
        <ThemeToggle />
      </div>

      {/* Faint dot pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(var(--dot-color) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative w-full max-w-[420px]">

        {/* Logo + wordmark */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-md
            bg-[var(--tint-accent)] border border-[var(--accent-border)]">
            <Sparkles size={17} className="text-[var(--accent)]" />
          </div>
          <span className="text-[17px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">Nexus App</span>
        </div>

        {/* Card */}
        <div className="bg-[var(--bg-sidebar)] border border-[var(--border-default)]
          rounded-xl p-6 sm:p-8 shadow-[var(--shadow-lg)]">

          <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">
            Sign in to continue to your workspace
          </p>

          {/* Banners */}
          <div className="mt-6 space-y-2.5">
            {verifyEmail && (
              <div className="rounded-md px-3 py-2.5 text-[13px] text-[var(--status-done)]
                bg-[var(--tint-green)] border border-[var(--tint-green-border)]
                flex items-start gap-2">
                <Mail size={14} className="mt-0.5 flex-shrink-0" />
                <span>Account created. Check your email to verify, then sign in.</span>
              </div>
            )}
            {authError && (
              <div className="rounded-md px-3 py-2.5 text-[13px] text-[var(--priority-urgent)]
                bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
                Email verification failed. Please try again.
              </div>
            )}
            {isLinkExpired && (
              <div className="rounded-md px-3 py-2.5 text-[13px] text-[var(--priority-urgent)]
                bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
                Your password reset link has expired.{' '}
                <Link href="/forgot-password" className="underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors duration-150">
                  Request a new one
                </Link>.
              </div>
            )}
            {state?.error && (
              <div className="rounded-md px-3 py-2.5 text-[13px] text-[var(--priority-urgent)]
                bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
                {state.error}
              </div>
            )}
          </div>

          <form action={action} className="mt-6 space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-[var(--text-subtle)]
                uppercase tracking-[0.06em] mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="alex@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-md
                    bg-[var(--bg-card)] border border-[var(--border-default)]
                    text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-fainter)]
                    focus:outline-none focus:border-[var(--border-hover)]
                    focus:ring-1 focus:ring-[var(--accent-ring)]
                    transition-colors duration-150"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-medium text-[var(--text-subtle)]
                  uppercase tracking-[0.06em]">
                  Password
                </label>
                <Link href="/forgot-password"
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-md
                    bg-[var(--bg-card)] border border-[var(--border-default)]
                    text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-fainter)]
                    focus:outline-none focus:border-[var(--border-hover)]
                    focus:ring-1 focus:ring-[var(--accent-ring)]
                    transition-colors duration-150"
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

            <SubmitButton disabled={!email.trim() || !password} />
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-[var(--text-subtle)]">
          Don&apos;t have an account?{' '}
          <Link href="/signup"
            className="group inline-flex items-center gap-1 font-medium text-[var(--accent)]
              hover:text-[var(--accent-hover)] transition-colors duration-150">
            Create workspace
            <ArrowRight size={12} className="transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </p>

        <p className="mt-4 text-center text-[11px] text-[var(--text-fainter)]">
          By signing in you agree to our Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
