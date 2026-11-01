'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import * as fs from '@/lib/firestore';
import type {
  MasterHistory, MasterExamination,
  MasterInvestigation, MasterDiagnosis, MasterManagement, MasterDrug,
  MasterReviewInstruction, ReceptionAccount, DetailItem,
} from '@/lib/types';

type TabKey =
  | 'accounts'
  | 'history' | 'examination' | 'investigation'
  | 'diagnosis' | 'management' | 'drugs'
  | 'frequency' | 'usages' | 'eyeside' | 'review'
  | 'personal-complaints';

interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { key: 'accounts', label: 'Reception Accounts', icon: '👥' },
  { key: 'history', label: 'Symptoms', icon: '📋' },
  { key: 'personal-complaints', label: 'Personal Complaints (P/C)', icon: '🗒️' },
  { key: 'examination', label: 'Examination', icon: '🔬' },
  { key: 'investigation', label: 'Investigation', icon: '🧪' },
  { key: 'diagnosis', label: 'Diagnosis', icon: '🩺' },
  { key: 'management', label: 'Surgical Management', icon: '🏥' },
  { key: 'drugs', label: 'Drugs', icon: '💊' },
  { key: 'frequency', label: 'Frequency', icon: '⏱️' },
  { key: 'usages', label: 'Usages', icon: '💧' },
  { key: 'eyeside', label: 'Eye Side', icon: '👁️' },
  { key: 'review', label: 'Review & Instructions', icon: '📝' },
];

const inputCls = 'h-9 px-3 rounded-lg border border-border bg-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors w-full';
const btnPrimary = 'px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-medium shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondary = 'px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer';
const btnDanger = 'px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-xs font-medium hover:bg-danger/20 transition-colors cursor-pointer';


// ─── SORT: starred on top (by starredAt), non-starred by sortOrder then text ───
import { sortByStarAndOrder, sortByStarAndText } from '@/lib/sorting';

// ─── DRAG-AND-DROP SORT HOOK ───
function useDragSort<T extends { id: string; starred?: boolean; sortOrder?: number | null }>(
  persistOrder: (reorderedNonStarred: T[]) => void,
) {
  const dragId = useRef<string | null>(null);
  const dragOverId = useRef<string | null>(null);

  const onDragStart = (id: string) => { dragId.current = id; };
  const onDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); dragOverId.current = id; };
  const onDrop = (e: React.DragEvent, items: T[], sortedItems: T[]) => {
    e.preventDefault();
    const srcId = dragId.current;
    const destId = dragOverId.current;
    if (!srcId || !destId || srcId === destId) { dragId.current = null; dragOverId.current = null; return; }

    const nonStarred = sortedItems.filter(i => !i.starred);
    const srcIdx = nonStarred.findIndex(i => i.id === srcId);
    const destIdx = nonStarred.findIndex(i => i.id === destId);
    if (srcIdx === -1 || destIdx === -1) { dragId.current = null; dragOverId.current = null; return; }

    const reordered = [...nonStarred];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(destIdx, 0, moved);
    const withOrder = reordered.map((item, idx) => ({ ...item, sortOrder: idx }));
    persistOrder(withOrder);
    dragId.current = null;
    dragOverId.current = null;
  };
  const onDragEnd = () => { dragId.current = null; dragOverId.current = null; };

  return { onDragStart, onDragOver, onDrop, onDragEnd };
}

// ─── DRAG HANDLE ICONS ───
function DragHandle() {
  return (
    <span
      className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary select-none text-lg leading-none px-1 shrink-0"
      title="Drag to reorder"
    >
      ⠿
    </span>
  );
}

function DetailDragHandle() {
  return (
    <span
      className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary select-none text-[10px] leading-none shrink-0"
      title="Drag to reorder"
    >
      ⠿
    </span>
  );
}


export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('history');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <ProtectedRoute requiredRole={1}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">Admin Panel</h1>
            <p className="text-sm text-text-muted mt-0.5">
                Manage prescription options and reception access
            </p>
          </div>
          {statusMessage && (
            <div className={`px-4 py-2 rounded-lg text-sm font-medium animate-fade-in ${
              statusMessage.type === 'success' ? 'bg-success/10 text-success' :
              statusMessage.type === 'error' ? 'bg-danger/10 text-danger' :
              'bg-primary/10 text-primary'
            }`}>
              {statusMessage.text}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-surface-alt rounded-xl p-1.5 border border-border">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-white text-primary shadow-sm border border-border'
                  : 'text-text-secondary hover:text-primary hover:bg-white/50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          {activeTab === 'accounts' && <ReceptionAccountsTab showStatus={showStatus} isActive={activeTab === 'accounts'} />}
          {activeTab === 'history' && <HistoryTab showStatus={showStatus} />}
          {activeTab === 'personal-complaints' && (
            <SimpleListTab
              collection="master_personal_complaints"
              fieldName="complaint"
              label="Personal Complaint"
              showStatus={showStatus}
            />
          )}
          {activeTab === 'examination' && <ExaminationTab showStatus={showStatus} />}
          {activeTab === 'investigation' && <InvestigationTab showStatus={showStatus} />}
          {activeTab === 'diagnosis' && <DiagnosisTab showStatus={showStatus} />}
          {activeTab === 'management' && <ManagementTab showStatus={showStatus} />}
          {activeTab === 'drugs' && <DrugsTab showStatus={showStatus} />}
          {activeTab === 'frequency' && <SimpleListTab collection="master_frequency" fieldName="frequency" label="Frequency" showStatus={showStatus} />}
          {activeTab === 'usages' && <SimpleListTab collection="master_usages" fieldName="usage" label="Usage" showStatus={showStatus} />}
          {activeTab === 'eyeside' && <SimpleListTab collection="master_eyeside" fieldName="eyeSide" label="Eye Side" showStatus={showStatus} />}
          {activeTab === 'review' && <ReviewTab showStatus={showStatus} />}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// ────────────────────────────
// RECEPTION ACCOUNTS TAB
// ────────────────────────────
function ReceptionAccountsTab({ showStatus, isActive }: { showStatus: ShowStatus; isActive: boolean }) {
  const [items, setItems] = useState<ReceptionAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newBranch, setNewBranch] = useState<'branch-1' | 'branch-2'>('branch-1');
  const [passwordMap, setPasswordMap] = useState<Record<string, string>>({});
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fs.getReceptionAccounts();
      setItems(data);
    } catch {
      showStatus('Failed to load reception accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

  useEffect(() => {
    if (!isActive) return;
    loadAccounts();
  }, [isActive, loadAccounts]);

  const handleAdd = async () => {
    const username = newUsername.trim();
    if (!username || newPassword.length < 6) {
      showStatus('Username and password (min 6 chars) are required', 'error');
      return;
    }

    try {
      const account = await fs.addReceptionAccount(username, newPassword, newBranch);
      setItems((prev) => [...prev, account].sort((a, b) => a.username.localeCompare(b.username)));
      setNewUsername('');
      setNewPassword('');
      setNewBranch('branch-1');
      showStatus('Reception account created', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      showStatus(message, 'error');
    }
  };

  const handleResetPassword = async (item: ReceptionAccount) => {
    const password = passwordMap[item.uid] || '';
    if (password.length < 6) {
      showStatus('Password must be at least 6 characters', 'error');
      return;
    }

    try {
      const replacement = await fs.resetReceptionPassword(item.uid, item.username, password);
      setItems((prev) => prev.filter((u) => u.uid !== item.uid).concat(replacement).sort((a, b) => a.username.localeCompare(b.username)));
      setPasswordMap((prev) => ({ ...prev, [item.uid]: '' }));
      showStatus('Password updated', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      showStatus(message, 'error');
    }
  };

  const handleStartEdit = (item: ReceptionAccount) => {
    setEditingUid(item.uid);
    setEditUsername(item.username);
  };

  const handleCancelEdit = () => {
    setEditingUid(null);
    setEditUsername('');
  };

  const handleSaveUsername = async (item: ReceptionAccount) => {
    const trimmed = editUsername.trim();
    if (!trimmed) {
      showStatus('Username cannot be empty', 'error');
      return;
    }
    if (trimmed === item.username) {
      handleCancelEdit();
      return;
    }

    try {
      await fs.updateReceptionUsername(item.uid, trimmed);
      setItems((prev) =>
        prev.map((u) => (u.uid === item.uid ? { ...u, username: trimmed } : u))
          .sort((a, b) => a.username.localeCompare(b.username))
      );
      setEditingUid(null);
      setEditUsername('');
      showStatus('Username updated', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update username';
      showStatus(message, 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-text">Add Reception Account</h3>
        <p className="text-xs text-text-muted mt-0.5">Create login accounts for reception staff.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          className={inputCls}
          placeholder="Username"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
        />
        <input
          className={inputCls}
          type="password"
          placeholder="Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <select
          className={inputCls}
          value={newBranch}
          onChange={(e) => setNewBranch(e.target.value as any)}
        >
          <option value="branch-1">Branch 1</option>
          <option value="branch-2">Branch 2</option>
        </select>
        <button onClick={handleAdd} className={btnPrimary}>+ Add Account</button>
      </div>

      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-text">Existing Reception Accounts</h3>
          <button onClick={loadAccounts} className={btnPrimary}>Refresh</button>
        </div>
        <div className="space-y-3 mt-3">
          {items.length === 0 && <p className="text-sm text-text-muted">No active reception accounts</p>}
          {items.map((item) => (
            <div key={item.uid} className="rounded-lg border border-border p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                <div>
                  <label className="text-xs text-text-muted block mb-1">Username</label>
                  {editingUid === item.uid ? (
                    <div className="flex gap-1.5">
                      <input
                        className={inputCls}
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveUsername(item); if (e.key === 'Escape') handleCancelEdit(); }}
                        autoFocus
                      />
                      <button onClick={() => handleSaveUsername(item)} className={btnPrimary} title="Save">✓</button>
                      <button onClick={handleCancelEdit} className={btnSecondary} title="Cancel">✕</button>
                    </div>
                  ) : (
                    <div className="flex gap-1.5 items-center">
                      <input className={inputCls} value={item.username} readOnly />
                      <button onClick={() => handleStartEdit(item)} className={btnSecondary} title="Edit username">✏️</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-xs text-text-muted block mb-1">New Password</label>
                  <input
                    className={inputCls}
                    type="password"
                    value={passwordMap[item.uid] || ''}
                    onChange={(e) => setPasswordMap((prev) => ({ ...prev, [item.uid]: e.target.value }))}
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
                <button onClick={() => handleResetPassword(item)} className={btnPrimary}>Reset Password</button>
                <div className="flex justify-between items-center text-xs text-text-muted">
                  <p>Role: Reception</p>
                  <p>Branch: <span className="font-semibold text-text capitalize">{item.branch === 'branch-2' ? 'Branch 2' : 'Branch 1'}</span></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────
// HELPER: Status callback type
// ────────────────────────────
type ShowStatus = (text: string, type?: 'success' | 'error' | 'info') => void;

// ────────────────────────────
// SIMPLE LIST TAB (frequency, usages, eyeside, investigation)
// ────────────────────────────
function SimpleListTab({ collection: collName, fieldName, legacyFieldName, label, showStatus }: {
  collection: 'master_frequency' | 'master_usages' | 'master_eyeside' | 'master_investigation' | 'master_personal_complaints';
  fieldName: string;
  legacyFieldName?: string;
  label: string;
  showStatus: ShowStatus;
}) {
  const [items, setItems] = useState<{ id: string; starred?: boolean; sortOrder?: number; [key: string]: string | boolean | number | undefined }[]>([]);
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        let data = await fs.getMasterCollection<{ id: string; [key: string]: string }>(collName);

        if (collName === 'master_personal_complaints' && data.length === 0) {
          const historyOptions = await fs.getHistoryOptions();
          const uniqueComplaints = Array.from(new Set(historyOptions.map((h) => h.symptom).filter(Boolean)));

          if (uniqueComplaints.length > 0) {
            await Promise.all(
              uniqueComplaints.map((complaint, idx) => fs.addMasterItem('master_personal_complaints', {
                complaint,
                starred: false,
                sortOrder: idx,
              }))
            );
            data = await fs.getMasterCollection<{ id: string; [key: string]: string }>(collName);
          }
        }

        const normalized = data.map((item) => {
          if (!legacyFieldName) return item;
          const canonicalValue = String(item[fieldName] || item[legacyFieldName] || '').trim();
          return {
            ...item,
            [fieldName]: canonicalValue,
          };
        });

        if (active) {
          setItems(normalized);
          setLoading(false);
        }
      } catch {
        if (active) {
          setLoading(false);
          showStatus('Failed to load data — using empty list', 'error');
        }
      }
    }

    load();
    return () => { active = false; };
  }, [collName, fieldName, legacyFieldName, showStatus]);

  const sortedItems = sortByStarAndOrder(items, (item) => String(item[fieldName] || (legacyFieldName ? item[legacyFieldName] : '') || ''));

  const drag = useDragSort<typeof items[0]>(async (reordered) => {
    setItems(prev => {
      const starred = prev.filter(i => i.starred);
      const map = new Map(reordered.map(i => [i.id, i]));
      return [...starred, ...reordered.map(i => ({ ...prev.find(p => p.id === i.id)!, sortOrder: i.sortOrder }))];
    });
    // Persist each reordered item's sortOrder
    await Promise.all(
      reordered
        .filter(i => !i.id.startsWith('local-'))
        .map(i => fs.updateMasterItem(collName, i.id, { sortOrder: i.sortOrder }))
    );
  });

  const handleAdd = async () => {
    const val = newValue.trim();
    if (!val) return;
    const sortOrder = items.filter(i => !i.starred).length;
    try {
      const id = await fs.addMasterItem(collName, { [fieldName]: val, starred: false, sortOrder });
      setItems((prev) => [...prev, { id, [fieldName]: val, starred: false, sortOrder }]);
      setNewValue('');
      showStatus(`Added "${val}"`, 'success');
    } catch {
      setItems((prev) => [...prev, { id: `local-${Date.now()}`, [fieldName]: val, starred: false, sortOrder }]);
      setNewValue('');
      showStatus(`Added locally (Firebase write limit reached)`, 'info');
    }
  };

  const handleToggleStar = async (item: typeof items[0]) => {
    const nextStarred = !Boolean(item.starred);
    const updateData = { starred: nextStarred, starredAt: nextStarred ? Date.now() : 0 };
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem(collName, item.id, updateData);
      }
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updateData } as any : entry)));
      showStatus(nextStarred ? 'Starred' : 'Unstarred', 'success');
    } catch {
      showStatus('Failed to update star status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!id.startsWith('local-')) {
        await fs.deleteMasterItem(collName, id);
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
      showStatus('Deleted', 'success');
    } catch {
      setItems((prev) => prev.filter((item) => item.id !== id));
      showStatus('Removed locally (Firebase write limit reached)', 'info');
    }
  };

  const handleStartEdit = (item: typeof items[0]) => {
    setEditingId(item.id);
    setEditValue(String(item[fieldName] || (legacyFieldName ? item[legacyFieldName] : '') || ''));
  };

  const handleSaveEdit = async (id: string) => {
    const value = editValue.trim();
    if (!value) {
      showStatus(`${label} cannot be empty`, 'error');
      return;
    }

    try {
      if (!id.startsWith('local-')) {
        await fs.updateMasterItem(collName, id, { [fieldName]: value });
      }
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [fieldName]: value } : item)));
      setEditingId(null);
      setEditValue('');
      showStatus('Updated', 'success');
    } catch {
      showStatus('Failed to update', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-6">
        <input className={inputCls} placeholder={`New ${label}...`} value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className={btnPrimary}>+ Add</button>
      </div>
      <div className="space-y-1">
        {items.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No items yet</p>}
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-surface-alt group transition-colors"
            draggable={!item.starred}
            onDragStart={!item.starred ? () => drag.onDragStart(item.id) : undefined}
            onDragOver={!item.starred ? (e) => drag.onDragOver(e, item.id) : undefined}
            onDrop={!item.starred ? (e) => drag.onDrop(e, items, sortedItems) : undefined}
            onDragEnd={drag.onDragEnd}
          >
            {editingId === item.id ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  className={inputCls}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.id)}
                />
                <button onClick={() => handleSaveEdit(item.id)} className={btnSecondary}>Save</button>
                <button onClick={() => { setEditingId(null); setEditValue(''); }} className={btnSecondary}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  {!item.starred && <DragHandle />}
                  {item.starred && <span className="text-warning px-1 text-sm">★</span>}
                  <span className="text-sm text-text">{String(item[fieldName] || (legacyFieldName ? item[legacyFieldName] : '') || '')}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleToggleStar(item)} className={btnSecondary}>{item.starred ? '★' : '☆'}</button>
                  <button onClick={() => handleStartEdit(item)} className={btnSecondary}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} className={btnDanger}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-4">{items.length} items</p>
    </div>
  );
}

// ────────────────────────────
// INVESTIGATION TAB
// ────────────────────────────
function InvestigationTab({ showStatus }: { showStatus: ShowStatus }) {
  const [items, setItems] = useState<MasterInvestigation[]>([]);
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // Use merged options to backfill legacy items into Firestore if needed.
        const merged = await fs.getInvestigationOptions();
        const legacyItems = merged.filter((item) => item.id.startsWith('legacy-') || item.id.startsWith('legacy-db-'));
        if (legacyItems.length > 0) {
          await Promise.all(
            legacyItems.map((item, index) => fs.addMasterItem('master_investigation', {
              investigation: item.investigation,
              comments: item.comments || '',
              starred: Boolean(item.starred),
              starredAt: item.starred ? (item.starredAt || Date.now()) : 0,
              sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index,
            }))
          );
          const refreshed = await fs.getMasterCollection<MasterInvestigation>('master_investigation');
          setItems(refreshed);
        } else {
          setItems(merged);
        }
      } catch {
        showStatus('Failed to load investigation options', 'error');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [showStatus]);

  const sortedItems = sortByStarAndOrder(items, (item) => item.investigation || '');

  const drag = useDragSort<MasterInvestigation>(async (reordered) => {
    setItems(prev => {
      const starred = prev.filter(i => i.starred);
      return [...starred, ...reordered.map(i => ({ ...prev.find(p => p.id === i.id)!, sortOrder: i.sortOrder }))];
    });
    await Promise.all(
      reordered
        .filter(i => !i.id.startsWith('local-') && !i.id.startsWith('legacy-'))
        .map(i => fs.updateMasterItem('master_investigation', i.id, { sortOrder: i.sortOrder }))
    );
  });

  const handleAdd = async () => {
    const investigation = newValue.trim();
    if (!investigation) return;

    const sortOrder = items.filter(i => !i.starred).length;
    try {
      const id = await fs.addMasterItem('master_investigation', {
        investigation,
        comments: '',
        starred: false,
        sortOrder,
      });
      setItems((prev) => [...prev, { id, investigation, comments: '', starred: false, sortOrder }]);
      setNewValue('');
      showStatus(`Added "${investigation}"`, 'success');
    } catch {
      setItems((prev) => [...prev, { id: `local-${Date.now()}`, investigation, comments: '', starred: false, sortOrder }]);
      setNewValue('');
      showStatus('Added locally (Firebase write limit reached)', 'info');
    }
  };

  const handleToggleStar = async (item: MasterInvestigation) => {
    const nextStarred = !Boolean(item.starred);
    const updateData = { starred: nextStarred, starredAt: nextStarred ? Date.now() : 0 };
    try {
      if (!item.id.startsWith('local-') && !item.id.startsWith('legacy-')) {
        await fs.updateMasterItem('master_investigation', item.id, updateData);
      }
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updateData } : entry)));
      showStatus(nextStarred ? 'Starred' : 'Unstarred', 'success');
    } catch {
      showStatus('Failed to update star status', 'error');
    }
  };

  const handleDelete = async (item: MasterInvestigation) => {
    try {
      if (!item.id.startsWith('local-') && !item.id.startsWith('legacy-')) {
        await fs.deleteMasterItem('master_investigation', item.id);
      }
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      showStatus('Deleted', 'success');
    } catch {
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      showStatus('Removed locally', 'info');
    }
  };

  const handleSaveEdit = async (id: string) => {
    const value = editValue.trim();
    if (!value) {
      showStatus('Investigation cannot be empty', 'error');
      return;
    }

    try {
      const target = items.find((i) => i.id === id);
      if (target && !id.startsWith('local-') && !id.startsWith('legacy-')) {
        await fs.updateMasterItem('master_investigation', id, { investigation: value });
      }
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, investigation: value } : item)));
      setEditingId(null);
      setEditValue('');
      showStatus('Updated', 'success');
    } catch {
      showStatus('Failed to update', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex gap-2 mb-6">
        <input
          className={inputCls}
          placeholder="New Investigation Type..."
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button onClick={handleAdd} className={btnPrimary}>+ Add</button>
      </div>
      <div className="space-y-1">
        {items.length === 0 && <p className="text-sm text-text-muted py-4 text-center">No items yet</p>}
        {sortedItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-surface-alt group transition-colors"
            draggable={!item.starred}
            onDragStart={!item.starred ? () => drag.onDragStart(item.id) : undefined}
            onDragOver={!item.starred ? (e) => drag.onDragOver(e, item.id) : undefined}
            onDrop={!item.starred ? (e) => drag.onDrop(e, items, sortedItems) : undefined}
            onDragEnd={drag.onDragEnd}
          >
            {editingId === item.id ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  className={inputCls}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.id)}
                />
                <button onClick={() => handleSaveEdit(item.id)} className={btnSecondary}>Save</button>
                <button onClick={() => { setEditingId(null); setEditValue(''); }} className={btnSecondary}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1 min-w-0">
                  {!item.starred && <DragHandle />}
                  {item.starred && <span className="text-warning px-1 text-sm">★</span>}
                  <span className="text-sm text-text truncate">{item.investigation}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleToggleStar(item)} className={btnSecondary}>{item.starred ? '★' : '☆'}</button>
                  <button onClick={() => { setEditingId(item.id); setEditValue(item.investigation || ''); }} className={btnSecondary}>Edit</button>
                  <button onClick={() => handleDelete(item)} className={btnDanger}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-4">{items.length} items</p>
    </div>
  );
}


// ────────────────────────────
// HISTORY TAB (symptom + details array)
// ────────────────────────────
function HistoryTab({ showStatus }: { showStatus: ShowStatus }) {
  const [items, setItems] = useState<MasterHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSymptom, setNewSymptom] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSymptom, setEditSymptom] = useState('');
  const [editDetails, setEditDetails] = useState('');

  useEffect(() => {
    fs.getHistoryOptions().then((data) => { setItems(data); setLoading(false); })
      .catch(() => { setLoading(false); });
  }, []);

  const sortedItems = sortByStarAndOrder(items, (item) => item.symptom || '');

  const drag = useDragSort<MasterHistory>(async (reordered) => {
    setItems(prev => {
      const starred = prev.filter(i => i.starred);
      return [...starred, ...reordered.map(i => ({ ...prev.find(p => p.id === i.id)!, sortOrder: i.sortOrder }))];
    });
    await Promise.all(reordered.filter(i => !i.id.startsWith('local-')).map(i => fs.updateMasterItem('master_history', i.id, { sortOrder: i.sortOrder })));
  });

  const handleAdd = async () => {
    const sym = newSymptom.trim();
    if (!sym) return;
    const details = newDetails.split(';').map(d => d.trim()).filter(Boolean).map((text, idx) => ({ text, starred: false, sortOrder: idx }));
    const sortOrder = items.filter(i => !i.starred).length;
    try {
      const id = await fs.addMasterItem('master_history', { symptom: sym, details, comments: '', starred: false, sortOrder });
      setItems(prev => [...prev, { id, symptom: sym, details, comments: '', starred: false, sortOrder }]);
      setNewSymptom(''); setNewDetails('');
      showStatus(`Added "${sym}"`, 'success');
    } catch {
      setItems(prev => [...prev, { id: `local-${Date.now()}`, symptom: sym, details, comments: '', starred: false, sortOrder }]);
      setNewSymptom(''); setNewDetails('');
      showStatus('Added locally (Firebase write limit)', 'info');
    }
  };

  const [dragDetailText, setDragDetailText] = useState<string | null>(null);
  const [dragOverDetailText, setDragOverDetailText] = useState<string | null>(null);

  const handleToggleDetailStar = async (item: MasterHistory, detailIndex: number) => {
    const newDetails = [...(item.details || [])];
    const nextStarred = !newDetails[detailIndex].starred;
    newDetails[detailIndex] = {
      ...newDetails[detailIndex],
      starred: nextStarred,
      starredAt: nextStarred ? Date.now() : 0,
    };
    if (!nextStarred) {
      const nonStarred = newDetails.filter(d => !d.starred);
      newDetails[detailIndex].sortOrder = nonStarred.length;
    }
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_history', item.id, { details: newDetails });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, details: newDetails } : i));
    } catch {
      showStatus('Failed to update detail star', 'error');
    }
  };

  const handleDetailDrop = async (item: MasterHistory, srcText: string, destText: string) => {
    if (srcText === destText) return;
    const sorted = sortByStarAndOrder(item.details || [], d => d.text);
    const nonStarred = sorted.filter(d => !d.starred);
    const srcIdx = nonStarred.findIndex(d => d.text === srcText);
    const destIdx = nonStarred.findIndex(d => d.text === destText);
    if (srcIdx === -1 || destIdx === -1) return;

    const reordered = [...nonStarred];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(destIdx, 0, moved);
    const withOrder = reordered.map((d, idx) => ({ ...d, sortOrder: idx }));

    const starred = sorted.filter(d => d.starred);
    const nextDetails = [...starred, ...withOrder];

    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_history', item.id, { details: nextDetails });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, details: nextDetails } : i));
    } catch {
      showStatus('Failed to reorder details', 'error');
    }
  };

  const handleToggleStar = async (item: MasterHistory) => {
    const nextStarred = !Boolean(item.starred);
    const updateData = { starred: nextStarred, starredAt: nextStarred ? Date.now() : 0 };
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_history', item.id, updateData);
      }
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updateData } : entry)));
      showStatus(nextStarred ? 'Starred' : 'Unstarred', 'success');
    } catch {
      showStatus('Failed to update star status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try { if (!id.startsWith('local-')) await fs.deleteMasterItem('master_history', id); } catch { /* quota */ }
    setItems(prev => prev.filter(i => i.id !== id));
    showStatus('Deleted', 'success');
  };

  const handleStartEdit = (item: MasterHistory) => {
    setEditingId(item.id);
    setEditSymptom(item.symptom || '');
    setEditDetails((item.details || []).map(d => d.text).join('; '));
  };

  const handleSaveEdit = async (id: string) => {
    const symptom = editSymptom.trim();
    const parsedText = editDetails.split(';').map((d) => d.trim()).filter(Boolean);
    if (!symptom) {
      showStatus('Symptom cannot be empty', 'error');
      return;
    }

    const item = items.find(i => i.id === id);
    const existingDetails = item?.details || [];
    const newDetails = parsedText.map(text => {
      const existing = existingDetails.find(d => d.text === text);
      return existing || { text, starred: false };
    });

    try {
      if (!id.startsWith('local-')) {
        await fs.updateMasterItem('master_history', id, { symptom, details: newDetails, comments: '' });
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, symptom, details: newDetails } : i)));
      setEditingId(null);
      showStatus('Updated', 'success');
    } catch {
      showStatus('Failed to update', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <input className={inputCls} placeholder="Symptom name..." value={newSymptom} onChange={e => setNewSymptom(e.target.value)} />
        <input className={inputCls} placeholder="Details (semicolon separated)..." value={newDetails} onChange={e => setNewDetails(e.target.value)} />
      </div>
      <button onClick={handleAdd} className={`${btnPrimary} mb-6`}>+ Add Symptom</button>
      <div className="space-y-1">
        {sortedItems.map(item => (
          <div
            key={item.id}
            className="rounded-lg border border-border overflow-hidden"
            draggable={!item.starred}
            onDragStart={!item.starred ? () => drag.onDragStart(item.id) : undefined}
            onDragOver={!item.starred ? (e) => drag.onDragOver(e, item.id) : undefined}
            onDrop={!item.starred ? (e) => drag.onDrop(e, items, sortedItems) : undefined}
            onDragEnd={drag.onDragEnd}
          >
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-alt cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="flex items-center gap-2">
                {!item.starred && <DragHandle />}
                {item.starred && <span className="text-warning text-sm">★</span>}
                <span className="text-xs text-text-muted">{expandedId === item.id ? '▼' : '►'}</span>
                <span className="text-sm font-medium text-text">{item.symptom}</span>
                <span className="text-xs text-text-muted">({item.details?.length || 0} details)</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleToggleStar(item); }} className={btnSecondary}>{item.starred ? '★' : '☆'}</button>
                <button onClick={(e) => { e.stopPropagation(); handleStartEdit(item); }} className={btnSecondary}>Edit</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className={btnDanger}>Delete</button>
              </div>
            </div>
            {editingId === item.id ? (
              <div className="px-6 py-3 bg-surface-alt border-t border-border space-y-2">
                <input className={inputCls} value={editSymptom} onChange={(e) => setEditSymptom(e.target.value)} placeholder="Symptom" />
                <input className={inputCls} value={editDetails} onChange={(e) => setEditDetails(e.target.value)} placeholder="Details (semicolon separated)" />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSaveEdit(item.id)} className={btnSecondary}>Save</button>
                  <button onClick={() => setEditingId(null)} className={btnSecondary}>Cancel</button>
                </div>
              </div>
            ) : expandedId === item.id && (
              <div className="px-6 py-3 bg-surface-alt border-t border-border">
                <p className="text-xs text-text-muted mb-1 font-medium">Details:</p>
                <div className="flex flex-wrap gap-1.5">
                  {sortByStarAndOrder(item.details || [], d => d.text).map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-border group"
                      draggable={!d.starred}
                      onDragStart={!d.starred ? () => setDragDetailText(d.text) : undefined}
                      onDragOver={!d.starred ? (e) => { e.preventDefault(); setDragOverDetailText(d.text); } : undefined}
                      onDrop={!d.starred ? (e) => {
                        e.preventDefault();
                        if (dragDetailText) handleDetailDrop(item, dragDetailText, d.text);
                        setDragDetailText(null);
                        setDragOverDetailText(null);
                      } : undefined}
                    >
                      {!d.starred && <DetailDragHandle />}
                      <span className="text-xs text-text">{d.text}</span>
                      <button onClick={() => {
                        const origIndex = item.details?.findIndex(orig => orig.text === d.text);
                        if (origIndex !== undefined && origIndex !== -1) handleToggleDetailStar(item, origIndex);
                      }} className={`text-xs cursor-pointer ${d.starred ? 'text-warning' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-warning transition-opacity'}`}>
                        {d.starred ? '★' : '☆'}
                      </button>
                    </div>
                  ))}
                  {(!item.details || item.details.length === 0) && <span className="text-xs text-text-muted">No details</span>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-4">{items.length} symptoms</p>
    </div>
  );
}

// ────────────────────────────
// EXAMINATION TAB
// ────────────────────────────
function ExaminationTab({ showStatus }: { showStatus: ShowStatus }) {
  const [items, setItems] = useState<MasterExamination[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newExplanations, setNewExplanations] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editExplanations, setEditExplanations] = useState('');

  useEffect(() => {
    fs.getExaminationOptions().then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sortedItems = sortByStarAndOrder(items, (item) => item.title || '');

  const drag = useDragSort<MasterExamination>(async (reordered) => {
    setItems(prev => {
      const starred = prev.filter(i => i.starred);
      return [...starred, ...reordered.map(i => ({ ...prev.find(p => p.id === i.id)!, sortOrder: i.sortOrder }))];
    });
    await Promise.all(reordered.filter(i => !i.id.startsWith('local-')).map(i => fs.updateMasterItem('master_examination', i.id, { sortOrder: i.sortOrder })));
  });

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const explanations = newExplanations.split(';').map(d => d.trim()).filter(Boolean).map((text, idx) => ({ text, starred: false, sortOrder: idx }));
    const sortOrder = items.filter(i => !i.starred).length;
    try {
      const id = await fs.addMasterItem('master_examination', { title, explanations, starred: false, sortOrder });
      setItems(prev => [...prev, { id, title, explanations, starred: false, sortOrder }]);
      setNewTitle(''); setNewExplanations('');
      showStatus(`Added "${title}"`, 'success');
    } catch {
      setItems(prev => [...prev, { id: `local-${Date.now()}`, title, explanations, starred: false, sortOrder }]);
      setNewTitle(''); setNewExplanations('');
      showStatus('Added locally', 'info');
    }
  };

  const [dragDetailText, setDragDetailText] = useState<string | null>(null);
  const [dragOverDetailText, setDragOverDetailText] = useState<string | null>(null);

  const handleToggleDetailStar = async (item: MasterExamination, detailIndex: number) => {
    const newExplanations = [...(item.explanations || [])];
    const nextStarred = !newExplanations[detailIndex].starred;
    newExplanations[detailIndex] = {
      ...newExplanations[detailIndex],
      starred: nextStarred,
      starredAt: nextStarred ? Date.now() : 0,
    };
    if (!nextStarred) {
      const nonStarred = newExplanations.filter(d => !d.starred);
      newExplanations[detailIndex].sortOrder = nonStarred.length;
    }
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_examination', item.id, { explanations: newExplanations });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, explanations: newExplanations } : i));
    } catch {
      showStatus('Failed to update detail star', 'error');
    }
  };

  const handleDetailDrop = async (item: MasterExamination, srcText: string, destText: string) => {
    if (srcText === destText) return;
    const sorted = sortByStarAndOrder(item.explanations || [], d => d.text);
    const nonStarred = sorted.filter(d => !d.starred);
    const srcIdx = nonStarred.findIndex(d => d.text === srcText);
    const destIdx = nonStarred.findIndex(d => d.text === destText);
    if (srcIdx === -1 || destIdx === -1) return;

    const reordered = [...nonStarred];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(destIdx, 0, moved);
    const withOrder = reordered.map((d, idx) => ({ ...d, sortOrder: idx }));

    const starred = sorted.filter(d => d.starred);
    const nextExplanations = [...starred, ...withOrder];

    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_examination', item.id, { explanations: nextExplanations });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, explanations: nextExplanations } : i));
    } catch {
      showStatus('Failed to reorder details', 'error');
    }
  };

  const handleToggleStar = async (item: MasterExamination) => {
    const nextStarred = !Boolean(item.starred);
    const updateData = { starred: nextStarred, starredAt: nextStarred ? Date.now() : 0 };
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_examination', item.id, updateData);
      }
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updateData } : entry)));
      showStatus(nextStarred ? 'Starred' : 'Unstarred', 'success');
    } catch {
      showStatus('Failed to update star status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try { if (!id.startsWith('local-')) await fs.deleteMasterItem('master_examination', id); } catch { /* quota */ }
    setItems(prev => prev.filter(i => i.id !== id));
    showStatus('Deleted', 'success');
  };

  const handleStartEdit = (item: MasterExamination) => {
    setEditingId(item.id);
    setEditTitle(item.title || '');
    setEditExplanations((item.explanations || []).map(d => d.text).join('; '));
  };

  const handleSaveEdit = async (id: string) => {
    const title = editTitle.trim();
    const parsedText = editExplanations.split(';').map((d) => d.trim()).filter(Boolean);
    if (!title) {
      showStatus('Title cannot be empty', 'error');
      return;
    }

    const item = items.find(i => i.id === id);
    const existingExplanations = item?.explanations || [];
    const newExplanations = parsedText.map(text => {
      const existing = existingExplanations.find(d => d.text === text);
      return existing || { text, starred: false };
    });

    try {
      if (!id.startsWith('local-')) {
        await fs.updateMasterItem('master_examination', id, { title, explanations: newExplanations });
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title, explanations: newExplanations } : i)));
      setEditingId(null);
      showStatus('Updated', 'success');
    } catch {
      showStatus('Failed to update', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <input className={inputCls} placeholder="Exam title..." value={newTitle} onChange={e => setNewTitle(e.target.value)} />
        <input className={inputCls} placeholder="Explanations (semicolon separated)..." value={newExplanations} onChange={e => setNewExplanations(e.target.value)} />
      </div>
      <button onClick={handleAdd} className={`${btnPrimary} mb-6`}>+ Add</button>
      <div className="space-y-1">
        {sortedItems.map(item => (
          <div
            key={item.id}
            className="rounded-lg border border-border overflow-hidden"
            draggable={!item.starred}
            onDragStart={!item.starred ? () => drag.onDragStart(item.id) : undefined}
            onDragOver={!item.starred ? (e) => drag.onDragOver(e, item.id) : undefined}
            onDrop={!item.starred ? (e) => drag.onDrop(e, items, sortedItems) : undefined}
            onDragEnd={drag.onDragEnd}
          >
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-alt cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="flex items-center gap-2">
                {!item.starred && <DragHandle />}
                {item.starred && <span className="text-warning text-sm">★</span>}
                <span className="text-xs text-text-muted">{expandedId === item.id ? '▼' : '►'}</span>
                <span className="text-sm font-medium text-text">{item.title}</span>
                <span className="text-xs text-text-muted">({item.explanations?.length || 0} items)</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleToggleStar(item); }} className={btnSecondary}>{item.starred ? '★' : '☆'}</button>
                <button onClick={(e) => { e.stopPropagation(); handleStartEdit(item); }} className={btnSecondary}>Edit</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className={btnDanger}>Delete</button>
              </div>
            </div>
            {editingId === item.id ? (
              <div className="px-6 py-3 bg-surface-alt border-t border-border space-y-2">
                <input className={inputCls} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                <input className={inputCls} value={editExplanations} onChange={(e) => setEditExplanations(e.target.value)} placeholder="Explanations (semicolon separated)" />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSaveEdit(item.id)} className={btnSecondary}>Save</button>
                  <button onClick={() => setEditingId(null)} className={btnSecondary}>Cancel</button>
                </div>
              </div>
            ) : expandedId === item.id && (
              <div className="px-6 py-3 bg-surface-alt border-t border-border">
                <div className="flex flex-wrap gap-1.5">
                  {sortByStarAndOrder(item.explanations || [], d => d.text).map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-border group"
                      draggable={!d.starred}
                      onDragStart={!d.starred ? () => setDragDetailText(d.text) : undefined}
                      onDragOver={!d.starred ? (e) => { e.preventDefault(); setDragOverDetailText(d.text); } : undefined}
                      onDrop={!d.starred ? (e) => {
                        e.preventDefault();
                        if (dragDetailText) handleDetailDrop(item, dragDetailText, d.text);
                        setDragDetailText(null);
                        setDragOverDetailText(null);
                      } : undefined}
                    >
                      {!d.starred && <DetailDragHandle />}
                      <span className="text-xs text-text">{d.text}</span>
                      <button onClick={() => {
                        const origIndex = item.explanations?.findIndex(orig => orig.text === d.text);
                        if (origIndex !== undefined && origIndex !== -1) handleToggleDetailStar(item, origIndex);
                      }} className={`text-xs cursor-pointer ${d.starred ? 'text-warning' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-warning transition-opacity'}`}>
                        {d.starred ? '★' : '☆'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-4">{items.length} items</p>
    </div>
  );
}

// ────────────────────────────
// DIAGNOSIS TAB
// ────────────────────────────
function DiagnosisTab({ showStatus }: { showStatus: ShowStatus }) {
  const [items, setItems] = useState<MasterDiagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDisease, setNewDisease] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDisease, setEditDisease] = useState('');
  const [editDetails, setEditDetails] = useState('');

  useEffect(() => {
    fs.getDiagnosisOptions().then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sortedItems = sortByStarAndOrder(items, (item) => item.disease || '');

  const drag = useDragSort<MasterDiagnosis>(async (reordered) => {
    setItems(prev => {
      const starred = prev.filter(i => i.starred);
      return [...starred, ...reordered.map(i => ({ ...prev.find(p => p.id === i.id)!, sortOrder: i.sortOrder }))];
    });
    await Promise.all(reordered.filter(i => !i.id.startsWith('local-')).map(i => fs.updateMasterItem('master_diagnosis', i.id, { sortOrder: i.sortOrder })));
  });

  const handleAdd = async () => {
    const disease = newDisease.trim();
    if (!disease) return;
    const details = newDetails.split(';').map(d => d.trim()).filter(Boolean).map((text, idx) => ({ text, starred: false, sortOrder: idx }));
    const sortOrder = items.filter(i => !i.starred).length;
    try {
      const id = await fs.addMasterItem('master_diagnosis', { disease, details, comments: '', starred: false, sortOrder });
      setItems(prev => [...prev, { id, disease, details, comments: '', starred: false, sortOrder }]);
      setNewDisease(''); setNewDetails('');
      showStatus(`Added "${disease}"`, 'success');
    } catch {
      setItems(prev => [...prev, { id: `local-${Date.now()}`, disease, details, comments: '', starred: false, sortOrder }]);
      setNewDisease(''); setNewDetails('');
      showStatus('Added locally', 'info');
    }
  };

  const [dragDetailText, setDragDetailText] = useState<string | null>(null);
  const [dragOverDetailText, setDragOverDetailText] = useState<string | null>(null);

  const handleToggleDetailStar = async (item: MasterDiagnosis, detailIndex: number) => {
    const newDetails = [...(item.details || [])];
    const nextStarred = !newDetails[detailIndex].starred;
    newDetails[detailIndex] = {
      ...newDetails[detailIndex],
      starred: nextStarred,
      starredAt: nextStarred ? Date.now() : 0,
    };
    if (!nextStarred) {
      const nonStarred = newDetails.filter(d => !d.starred);
      newDetails[detailIndex].sortOrder = nonStarred.length;
    }
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_diagnosis', item.id, { details: newDetails });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, details: newDetails } : i));
    } catch {
      showStatus('Failed to update detail star', 'error');
    }
  };

  const handleDetailDrop = async (item: MasterDiagnosis, srcText: string, destText: string) => {
    if (srcText === destText) return;
    const sorted = sortByStarAndOrder(item.details || [], d => d.text);
    const nonStarred = sorted.filter(d => !d.starred);
    const srcIdx = nonStarred.findIndex(d => d.text === srcText);
    const destIdx = nonStarred.findIndex(d => d.text === destText);
    if (srcIdx === -1 || destIdx === -1) return;

    const reordered = [...nonStarred];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(destIdx, 0, moved);
    const withOrder = reordered.map((d, idx) => ({ ...d, sortOrder: idx }));

    const starred = sorted.filter(d => d.starred);
    const nextDetails = [...starred, ...withOrder];

    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_diagnosis', item.id, { details: nextDetails });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, details: nextDetails } : i));
    } catch {
      showStatus('Failed to reorder details', 'error');
    }
  };

  const handleToggleStar = async (item: MasterDiagnosis) => {
    const nextStarred = !Boolean(item.starred);
    const updateData = { starred: nextStarred, starredAt: nextStarred ? Date.now() : 0 };
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_diagnosis', item.id, updateData);
      }
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updateData } : entry)));
      showStatus(nextStarred ? 'Starred' : 'Unstarred', 'success');
    } catch {
      showStatus('Failed to update star status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try { if (!id.startsWith('local-')) await fs.deleteMasterItem('master_diagnosis', id); } catch { /* quota */ }
    setItems(prev => prev.filter(i => i.id !== id));
    showStatus('Deleted', 'success');
  };

  const handleStartEdit = (item: MasterDiagnosis) => {
    setEditingId(item.id);
    setEditDisease(item.disease || '');
    setEditDetails((item.details || []).map(d => d.text).join('; '));
  };

  const handleSaveEdit = async (id: string) => {
    const disease = editDisease.trim();
    const parsedText = editDetails.split(';').map((d) => d.trim()).filter(Boolean);
    if (!disease) {
      showStatus('Disease cannot be empty', 'error');
      return;
    }

    const item = items.find(i => i.id === id);
    const existingDetails = item?.details || [];
    const newDetails = parsedText.map(text => {
      const existing = existingDetails.find(d => d.text === text);
      return existing || { text, starred: false };
    });

    try {
      if (!id.startsWith('local-')) {
        await fs.updateMasterItem('master_diagnosis', id, { disease, details: newDetails, comments: '' });
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, disease, details: newDetails } : i)));
      setEditingId(null);
      showStatus('Updated', 'success');
    } catch {
      showStatus('Failed to update', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <input className={inputCls} placeholder="Disease name..." value={newDisease} onChange={e => setNewDisease(e.target.value)} />
        <input className={inputCls} placeholder="Details (semicolon separated)..." value={newDetails} onChange={e => setNewDetails(e.target.value)} />
      </div>
      <button onClick={handleAdd} className={`${btnPrimary} mb-6`}>+ Add Disease</button>
      <div className="space-y-1">
        {sortedItems.map(item => (
          <div
            key={item.id}
            className="rounded-lg border border-border overflow-hidden"
            draggable={!item.starred}
            onDragStart={!item.starred ? () => drag.onDragStart(item.id) : undefined}
            onDragOver={!item.starred ? (e) => drag.onDragOver(e, item.id) : undefined}
            onDrop={!item.starred ? (e) => drag.onDrop(e, items, sortedItems) : undefined}
            onDragEnd={drag.onDragEnd}
          >
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-alt cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="flex items-center gap-2">
                {!item.starred && <DragHandle />}
                {item.starred && <span className="text-warning text-sm">★</span>}
                <span className="text-xs text-text-muted">{expandedId === item.id ? '▼' : '►'}</span>
                <span className="text-sm font-medium text-text">{item.disease}</span>
                <span className="text-xs text-text-muted">({item.details?.length || 0} details)</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleToggleStar(item); }} className={btnSecondary}>{item.starred ? '★' : '☆'}</button>
                <button onClick={(e) => { e.stopPropagation(); handleStartEdit(item); }} className={btnSecondary}>Edit</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className={btnDanger}>Delete</button>
              </div>
            </div>
            {editingId === item.id ? (
              <div className="px-6 py-3 bg-surface-alt border-t border-border space-y-2">
                <input className={inputCls} value={editDisease} onChange={(e) => setEditDisease(e.target.value)} placeholder="Disease" />
                <input className={inputCls} value={editDetails} onChange={(e) => setEditDetails(e.target.value)} placeholder="Details (semicolon separated)" />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSaveEdit(item.id)} className={btnSecondary}>Save</button>
                  <button onClick={() => setEditingId(null)} className={btnSecondary}>Cancel</button>
                </div>
              </div>
            ) : expandedId === item.id && (
              <div className="px-6 py-3 bg-surface-alt border-t border-border">
                <div className="flex flex-wrap gap-1.5">
                  {sortByStarAndOrder(item.details || [], d => d.text).map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-border group"
                      draggable={!d.starred}
                      onDragStart={!d.starred ? () => setDragDetailText(d.text) : undefined}
                      onDragOver={!d.starred ? (e) => { e.preventDefault(); setDragOverDetailText(d.text); } : undefined}
                      onDrop={!d.starred ? (e) => {
                        e.preventDefault();
                        if (dragDetailText) handleDetailDrop(item, dragDetailText, d.text);
                        setDragDetailText(null);
                        setDragOverDetailText(null);
                      } : undefined}
                    >
                      {!d.starred && <DetailDragHandle />}
                      <span className="text-xs text-text">{d.text}</span>
                      <button onClick={() => {
                        const origIndex = item.details?.findIndex(orig => orig.text === d.text);
                        if (origIndex !== undefined && origIndex !== -1) handleToggleDetailStar(item, origIndex);
                      }} className={`text-xs cursor-pointer ${d.starred ? 'text-warning' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-warning transition-opacity'}`}>
                        {d.starred ? '★' : '☆'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-4">{items.length} diseases</p>
    </div>
  );
}

// ────────────────────────────
// MANAGEMENT TAB
// ────────────────────────────
function ManagementTab({ showStatus }: { showStatus: ShowStatus }) {
  const [items, setItems] = useState<MasterManagement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProc, setNewProc] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editProcedure, setEditProcedure] = useState('');
  const [editDetails, setEditDetails] = useState('');

  useEffect(() => {
    fs.getManagementOptions().then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sortedItems = sortByStarAndOrder(items, (item) => item.procedure || '');

  const drag = useDragSort<MasterManagement>(async (reordered) => {
    setItems(prev => {
      const starred = prev.filter(i => i.starred);
      return [...starred, ...reordered.map(i => ({ ...prev.find(p => p.id === i.id)!, sortOrder: i.sortOrder }))];
    });
    await Promise.all(reordered.filter(i => !i.id.startsWith('local-')).map(i => fs.updateMasterItem('master_management', i.id, { sortOrder: i.sortOrder })));
  });

  const handleAdd = async () => {
    const proc = newProc.trim();
    if (!proc) return;
    const details = newDetails.split(';').map(d => d.trim()).filter(Boolean).map((text, idx) => ({ text, starred: false, sortOrder: idx }));
    const sortOrder = items.filter(i => !i.starred).length;
    try {
      const id = await fs.addMasterItem('master_management', { procedure: proc, details, comments: '', starred: false, sortOrder });
      setItems(prev => [...prev, { id, procedure: proc, details, comments: '', starred: false, sortOrder }]);
      setNewProc(''); setNewDetails('');
      showStatus(`Added "${proc}"`, 'success');
    } catch {
      setItems(prev => [...prev, { id: `local-${Date.now()}`, procedure: proc, details, comments: '', starred: false, sortOrder }]);
      setNewProc(''); setNewDetails('');
      showStatus('Added locally', 'info');
    }
  };

  const [dragDetailText, setDragDetailText] = useState<string | null>(null);
  const [dragOverDetailText, setDragOverDetailText] = useState<string | null>(null);

  const handleToggleDetailStar = async (item: MasterManagement, detailIndex: number) => {
    const newDetails = [...(item.details || [])];
    const nextStarred = !newDetails[detailIndex].starred;
    newDetails[detailIndex] = {
      ...newDetails[detailIndex],
      starred: nextStarred,
      starredAt: nextStarred ? Date.now() : 0,
    };
    if (!nextStarred) {
      const nonStarred = newDetails.filter(d => !d.starred);
      newDetails[detailIndex].sortOrder = nonStarred.length;
    }
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_management', item.id, { details: newDetails });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, details: newDetails } : i));
    } catch {
      showStatus('Failed to update detail star', 'error');
    }
  };

  const handleDetailDrop = async (item: MasterManagement, srcText: string, destText: string) => {
    if (srcText === destText) return;
    const sorted = sortByStarAndOrder(item.details || [], d => d.text);
    const nonStarred = sorted.filter(d => !d.starred);
    const srcIdx = nonStarred.findIndex(d => d.text === srcText);
    const destIdx = nonStarred.findIndex(d => d.text === destText);
    if (srcIdx === -1 || destIdx === -1) return;

    const reordered = [...nonStarred];
    const [moved] = reordered.splice(srcIdx, 1);
    reordered.splice(destIdx, 0, moved);
    const withOrder = reordered.map((d, idx) => ({ ...d, sortOrder: idx }));

    const starred = sorted.filter(d => d.starred);
    const nextDetails = [...starred, ...withOrder];

    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_management', item.id, { details: nextDetails });
      }
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, details: nextDetails } : i));
    } catch {
      showStatus('Failed to reorder details', 'error');
    }
  };

  const handleToggleStar = async (item: MasterManagement) => {
    const nextStarred = !Boolean(item.starred);
    const updateData = { starred: nextStarred, starredAt: nextStarred ? Date.now() : 0 };
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_management', item.id, updateData);
      }
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updateData } : entry)));
      showStatus(nextStarred ? 'Starred' : 'Unstarred', 'success');
    } catch {
      showStatus('Failed to update star status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try { if (!id.startsWith('local-')) await fs.deleteMasterItem('master_management', id); } catch { /* quota */ }
    setItems(prev => prev.filter(i => i.id !== id));
    showStatus('Deleted', 'success');
  };

  const handleStartEdit = (item: MasterManagement) => {
    setEditingId(item.id);
    setEditProcedure(item.procedure || '');
    setEditDetails((item.details || []).map(d => d.text).join('; '));
  };

  const handleSaveEdit = async (id: string) => {
    const procedure = editProcedure.trim();
    const parsedText = editDetails.split(';').map((d) => d.trim()).filter(Boolean);
    if (!procedure) {
      showStatus('Procedure cannot be empty', 'error');
      return;
    }

    const item = items.find(i => i.id === id);
    const existingDetails = item?.details || [];
    const newDetails = parsedText.map(text => {
      const existing = existingDetails.find(d => d.text === text);
      return existing || { text, starred: false };
    });

    try {
      if (!id.startsWith('local-')) {
        await fs.updateMasterItem('master_management', id, { procedure, details: newDetails, comments: '' });
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, procedure, details: newDetails } : i)));
      setEditingId(null);
      showStatus('Updated', 'success');
    } catch {
      showStatus('Failed to update', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <input className={inputCls} placeholder="Procedure name..." value={newProc} onChange={e => setNewProc(e.target.value)} />
        <input className={inputCls} placeholder="Details (semicolon separated)..." value={newDetails} onChange={e => setNewDetails(e.target.value)} />
      </div>
      <button onClick={handleAdd} className={`${btnPrimary} mb-6`}>+ Add Procedure</button>
      <div className="space-y-1">
        {sortedItems.map(item => (
          <div
            key={item.id}
            className="rounded-lg border border-border overflow-hidden"
            draggable={!item.starred}
            onDragStart={!item.starred ? () => drag.onDragStart(item.id) : undefined}
            onDragOver={!item.starred ? (e) => drag.onDragOver(e, item.id) : undefined}
            onDrop={!item.starred ? (e) => drag.onDrop(e, items, sortedItems) : undefined}
            onDragEnd={drag.onDragEnd}
          >
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-alt cursor-pointer" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
              <div className="flex items-center gap-2">
                {!item.starred && <DragHandle />}
                {item.starred && <span className="text-warning text-sm">★</span>}
                <span className="text-xs text-text-muted">{expandedId === item.id ? '▼' : '►'}</span>
                <span className="text-sm font-medium text-text">{item.procedure}</span>
                <span className="text-xs text-text-muted">({item.details?.length || 0} details)</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); handleToggleStar(item); }} className={btnSecondary}>{item.starred ? '★' : '☆'}</button>
                <button onClick={(e) => { e.stopPropagation(); handleStartEdit(item); }} className={btnSecondary}>Edit</button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className={btnDanger}>Delete</button>
              </div>
            </div>
            {editingId === item.id ? (
              <div className="px-6 py-3 bg-surface-alt border-t border-border space-y-2">
                <input className={inputCls} value={editProcedure} onChange={(e) => setEditProcedure(e.target.value)} placeholder="Procedure" />
                <input className={inputCls} value={editDetails} onChange={(e) => setEditDetails(e.target.value)} placeholder="Details (semicolon separated)" />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleSaveEdit(item.id)} className={btnSecondary}>Save</button>
                  <button onClick={() => setEditingId(null)} className={btnSecondary}>Cancel</button>
                </div>
              </div>
            ) : expandedId === item.id && (
              <div className="px-6 py-3 bg-surface-alt border-t border-border">
                <div className="flex flex-wrap gap-1.5">
                  {sortByStarAndOrder(item.details || [], d => d.text).map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-border group"
                      draggable={!d.starred}
                      onDragStart={!d.starred ? () => setDragDetailText(d.text) : undefined}
                      onDragOver={!d.starred ? (e) => { e.preventDefault(); setDragOverDetailText(d.text); } : undefined}
                      onDrop={!d.starred ? (e) => {
                        e.preventDefault();
                        if (dragDetailText) handleDetailDrop(item, dragDetailText, d.text);
                        setDragDetailText(null);
                        setDragOverDetailText(null);
                      } : undefined}
                    >
                      {!d.starred && <DetailDragHandle />}
                      <span className="text-xs text-text">{d.text}</span>
                      <button onClick={() => {
                        const origIndex = item.details?.findIndex(orig => orig.text === d.text);
                        if (origIndex !== undefined && origIndex !== -1) handleToggleDetailStar(item, origIndex);
                      }} className={`text-xs cursor-pointer ${d.starred ? 'text-warning' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-warning transition-opacity'}`}>
                        {d.starred ? '★' : '☆'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-4">{items.length} procedures</p>
    </div>
  );
}

// ────────────────────────────
// DRUGS TAB (grouped by drugType)
// ────────────────────────────
function DrugsTab({ showStatus }: { showStatus: ShowStatus }) {
  const [items, setItems] = useState<MasterDrug[]>([]);
  const [loading, setLoading] = useState(true);
  const [newType, setNewType] = useState('');
  const [newName, setNewName] = useState('');
  const [filterType, setFilterType] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fs.getDrugOptions().then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const sortedItems = sortByStarAndOrder(items, (item) => item.drugName || '');

  const drag = useDragSort<MasterDrug>(async (reordered) => {
    setItems(prev => {
      const starred = prev.filter(i => i.starred);
      return [...starred, ...reordered.map(i => ({ ...prev.find(p => p.id === i.id)!, sortOrder: i.sortOrder }))];
    });
    await Promise.all(reordered.filter(i => !i.id.startsWith('local-')).map(i => fs.updateMasterItem('master_drugs', i.id, { sortOrder: i.sortOrder })));
  });

  const handleAdd = async () => {
    const type = newType.trim();
    const name = newName.trim();
    if (!type || !name) return;
    const sortOrder = items.filter(i => !i.starred).length;
    try {
      const id = await fs.addMasterItem('master_drugs', { drugType: type, drugName: name, starred: false, sortOrder });
      setItems(prev => [...prev, { id, drugType: type, drugName: name, starred: false, sortOrder }]);
      setNewName('');
      showStatus(`Added "${name}"`, 'success');
    } catch {
      setItems(prev => [...prev, { id: `local-${Date.now()}`, drugType: type, drugName: name, starred: false, sortOrder }]);
      setNewName('');
      showStatus('Added locally', 'info');
    }
  };

  const handleToggleStar = async (item: MasterDrug) => {
    const nextStarred = !Boolean(item.starred);
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_drugs', item.id, { starred: nextStarred });
      }
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, starred: nextStarred } : entry)));
      showStatus(nextStarred ? 'Starred' : 'Unstarred', 'success');
    } catch {
      showStatus('Failed to update star status', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try { if (!id.startsWith('local-')) await fs.deleteMasterItem('master_drugs', id); } catch { /* quota */ }
    setItems(prev => prev.filter(i => i.id !== id));
    showStatus('Deleted', 'success');
  };

  const handleStartEdit = (item: MasterDrug) => {
    setEditingId(item.id);
    setEditType(item.drugType || '');
    setEditName(item.drugName || '');
  };

  const handleSaveEdit = async (id: string) => {
    const drugType = editType.trim();
    const drugName = editName.trim();
    if (!drugType || !drugName) {
      showStatus('Drug type and name are required', 'error');
      return;
    }

    try {
      if (!id.startsWith('local-')) {
        await fs.updateMasterItem('master_drugs', id, { drugType, drugName });
      }
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, drugType, drugName } : item)));
      setEditingId(null);
      showStatus('Updated', 'success');
    } catch {
      showStatus('Failed to update', 'error');
    }
  };

  // Get unique drug types for filter
  const drugTypes = [...new Set(items.map(i => i.drugType))].sort();
  const filtered = filterType ? sortedItems.filter(i => i.drugType === filterType) : sortedItems;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
        <input className={inputCls} placeholder="Drug type..." value={newType} onChange={e => setNewType(e.target.value)}
          list="drug-types" />
        <datalist id="drug-types">
          {drugTypes.map(t => <option key={t} value={t} />)}
        </datalist>
        <input className={inputCls} placeholder="Drug name..." value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()} />
        <button onClick={handleAdd} className={btnPrimary}>+ Add Drug</button>
      </div>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs text-text-muted font-medium">Filter by type:</span>
        <select className="h-8 px-2 rounded border border-border text-xs bg-white cursor-pointer"
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All ({items.length})</option>
          {drugTypes.map(t => (
            <option key={t} value={t}>{t} ({items.filter(i => i.drugType === t).length})</option>
          ))}
        </select>
      </div>

      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {filtered.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-surface-alt group transition-colors"
            draggable={!item.starred}
            onDragStart={!item.starred ? () => drag.onDragStart(item.id) : undefined}
            onDragOver={!item.starred ? (e) => drag.onDragOver(e, item.id) : undefined}
            onDrop={!item.starred ? (e) => drag.onDrop(e, items, sortedItems) : undefined}
            onDragEnd={drag.onDragEnd}
          >
            {editingId === item.id ? (
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 w-full">
                <input className={inputCls} value={editType} onChange={(e) => setEditType(e.target.value)} placeholder="Drug type" />
                <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Drug name" />
                <button onClick={() => handleSaveEdit(item.id)} className={btnSecondary}>Save</button>
                <button onClick={() => setEditingId(null)} className={btnSecondary}>Cancel</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  {!item.starred && <DragHandle />}
                  {item.starred && <span className="text-warning text-sm">★</span>}
                  <span className="text-sm text-text">{item.drugName}</span>
                  <span className="text-xs text-text-muted ml-2">({item.drugType})</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleToggleStar(item)} className={btnSecondary}>{item.starred ? '★' : '☆'}</button>
                  <button onClick={() => handleStartEdit(item)} className={btnSecondary}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} className={btnDanger}>Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mt-4">{filtered.length} of {items.length} drugs shown</p>
    </div>
  );
}

// ────────────────────────────
// REVIEW TAB
// ────────────────────────────
function ReviewTab({ showStatus }: { showStatus: ShowStatus }) {
  const [items, setItems] = useState<MasterReviewInstruction[]>([]);
  const [loading, setLoading] = useState(true);

  const [newReview, setNewReview] = useState('');
  const [newInstruction, setNewInstruction] = useState('');

  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingInstructionId, setEditingInstructionId] = useState<string | null>(null);
  const [editReviewValue, setEditReviewValue] = useState('');
  const [editInstructionValue, setEditInstructionValue] = useState('');

  useEffect(() => {
    fs.getReviewInstructionOptions().then(data => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const reviewItems = sortByStarAndOrder(
    items.filter((item) => Boolean(item.review?.trim())).map((item) => ({
      ...item,
      sortOrder: item.reviewSortOrder ?? item.sortOrder,
    })),
    (item) => item.review || '',
  );

  const instructionItems = sortByStarAndOrder(
    items.filter((item) => Boolean(item.instruction?.trim())).map((item) => ({
      ...item,
      sortOrder: item.instructionSortOrder ?? item.sortOrder,
    })),
    (item) => item.instruction || '',
  );

  const reviewDrag = useDragSort<MasterReviewInstruction>(async (reordered) => {
    setItems(prev => prev.map((item) => {
      const next = reordered.find((r) => r.id === item.id);
      return next ? { ...item, reviewSortOrder: next.sortOrder } : item;
    }));

    await Promise.all(
      reordered
        .filter(i => !i.id.startsWith('local-'))
        .map(i => fs.updateMasterItem('master_review_instructions', i.id, { reviewSortOrder: i.sortOrder }))
    );
  });

  const instructionDrag = useDragSort<MasterReviewInstruction>(async (reordered) => {
    setItems(prev => prev.map((item) => {
      const next = reordered.find((r) => r.id === item.id);
      return next ? { ...item, instructionSortOrder: next.sortOrder } : item;
    }));

    await Promise.all(
      reordered
        .filter(i => !i.id.startsWith('local-'))
        .map(i => fs.updateMasterItem('master_review_instructions', i.id, { instructionSortOrder: i.sortOrder }))
    );
  });

  const handleAddReview = async () => {
    const review = newReview.trim();
    if (!review) return;
    const sortOrder = reviewItems.filter(i => !i.starred).length;
    try {
      const id = await fs.addMasterItem('master_review_instructions', {
        review,
        instruction: '',
        starred: false,
        reviewSortOrder: sortOrder,
      });
      setItems(prev => [...prev, { id, review, instruction: '', starred: false, reviewSortOrder: sortOrder }]);
      setNewReview('');
      showStatus('Review added', 'success');
    } catch {
      setItems(prev => [...prev, { id: `local-${Date.now()}`, review, instruction: '', starred: false, reviewSortOrder: sortOrder }]);
      setNewReview('');
      showStatus('Review added locally', 'info');
    }
  };

  const handleAddInstruction = async () => {
    const instruction = newInstruction.trim();
    if (!instruction) return;
    const sortOrder = instructionItems.filter(i => !i.starred).length;
    try {
      const id = await fs.addMasterItem('master_review_instructions', {
        review: '',
        instruction,
        starred: false,
        instructionSortOrder: sortOrder,
      });
      setItems(prev => [...prev, { id, review: '', instruction, starred: false, instructionSortOrder: sortOrder }]);
      setNewInstruction('');
      showStatus('Instruction added', 'success');
    } catch {
      setItems(prev => [...prev, { id: `local-${Date.now()}`, review: '', instruction, starred: false, instructionSortOrder: sortOrder }]);
      setNewInstruction('');
      showStatus('Instruction added locally', 'info');
    }
  };

  const handleToggleStar = async (item: MasterReviewInstruction) => {
    const nextStarred = !Boolean(item.starred);
    const updateData = { starred: nextStarred, starredAt: nextStarred ? Date.now() : 0 };
    try {
      if (!item.id.startsWith('local-')) {
        await fs.updateMasterItem('master_review_instructions', item.id, updateData);
      }
      setItems((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, ...updateData } : entry)));
      showStatus(nextStarred ? 'Starred' : 'Unstarred', 'success');
    } catch {
      showStatus('Failed to update star status', 'error');
    }
  };

  const handleDeleteReview = async (item: MasterReviewInstruction) => {
    try {
      if (!item.id.startsWith('local-')) {
        if (item.instruction?.trim()) {
          await fs.updateMasterItem('master_review_instructions', item.id, { review: '' });
        } else {
          await fs.deleteMasterItem('master_review_instructions', item.id);
        }
      }
      setItems(prev => prev
        .map((entry) => {
          if (entry.id !== item.id) return entry;
          if (entry.instruction?.trim()) return { ...entry, review: '' };
          return null;
        })
        .filter(Boolean) as MasterReviewInstruction[]);
      showStatus('Review deleted', 'success');
    } catch {
      showStatus('Failed to delete review', 'error');
    }
  };

  const handleDeleteInstruction = async (item: MasterReviewInstruction) => {
    try {
      if (!item.id.startsWith('local-')) {
        if (item.review?.trim()) {
          await fs.updateMasterItem('master_review_instructions', item.id, { instruction: '' });
        } else {
          await fs.deleteMasterItem('master_review_instructions', item.id);
        }
      }
      setItems(prev => prev
        .map((entry) => {
          if (entry.id !== item.id) return entry;
          if (entry.review?.trim()) return { ...entry, instruction: '' };
          return null;
        })
        .filter(Boolean) as MasterReviewInstruction[]);
      showStatus('Instruction deleted', 'success');
    } catch {
      showStatus('Failed to delete instruction', 'error');
    }
  };

  const handleSaveReviewEdit = async (id: string) => {
    const review = editReviewValue.trim();
    if (!review) {
      showStatus('Review cannot be empty', 'error');
      return;
    }

    try {
      if (!id.startsWith('local-')) {
        await fs.updateMasterItem('master_review_instructions', id, { review });
      }
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, review } : item)));
      setEditingReviewId(null);
      setEditReviewValue('');
      showStatus('Review updated', 'success');
    } catch {
      showStatus('Failed to update review', 'error');
    }
  };

  const handleSaveInstructionEdit = async (id: string) => {
    const instruction = editInstructionValue.trim();
    if (!instruction) {
      showStatus('Instruction cannot be empty', 'error');
      return;
    }

    try {
      if (!id.startsWith('local-')) {
        await fs.updateMasterItem('master_review_instructions', id, { instruction });
      }
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, instruction } : item)));
      setEditingInstructionId(null);
      setEditInstructionValue('');
      showStatus('Instruction updated', 'success');
    } catch {
      showStatus('Failed to update instruction', 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-8">
      <div>
        <h3 className="text-base font-semibold text-text mb-3">Review Options</h3>
        <div className="flex gap-2 mb-4">
          <input
            className={inputCls}
            placeholder="Add review option..."
            value={newReview}
            onChange={(e) => setNewReview(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddReview()}
          />
          <button onClick={handleAddReview} className={btnPrimary}>+ Add Review</button>
        </div>
        <div className="space-y-1">
          {reviewItems.length === 0 && <p className="text-sm text-text-muted py-2">No review options yet</p>}
          {reviewItems.map((item) => (
            <div
              key={`review-${item.id}`}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-surface-alt group transition-colors"
              draggable={!item.starred}
              onDragStart={!item.starred ? () => reviewDrag.onDragStart(item.id) : undefined}
              onDragOver={!item.starred ? (e) => reviewDrag.onDragOver(e, item.id) : undefined}
              onDrop={!item.starred ? (e) => reviewDrag.onDrop(e, reviewItems, reviewItems) : undefined}
              onDragEnd={reviewDrag.onDragEnd}
            >
              {editingReviewId === item.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    className={inputCls}
                    value={editReviewValue}
                    onChange={(e) => setEditReviewValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveReviewEdit(item.id)}
                  />
                  <button onClick={() => handleSaveReviewEdit(item.id)} className={btnSecondary}>Save</button>
                  <button onClick={() => { setEditingReviewId(null); setEditReviewValue(''); }} className={btnSecondary}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 min-w-0">
                    {!item.starred && <DragHandle />}
                    {item.starred && <span className="text-warning text-sm">★</span>}
                    <span className="text-sm text-text truncate">{item.review}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => handleToggleStar(item)} className={btnSecondary}>{item.starred ? '★' : '☆'}</button>
                    <button onClick={() => { setEditingReviewId(item.id); setEditReviewValue(item.review || ''); }} className={btnSecondary}>Edit</button>
                    <button onClick={() => handleDeleteReview(item)} className={btnDanger}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <h3 className="text-base font-semibold text-text mb-3">Instruction Options</h3>
        <div className="flex gap-2 mb-4">
          <input
            className={inputCls}
            placeholder="Add instruction option..."
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddInstruction()}
          />
          <button onClick={handleAddInstruction} className={btnPrimary}>+ Add Instruction</button>
        </div>
        <div className="space-y-1">
          {instructionItems.length === 0 && <p className="text-sm text-text-muted py-2">No instruction options yet</p>}
          {instructionItems.map((item) => (
            <div
              key={`instruction-${item.id}`}
              className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-surface-alt group transition-colors"
              draggable={!item.starred}
              onDragStart={!item.starred ? () => instructionDrag.onDragStart(item.id) : undefined}
              onDragOver={!item.starred ? (e) => instructionDrag.onDragOver(e, item.id) : undefined}
              onDrop={!item.starred ? (e) => instructionDrag.onDrop(e, instructionItems, instructionItems) : undefined}
              onDragEnd={instructionDrag.onDragEnd}
            >
              {editingInstructionId === item.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    className={inputCls}
                    value={editInstructionValue}
                    onChange={(e) => setEditInstructionValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveInstructionEdit(item.id)}
                  />
                  <button onClick={() => handleSaveInstructionEdit(item.id)} className={btnSecondary}>Save</button>
                  <button onClick={() => { setEditingInstructionId(null); setEditInstructionValue(''); }} className={btnSecondary}>Cancel</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 min-w-0">
                    {!item.starred && <DragHandle />}
                    {item.starred && <span className="text-warning text-sm">★</span>}
                    <span className="text-sm text-text truncate">{item.instruction}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => handleToggleStar(item)} className={btnSecondary}>{item.starred ? '★' : '☆'}</button>
                    <button onClick={() => { setEditingInstructionId(item.id); setEditInstructionValue(item.instruction || ''); }} className={btnSecondary}>Edit</button>
                    <button onClick={() => handleDeleteInstruction(item)} className={btnDanger}>Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────
// SHARED
// ────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-primary-100 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
