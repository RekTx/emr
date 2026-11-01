'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Prescription } from '@/lib/types';

export default function PrescriptionsPage() {
  const { prescriptions, deletePrescription } = useData();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 30;

  const filtered = useMemo(() => {
    if (!search.trim()) return prescriptions;
    const q = search.toLowerCase();
    return prescriptions.filter(
      (p) =>
        p.regNo.toLowerCase().includes(q) ||
        p.patientName.toLowerCase().includes(q) ||
        p.visitDate.includes(q)
    );
  }, [prescriptions, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Delete prescription for "${name}"?`)) {
      await deletePrescription(id);
    }
  };

  return (
    <ProtectedRoute requiredRole={1}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-text">Prescriptions</h1>
          <p className="text-sm text-text-muted mt-0.5">View and manage patient prescriptions</p>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              id="searchPrescriptions"
              type="text"
              placeholder="Search prescriptions by Name, Reg No..."
              value={search}
              onChange={(e) => { 
                setSearch(e.target.value); 
                setCurrentPage(1); 
              }}
              className="w-full h-11 pl-11 pr-4 rounded-xl border border-border bg-white text-sm placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-surface-alt to-white border-b border-border">
                  <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider">Reg No</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider">Patient Name</th>
                  <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider">Visit Date</th>
                  <th className="px-4 py-3.5 text-right font-semibold text-text-secondary text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-text-muted">
                      No prescriptions found
                    </td>
                  </tr>
                ) : (
                  paged.map((p) => (
                    <tr key={p.id} className="hover:bg-primary-50/40 transition-colors">
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-mono font-semibold bg-primary-50 text-primary-dark">{p.regNo}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-text">{p.patientName}</td>
                      <td className="px-4 py-3 text-text-secondary">{p.visitDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/prescriptions/${p.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary-50 transition-colors"
                          >
                            👁 View
                          </Link>
                          <Link
                            href={`/prescriptions/${p.id}/print?from=list`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                          >
                            🖨️ Print
                          </Link>
                          <Link
                            href={`/prescriptions/${p.id}/edit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-warning hover:bg-warning-light transition-colors"
                          >
                            ✏️ Edit
                          </Link>
                          <button
                            onClick={() => handleDelete(p.id, p.patientName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger hover:bg-danger-light transition-colors cursor-pointer"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-alt">
            <p className="text-sm text-text-muted">
              Showing <span className="font-medium text-text">{paged.length}</span> of{' '}
              <span className="font-medium text-text">{filtered.length}</span> prescriptions
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-text-secondary hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    page === currentPage
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:bg-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-text-secondary hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
