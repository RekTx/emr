'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { deleteCertificate, getCertificates } from '@/lib/firestore';
import { Certificate } from '@/lib/types';

function formatDate(value: unknown): string {
  if (!value) return '-';
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeTimestamp = value as { toDate: () => Date };
    return maybeTimestamp.toDate().toLocaleString();
  }
  return '-';
}

export default function CertificatesPage() {
  const [items, setItems] = useState<Certificate[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    getCertificates()
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.createdByName.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleDelete = async (item: Certificate) => {
    const shouldDelete = window.confirm(`Delete certificate "${item.title}"?`);
    if (!shouldDelete) return;

    setDeletingId(item.id);
    try {
      await deleteCertificate(item.id);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      console.error('Failed to delete certificate', err);
      alert('Failed to delete certificate. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <ProtectedRoute requiredRole={1}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text">Certificates</h1>
          <p className="text-sm text-text-muted mt-0.5">Saved custom letterhead certificates for viewing and reprint.</p>
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, content, or created by..."
            className="w-full h-11 px-4 rounded-xl border border-border bg-white text-sm placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-primary-100 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-surface-alt to-white border-b border-border">
                    <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider">Title</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider">Created By</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3.5 text-right font-semibold text-text-secondary text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                        No certificates found
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.id} className="hover:bg-primary-50/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-text">{item.title}</td>
                        <td className="px-4 py-3 text-text-secondary">{item.createdByName}</td>
                        <td className="px-4 py-3 text-text-secondary">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/certificates/${item.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary-50 transition-colors"
                            >
                              View / Reprint
                            </Link>
                            <button
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-danger hover:bg-danger-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                              {deletingId === item.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
