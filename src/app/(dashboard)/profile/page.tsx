'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';

const inputCls = 'h-10 px-3 rounded-lg border border-border bg-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors w-full';
const btnPrimary = 'px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-medium shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

export default function ProfilePage() {
  const { user, updateUsername, updateOwnPassword } = useAuth();

  const [username, setUsername] = useState(user?.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [status, setStatus] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatus({ text, type });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleUsernameSave = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      showStatus('Username cannot be empty', 'error');
      return;
    }

    setIsSavingUsername(true);
    try {
      await updateUsername(trimmed);
      showStatus('Username updated', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update username';
      showStatus(msg, 'error');
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handlePasswordSave = async () => {
    if (newPassword.length < 6) {
      showStatus('Password must be at least 6 characters', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showStatus('Passwords do not match', 'error');
      return;
    }

    setIsSavingPassword(true);
    try {
      await updateOwnPassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showStatus('Password updated', 'success');
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Failed to update password';
      const message = raw.includes('requires-recent-login')
        ? 'For security, please log out and log in again before changing password.'
        : raw;
      showStatus(message, 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text">Profile</h1>
          <p className="text-sm text-text-muted mt-1">Update your username and password.</p>
        </div>

        {status && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium ${status.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {status.text}
          </div>
        )}

        <section className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-text">Username</h2>
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-secondary" htmlFor="username">Username</label>
            <input
              id="username"
              className={inputCls}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
            />
            <p className="text-xs text-text-muted">Role stays Doctor/Reception from your account role. No Dr. prefix is required.</p>
          </div>
          <button onClick={handleUsernameSave} disabled={isSavingUsername} className={btnPrimary}>
            {isSavingUsername ? 'Saving...' : 'Save Username'}
          </button>
        </section>

        <section className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-text">Password</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="new-password">New Password</label>
              <input
                id="new-password"
                type="password"
                className={inputCls}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary" htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                className={inputCls}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <button onClick={handlePasswordSave} disabled={isSavingPassword} className={btnPrimary}>
            {isSavingPassword ? 'Saving...' : 'Change Password'}
          </button>
        </section>
      </div>
    </ProtectedRoute>
  );
}
