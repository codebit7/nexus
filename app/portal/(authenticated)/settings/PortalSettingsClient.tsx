'use client';

import { useState } from 'react';
import {
  User,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Key,
  Save,
  Settings as SettingsIcon,
  Mail,
} from 'lucide-react';
import {
  updateClientProfileAction,
  updateClientPasswordAction,
  type SettingsState,
} from './actions';

interface PortalSettingsClientProps {
  initialName: string;
  email: string;
  csrfToken: string;
}

function StatusBanner({ state }: { state: SettingsState }) {
  if (!state.error && !state.success) return null;

  const isSuccess = !!state.success;
  const colors = isSuccess
    ? { bg: 'rgba(38,201,127,0.12)', border: 'rgba(38,201,127,0.2)', text: '#26c97f', icon: CheckCircle }
    : { bg: 'rgba(229,72,77,0.12)', border: 'rgba(229,72,77,0.2)', text: '#e5484d', icon: AlertCircle };

  return (
    <div
      className="flex items-center gap-2.5 rounded-lg px-4 py-3 text-[13px] font-medium"
      style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}
    >
      <colors.icon className="h-4 w-4 shrink-0" />
      {state.success ?? state.error}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-border)] focus:ring-1 focus:ring-[var(--accent-ring)] transition-colors duration-150';

const labelClass =
  'block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5';

export default function PortalSettingsClient({
  initialName,
  email,
  csrfToken,
}: PortalSettingsClientProps) {
  const [name, setName] = useState(initialName);
  const [profileState, setProfileState] = useState<SettingsState>({ error: null, success: null });
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passwordState, setPasswordState] = useState<SettingsState>({ error: null, success: null });
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileState({ error: null, success: null });
    const fd = new FormData(e.currentTarget);
    const result = await updateClientProfileAction({ error: null, success: null }, fd);
    setProfileState(result);
    setProfileLoading(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordState({ error: null, success: null });
    const fd = new FormData(e.currentTarget);
    const result = await updateClientPasswordAction({ error: null, success: null }, fd);
    setPasswordState(result);
    setPasswordLoading(false);
    if (!result.error) {
      setCurrentPassword('');
      setPassword('');
      setConfirm('');
    }
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Password strength
  const getPasswordStrength = () => {
    if (password.length === 0) return { score: 0, label: '', color: '' };
    if (password.length < 8) return { score: 1, label: 'Too short', color: '#e5484d' };
    if (password.length < 12) return { score: 2, label: 'Good', color: '#e79d13' };
    return { score: 3, label: 'Strong', color: '#26c97f' };
  };

  const strength = getPasswordStrength();

  return (
    <div className="flex flex-col h-full bg-[var(--bg-page)]">

      {/* Header toolbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-[60px] border-b border-[var(--border-subtle)] shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <SettingsIcon size={16} className="text-[var(--text-faint)]" />
          <h1 className="text-[15px] font-medium text-[var(--text-primary)]">Settings</h1>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 sm:p-6">

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Profile Section */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-subtle)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tint-accent)]">
                  <User className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div>
                  <h3 className="text-[13px] font-medium text-[var(--text-primary)]">Profile</h3>
                  <p className="text-[11px] text-[var(--text-faint)]">Your display name</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="px-6 py-5 space-y-5">
                <input type="hidden" name="csrf_token" value={csrfToken} />

                {/* Avatar preview */}
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--tint-accent)] border-2 border-[var(--accent-border)]">
                    <span className="text-base font-medium text-[var(--accent)]">
                      {initials || '?'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">
                      {name || 'Your Name'}
                    </p>
                    <p className="text-[12px] text-[var(--text-faint)]">{email}</p>
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className={labelClass}>
                    Display Name <span className="text-[var(--priority-urgent)]">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--hover-subtle)] border border-[var(--border-subtle)]">
                    <Mail size={14} className="text-[var(--text-faint)]" />
                    <span className="text-[13px] text-[var(--text-primary)]">{email}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-faint)] mt-1.5">
                    Contact your account manager to change your email.
                  </p>
                </div>

                <StatusBanner state={profileState} />

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium
                      bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
                      active:scale-[0.98] transition-colors duration-150
                      disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {profileLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <Save size={14} />
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Security Section */}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-sidebar)] overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-subtle)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tint-red)]">
                  <Lock className="h-4 w-4 text-[var(--priority-urgent)]" />
                </div>
                <div>
                  <h3 className="text-[13px] font-medium text-[var(--text-primary)]">Security</h3>
                  <p className="text-[11px] text-[var(--text-faint)]">Change your portal password</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-5">
                <input type="hidden" name="csrf_token" value={csrfToken} />

                <div>
                  <label htmlFor="current_password" className={labelClass}>
                    Current Password <span className="text-[var(--priority-urgent)]">*</span>
                  </label>
                  <div className="relative">
                    <Key className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-faint)]" />
                    <input
                      id="current_password"
                      name="current_password"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Your current password"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className={labelClass}>
                    New Password <span className="text-[var(--priority-urgent)]">*</span>
                  </label>
                  <div className="relative">
                    <Key className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-faint)]" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                {/* Password strength */}
                {password.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className="h-1 flex-1 rounded-full transition-colors duration-150"
                          style={{
                            background:
                              strength.score >= level ? strength.color : 'rgba(255,255,255,0.06)',
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--text-faint)]">Password strength:</span>
                      <span style={{ color: strength.color }} className="font-medium">
                        {strength.label}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="confirm" className={labelClass}>
                    Confirm Password <span className="text-[var(--priority-urgent)]">*</span>
                  </label>
                  <div className="relative">
                    <Key className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-faint)]" />
                    <input
                      id="confirm"
                      name="confirm"
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat new password"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                <StatusBanner state={passwordState} />

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={passwordLoading || !password || password !== confirm}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium
                      bg-[var(--priority-urgent)] hover:bg-[var(--priority-urgent)]/90 text-white
                      active:scale-[0.98] transition-colors duration-150
                      disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {passwordLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <Key size={14} />
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
