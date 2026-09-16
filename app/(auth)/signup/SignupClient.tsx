'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { signupAction, type SignupState } from './actions';
import { Eye, EyeOff, Sparkles, ArrowRight, ArrowLeft, Check, Globe, User, Mail, Lock, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

function SubmitButton({ label, pendingLabel, disabled }: { label: string; pendingLabel: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="w-full inline-flex items-center justify-center gap-2
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
          {pendingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight size={14} />
        </>
      )}
    </button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-[11px] text-[var(--priority-urgent)]">{message}</p>;
}

function generateSlug(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const initialState: SignupState = { error: null, fieldErrors: {} };

const INPUT_CLASS = `w-full pl-9 pr-3 py-2.5 rounded-md
  bg-[var(--bg-card)] border border-[var(--border-default)]
  text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-fainter)]
  focus:outline-none focus:border-[var(--border-hover)]
  focus:ring-1 focus:ring-[var(--accent-ring)]
  transition-colors duration-150`;

const LABEL_CLASS = "block text-[11px] font-medium text-[var(--text-subtle)] uppercase tracking-[0.06em] mb-1.5";

function StepIndicator({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8">
      {[1, 2].map((n, idx) => {
        const isActive = n === current;
        const isComplete = n < current;
        return (
          <div key={n} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors duration-150',
                  isActive && 'bg-[var(--accent)] text-white',
                  isComplete && 'bg-[var(--tint-accent-strong)] text-[var(--accent)] border border-[var(--accent-border)]',
                  !isActive && !isComplete && 'bg-[var(--bg-card)] text-[var(--text-faint)] border border-[var(--border-default)]',
                ].filter(Boolean).join(' ')}
              >
                {isComplete ? <Check size={11} strokeWidth={3} /> : n}
              </span>
              <span
                className={[
                  'text-[12px] font-medium transition-colors duration-150',
                  isActive || isComplete ? 'text-[var(--text-primary)]' : 'text-[var(--text-faint)]',
                ].join(' ')}
              >
                {n === 1 ? 'Account' : 'Workspace'}
              </span>
            </div>
            {idx === 0 && (
              <span
                className={[
                  'h-px w-5 sm:w-8 transition-colors duration-150',
                  current > 1 ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SignupClient() {
  const [state, action] = useFormState<SignupState, FormData>(signupAction, initialState);
  const [step, setStep] = useState<1 | 2 | 'success'>(1);

  // Step 1 — Account fields (held in state so they survive Back from step 2)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  // Step 2 — Workspace fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);

  useEffect(() => {
    if (state.success && state.email) setStep('success');
  }, [state.success, state.email]);

  // If the server returned errors on account fields, bounce back to step 1
  useEffect(() => {
    if (state.fieldErrors && (state.fieldErrors.email || state.fieldErrors.password || state.fieldErrors.confirmPassword)) {
      setStep(1);
    }
  }, [state.fieldErrors]);

  function handleCompanyNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCompanyName(e.target.value);
    if (!slugManuallyEdited) setSlug(generateSlug(e.target.value));
  }

  function handleStep1Continue(e: React.FormEvent) {
    e.preventDefault();
    setStep1Error(null);

    if (!email.trim()) return setStep1Error('Please enter your email.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setStep1Error('Please enter a valid email.');
    if (password.length < 8) return setStep1Error('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setStep1Error('Passwords do not match.');

    setStep(2);
  }

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

      <div className="relative w-full max-w-[440px]">

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

          {step !== 'success' && <StepIndicator current={step} />}

          {/* STEP 1 — Account */}
          {step === 1 && (
            <>
              <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                Create your account
              </h1>
              <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">
                Start with your email and a secure password
              </p>

              {(step1Error || state.error) && (
                <div className="mt-5 rounded-md px-3 py-2.5 text-[13px] text-[var(--priority-urgent)]
                  bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
                  {step1Error ?? state.error}
                </div>
              )}

              <form onSubmit={handleStep1Continue} className="mt-6 space-y-4">
                <div>
                  <label className={LABEL_CLASS}>Work email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="alex@acme.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <FieldError message={state.fieldErrors?.email} />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${INPUT_CLASS} pr-10`}
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
                  <FieldError message={state.fieldErrors?.password} />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Confirm password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`${INPUT_CLASS} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]
                        hover:text-[var(--text-primary)] transition-colors duration-150"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <FieldError message={state.fieldErrors?.confirmPassword} />
                </div>

                <button
                  type="submit"
                  disabled={!email.trim() || !password || !confirmPassword}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2
                    rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.99]
                    px-4 py-2.5 text-[13px] font-medium text-white
                    transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-[var(--accent-ring)]
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--accent)]"
                >
                  Continue
                  <ArrowRight size={14} />
                </button>
              </form>
            </>
          )}

          {/* STEP 2 — Workspace */}
          {step === 2 && (
            <>
              <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-[-0.02em]">
                Set up your workspace
              </h1>
              <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">
                Tell us about your team and company
              </p>

              {state.error && (
                <div className="mt-5 rounded-md px-3 py-2.5 text-[13px] text-[var(--priority-urgent)]
                  bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
                  {state.error}
                </div>
              )}

              <form action={action} className="mt-6 space-y-4">
                {/* Carry step 1 fields */}
                <input type="hidden" name="email" value={email} />
                <input type="hidden" name="password" value={password} />
                <input type="hidden" name="confirmPassword" value={confirmPassword} />

                <div>
                  <label className={LABEL_CLASS}>Full name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                    <input
                      name="fullName"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Alex Johnson"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <FieldError message={state.fieldErrors?.fullName} />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Company name</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                    <input
                      name="companyName"
                      type="text"
                      required
                      autoComplete="organization"
                      placeholder="Acme Ltd"
                      value={companyName}
                      onChange={handleCompanyNameChange}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <FieldError message={state.fieldErrors?.companyName} />
                </div>

                <div>
                  <label className={LABEL_CLASS}>Workspace URL</label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                    <input
                      name="slug"
                      type="text"
                      required
                      placeholder="acme-ltd"
                      value={slug}
                      onChange={(e) => { setSlugManuallyEdited(true); setSlug(e.target.value); }}
                      className={INPUT_CLASS}
                    />
                  </div>
                  {slug && !state.fieldErrors?.slug && (
                    <p className="mt-1.5 text-[11px] text-[var(--text-faint)]">
                      app.nexus.com/<span className="text-[var(--accent)] font-mono">{slug}</span>
                    </p>
                  )}
                  <FieldError message={state.fieldErrors?.slug} />
                </div>

                <div className="pt-1">
                  <input type="hidden" name="terms" value={termsChecked ? 'on' : ''} />
                  <button
                    type="button"
                    onClick={() => setTermsChecked(v => !v)}
                    className="flex items-start gap-2.5 w-full text-left group"
                  >
                    <span className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded
                      border transition-colors duration-150
                      ${termsChecked
                        ? 'bg-[var(--accent)] border-[var(--accent)]'
                        : 'bg-[var(--bg-card)] border-[var(--border-hover)] group-hover:border-[var(--border-hover)]'}`}>
                      {termsChecked && <Check size={10} strokeWidth={3} className="text-white" />}
                    </span>
                    <span className="text-[12px] text-[var(--text-muted)] leading-relaxed">
                      I agree to the{' '}
                      <span className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150 font-medium">
                        Terms of Service
                      </span>
                      {' '}and{' '}
                      <span className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150 font-medium">
                        Privacy Policy
                      </span>
                    </span>
                  </button>
                  <FieldError message={state.fieldErrors?.terms} />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center justify-center gap-1.5
                      rounded-md px-4 py-2.5 text-[13px] font-medium text-[var(--text-muted)]
                      hover:text-[var(--text-primary)] hover:bg-[var(--hover-default)]
                      border border-[var(--border-default)]
                      transition-colors duration-150"
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                  <div className="flex-1">
                    <SubmitButton
                      label="Create workspace"
                      pendingLabel="Creating workspace..."
                      disabled={!fullName.trim() || !companyName.trim() || !slug.trim() || !termsChecked}
                    />
                  </div>
                </div>
              </form>
            </>
          )}

          {/* STEP 3 — Success */}
          {step === 'success' && (
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-md
                bg-[var(--tint-green)] border border-[var(--tint-green-border)] mb-5">
                <Mail size={20} className="text-[var(--status-done)]" />
              </div>
              <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-[-0.02em] mb-2">
                Check your email
              </h1>
              <p className="text-[13px] text-[var(--text-muted)] leading-[1.6] mb-5">
                We&apos;ve sent a confirmation link to{' '}
                <span className="text-[var(--text-primary)] font-medium">{state.email}</span>.
                Click it to activate your workspace.
              </p>
              <div className="rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 mb-6">
                <p className="text-[12px] text-[var(--text-subtle)] leading-[1.6]">
                  Can&apos;t find it? Check your spam folder. The link expires in 24 hours.
                </p>
              </div>
              <Link href="/login"
                className="inline-flex w-full items-center justify-center gap-2
                  rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] active:scale-[0.99]
                  px-4 py-2.5 text-[13px] font-medium text-white
                  transition-colors duration-150">
                Go to sign in
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>

        {step !== 'success' && (
          <p className="mt-6 text-center text-[13px] text-[var(--text-subtle)]">
            Already have an account?{' '}
            <Link href="/login"
              className="font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]
                transition-colors duration-150">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
