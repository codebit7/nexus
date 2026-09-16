'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  User, 
  Lock, 
  Camera, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  AlertTriangle, 
  X,
  Shield,
  Mail,
  Building2,
  Key,
  Save,
  Settings as SettingsIcon
} from 'lucide-react';
import { updateProfileAction, updatePasswordAction, deleteWorkspaceAction, type SettingsState, type DeleteWorkspaceState } from './actions';

interface SettingsClientProps {
  initialName:      string;
  initialAvatarUrl: string;
  userRole:         string;
  email:            string;
  isOwner:          boolean;
  orgName:          string;
  isAdmin:          boolean;
}

function StatusBanner({ state, type = 'profile' }: { state: SettingsState; type?: 'profile' | 'password' }) {
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

const inputClass = 'w-full px-3 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-[13px] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-border)] focus:ring-1 focus:ring-[var(--accent-ring)] transition-colors duration-150';

const labelClass = "block text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5";

export default function SettingsClient({ initialName, initialAvatarUrl, userRole, email, isOwner, orgName, isAdmin }: SettingsClientProps) {
  const [name, setName]           = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const roleLabel = isOwner ? 'Owner (Admin)' : userRole === 'admin' ? 'Admin' : 'Member';
  const [profileState, setProfileState]   = useState<SettingsState>({ error: null, success: null });
  const [profileLoading, setProfileLoading] = useState(false);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [passwordState, setPasswordState]   = useState<SettingsState>({ error: null, success: null });
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleteState, setDeleteState] = useState<DeleteWorkspaceState>({ error: null, success: null });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showDeleteModal]);

  async function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileState({ error: null, success: null });
    const fd = new FormData(e.currentTarget);
    const result = await updateProfileAction({ error: null, success: null }, fd);
    setProfileState(result);
    setProfileLoading(false);
  }

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordState({ error: null, success: null });
    const fd = new FormData(e.currentTarget);
    const result = await updatePasswordAction({ error: null, success: null }, fd);
    setPasswordState(result);
    setPasswordLoading(false);
    if (!result.error) { setPassword(''); setConfirm(''); }
  }

  function openDeleteModal() {
    setDeleteConfirmName('');
    setDeleteState({ error: null, success: null });
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    if (deleteLoading) return;
    setShowDeleteModal(false);
    setDeleteConfirmName('');
    setDeleteState({ error: null, success: null });
  }

  async function handleDeleteWorkspace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDeleteLoading(true);
    setDeleteState({ error: null, success: null });
    const fd = new FormData(e.currentTarget);
    const result = await deleteWorkspaceAction({ error: null, success: null }, fd);
    setDeleteState(result);
    setDeleteLoading(false);
    if (!result.error) {
      window.location.href = '/login';
    }
  }

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Password strength calculation
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
                  <p className="text-[11px] text-[var(--text-faint)]">Your personal information and avatar</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="px-6 py-5 space-y-5">
                {/* Avatar */}
                <div className="flex items-start gap-5">
                  <div className="relative group/avatar shrink-0">
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={name}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full object-cover border-2 border-[var(--accent-border)]"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--tint-accent)] border-2 border-[var(--accent-border)]">
                        <span className="text-lg font-medium text-[var(--accent)]">{initials || '?'}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  </div>

                  <div className="flex-1">
                    <label htmlFor="avatar_url" className={labelClass}>
                      Avatar URL
                    </label>
                    <div className="relative">
                      <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-faint)]" />
                      <input
                        id="avatar_url"
                        name="avatar_url"
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/avatar.png"
                        className={`${inputClass} pl-9`}
                      />
                    </div>
                  </div>
                </div>

                {/* Name */}
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

                {/* Role */}
                <div>
                  <label className={labelClass}>
                    Role
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--hover-subtle)] border border-[var(--border-subtle)]">
                    <Shield size={14} className="text-[var(--accent)]" />
                    <span className="text-[13px] text-[var(--text-primary)]">{roleLabel}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-faint)] mt-1.5">
                    {isOwner ? 'You are the workspace owner.' : 'Role can only be changed by the workspace owner.'}
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className={labelClass}>
                    Email
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--hover-subtle)] border border-[var(--border-subtle)]">
                    <Mail size={14} className="text-[var(--text-faint)]" />
                    <span className="text-[13px] text-[var(--text-primary)]">{email}</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-faint)] mt-1.5">Email cannot be changed here.</p>
                </div>

                <StatusBanner state={profileState} type="profile" />

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium
                      bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white
                      active:scale-[0.98] transition-[color,background-color,border-color,transform] duration-150
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
                  <p className="text-[11px] text-[var(--text-faint)]">Update your password</p>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="px-6 py-5 space-y-5">
                <div>
                  <label htmlFor="password" className={labelClass}>
                    New Password <span className="text-[var(--priority-urgent)]">*</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-faint)]" />
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm" className={labelClass}>
                    Confirm Password <span className="text-[var(--priority-urgent)]">*</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-faint)]" />
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

                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className="h-1 flex-1 rounded-full transition-[width] duration-150"
                          style={{
                            background: strength.score >= level 
                              ? strength.color 
                              : 'rgba(255,255,255,0.06)'
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

                <StatusBanner state={passwordState} type="password" />

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={passwordLoading || !password || password !== confirm}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium
                      bg-[var(--priority-urgent)] hover:bg-[var(--priority-urgent)]/90 text-white
                      active:scale-[0.98] transition-[color,background-color,border-color,transform] duration-150
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

          {/* Danger Zone - Workspace Owner Only */}
          {isOwner && (
            <div className="mt-6 rounded-xl border border-[var(--tint-red-border)] bg-[var(--bg-sidebar)] overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--tint-red-border)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tint-red)]">
                  <AlertTriangle className="h-4 w-4 text-[var(--priority-urgent)]" />
                </div>
                <div>
                  <h3 className="text-[13px] font-medium text-[var(--priority-urgent)]">Danger Zone</h3>
                  <p className="text-[11px] text-[var(--text-faint)]">Irreversible actions for your workspace</p>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="flex items-center justify-between gap-6">
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-[var(--text-primary)]">Delete Workspace</p>
                    <p className="text-[12px] text-[var(--text-faint)] mt-1">
                      Permanently delete <span className="font-medium text-[var(--text-muted)]">{orgName}</span> and all its data.
                      This action cannot be undone.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={openDeleteModal}
                    className="shrink-0 flex items-center gap-2 px-4 py-1.5 rounded-lg text-[13px] font-medium
                      bg-[var(--tint-red)] hover:bg-[var(--tint-red)]
                      text-[var(--priority-urgent)] border border-[var(--tint-red-border)]
                      transition-colors duration-150"
                  >
                    <Trash2 size={14} />
                    Delete Workspace
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Delete Workspace Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={closeDeleteModal}
          />
          
          <div className="relative w-full max-w-md bg-[var(--bg-sidebar)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-modal)] animate-in zoom-in-95 fade-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--tint-red)]">
                  <AlertTriangle className="h-4 w-4 text-[var(--priority-urgent)]" />
                </div>
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">Delete Workspace</h2>
              </div>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteLoading}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--text-faint)] 
                  hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)] transition-colors duration-150
                  disabled:opacity-40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDeleteWorkspace} className="px-6 py-5 space-y-5">
              {/* Warning Box */}
              <div className="rounded-lg bg-[var(--tint-red)] border border-[var(--tint-red-border)] p-4">
                <p className="text-[12px] font-medium text-[var(--priority-urgent)] mb-2">This will permanently delete:</p>
                <ul className="space-y-1.5">
                  {[
                    'All projects, tasks, comments, and files',
                    'All clients and invoices',
                    'All team members and their accounts',
                    'Your account — you can re-signup with the same email'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-[var(--priority-urgent)]/80">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-[var(--priority-urgent)]/60 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Confirmation Input */}
              <div className="space-y-1.5">
                <label htmlFor="confirm_name" className="text-[12px] text-[var(--text-muted)]">
                  Type <span className="font-medium text-[var(--text-primary)]">{orgName}</span> to confirm
                </label>
                <input
                  id="confirm_name"
                  name="confirm_name"
                  type="text"
                  required
                  autoComplete="off"
                  autoFocus
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={orgName}
                  className={inputClass}
                />
              </div>

              {deleteState.error && (
                <div className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-[12px] font-medium
                  bg-[var(--tint-red)] border border-[var(--tint-red-border)] text-[var(--priority-urgent)]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {deleteState.error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleteLoading}
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-[var(--text-muted)]
                    hover:bg-[var(--hover-default)] hover:text-[var(--text-primary)] transition-colors duration-150
                    disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || deleteConfirmName !== orgName}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium
                    bg-[var(--priority-urgent)] hover:bg-[var(--priority-urgent)]/90 text-white
                    active:scale-[0.98] transition-[color,background-color,border-color,transform] duration-150
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <Trash2 size={14} />
                  Delete Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}