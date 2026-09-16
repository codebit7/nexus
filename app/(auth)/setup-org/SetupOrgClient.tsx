'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { setupOrgAction, type SetupOrgState } from './actions';
import { useState } from 'react';
import { Sparkles, ArrowRight, Building2, Globe } from 'lucide-react';

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
          Creating workspace...
        </>
      ) : (
        <>
          Create workspace
          <ArrowRight size={14} />
        </>
      )}
    </button>
  );
}

function generateSlug(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const initialState: SetupOrgState = { error: null, fieldErrors: {} };

const INPUT_CLASS = `
  w-full pl-9 pr-3 py-2 rounded-md
  bg-[var(--bg-input)] border border-[var(--border-default)]
  text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-fainter)]
  focus:outline-none focus:border-[var(--border-hover)]
  focus:ring-1 focus:ring-[var(--accent-ring)]
  transition-colors duration-150
`;

const LABEL_CLASS = "block text-[11px] font-medium text-[var(--text-subtle)] uppercase tracking-[0.06em] mb-1.5";

export default function SetupOrgClient() {
  const [state, action] = useFormState<SetupOrgState, FormData>(setupOrgAction, initialState);
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
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
          rounded-lg p-8 shadow-[var(--shadow-lg)]">

          <h1 className="text-[18px] font-medium text-[var(--text-primary)] tracking-[-0.02em] mb-1">
            Set up your workspace
          </h1>
          <p className="text-[13px] text-[var(--text-subtle)] mb-6">
            You need a workspace to continue.
          </p>

          {state.error && (
            <div className="mb-5 rounded-md px-3 py-2.5 text-[13px] text-[var(--priority-urgent)]
              bg-[var(--tint-red)] border border-[var(--tint-red-border)]">
              {state.error}
            </div>
          )}

          <form action={action} className="space-y-4">
            <div>
              <label className={LABEL_CLASS}>Company Name</label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                <input
                  name="companyName" type="text" required
                  placeholder="Acme Ltd"
                  onChange={e => { if (!slugManuallyEdited) setSlug(generateSlug(e.target.value)); }}
                  className={INPUT_CLASS}
                />
              </div>
              {state.fieldErrors?.companyName && (
                <p className="mt-1.5 text-[11px] text-[var(--priority-urgent)]">{state.fieldErrors.companyName}</p>
              )}
            </div>

            <div>
              <label className={LABEL_CLASS}>Workspace URL</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] pointer-events-none" />
                <input
                  name="slug" type="text" required
                  placeholder="acme-ltd"
                  value={slug}
                  onChange={e => { setSlugManuallyEdited(true); setSlug(e.target.value); }}
                  className={INPUT_CLASS}
                />
              </div>
              {slug && !state.fieldErrors?.slug && (
                <p className="mt-1.5 text-[11px] text-[var(--text-faint)]">
                  app.nexus.com/<span className="text-[var(--accent)] font-mono">{slug}</span>
                </p>
              )}
              {state.fieldErrors?.slug && (
                <p className="mt-1.5 text-[11px] text-[var(--priority-urgent)]">{state.fieldErrors.slug}</p>
              )}
            </div>

            <SubmitButton />
          </form>
        </div>

        <p className="text-center mt-6 text-[11px] text-[var(--text-fainter)]">
          Secure workspace setup with end-to-end encryption
        </p>
      </div>
    </div>
  );
}
