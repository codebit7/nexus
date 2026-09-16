'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { forgotPasswordAction, type ForgotPasswordState } from './actions';
import { Mail, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full inline-flex items-center justify-center gap-2
        rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.99]
        px-4 py-2 text-[13px] font-medium text-white
        transition-colors duration-150
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[var(--accent-ring)]
        disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Sending...
        </>
      ) : (
        <>
          Send reset link
          <ArrowRight size={14} />
        </>
      )}
    </button>
  );
}

const INITIAL: ForgotPasswordState = { error: null, success: false };

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(forgotPasswordAction, INITIAL);

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

          {state.success ? (
            <div className="text-center">
              <div className="mx-auto mb-5 inline-flex h-12 w-12 items-center justify-center rounded-md
                bg-[var(--tint-green)] border border-[var(--tint-green-border)]">
                <Mail size={20} className="text-[var(--status-done)]" />
              </div>
              <h1 className="text-[18px] font-medium text-[var(--text-primary)] tracking-[-0.02em] mb-2">
                Check your email
              </h1>
              <p className="text-[13px] text-[var(--text-subtle)] mb-6 leading-relaxed">
                We sent a password reset link to your email. Click the link to set a new password.
              </p>
              <Link href="/login"
                className="inline-flex w-full items-center justify-center gap-2
                  rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.99]
                  px-4 py-2 text-[13px] font-medium text-white
                  transition-colors duration-150">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-[18px] font-medium text-[var(--text-primary)] tracking-[-0.02em] mb-1">
                Reset password
              </h1>
              <p className="text-[13px] text-[var(--text-subtle)] mb-6">
                Enter your email and we&apos;ll send you a reset link
              </p>

              {state.error && (
                <div className="mb-5 rounded-md px-3 py-2.5 text-[13px] text-[var(--priority-urgent)]
                  bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
                  {state.error}
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--text-subtle)]
                    uppercase tracking-[0.06em] mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                    <input
                      name="email" type="email" required autoComplete="email"
                      placeholder="alex@acme.com"
                      className="w-full pl-9 pr-3 py-2 rounded-md
                        bg-[var(--bg-input)] border border-[var(--border-default)]
                        text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-fainter)]
                        focus:outline-none focus:border-[var(--border-hover)]
                        focus:ring-1 focus:ring-[var(--accent-ring)]
                        transition-colors duration-150"
                    />
                  </div>
                </div>
                <SubmitButton />
              </form>

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
            </>
          )}
        </div>

        <p className="text-center mt-6 text-[11px] text-[var(--text-fainter)]">
          Secure login with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
