'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Patient } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';

interface PatientTableProps {
  patients: Patient[];
  onDelete: (id: string) => void;
  showSequence?: boolean;
  showVisitAction?: boolean;
  showRxAction?: boolean;
}

export default function PatientTable({
  patients,
  onDelete,
  showSequence = false,
  showVisitAction = true,
  showRxAction = true,
}: PatientTableProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 30;

  const filtered = useMemo(() => {
    if (!search.trim()) return patients;
    const q = search.toLowerCase();
    return patients.filter((p) =>
      p.regNo?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.soDoWo?.toLowerCase().includes(q) ||
      p.visitDate?.includes(q) ||
      String(p.age).includes(q) ||
      p.sex?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.mobile?.includes(q) ||
      p.healthCard?.toLowerCase().includes(q)
    );
  }, [patients, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete patient "${name}"?`)) {
      onDelete(id);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            id="searchPatients"
            type="text"
            placeholder="Search patients by Name, Reg No, Mobile, City..."
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
                {showSequence && <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider w-16">#</th>}
                <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider">Reg No</th>
                <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider">Name</th>
                <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider hidden lg:table-cell">S/D/W of</th>
                <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider">Visit Date</th>
                <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider hidden sm:table-cell">Age</th>
                <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider hidden sm:table-cell">Gender</th>
                <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider hidden xl:table-cell">City</th>
                <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider hidden xl:table-cell">Mobile</th>
                <th className="px-4 py-3.5 text-left font-semibold text-text-secondary text-xs uppercase tracking-wider hidden 2xl:table-cell">Misc</th>
                <th className="px-4 py-3.5 text-right font-semibold text-text-secondary text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={showSequence ? 11 : 10} className="px-4 py-12 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-border-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                      <p>No patients found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-primary-50/40 transition-colors">
                    {showSequence && (
                      <td className="px-4 py-3 text-text-secondary font-semibold">
                        {(currentPage - 1) * perPage + idx + 1}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-mono font-semibold bg-primary-50 text-primary-dark">{p.regNo}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-text">{p.name}</td>
                    <td className="px-4 py-3 text-text-secondary hidden lg:table-cell">{p.soDoWo}</td>
                    <td className="px-4 py-3 text-text-secondary">{p.visitDate}</td>
                    <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">{p.age}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${p.sex === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                        {p.sex}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary hidden xl:table-cell">{p.city}</td>
                    <td className="px-4 py-3 text-text-secondary hidden xl:table-cell">{p.mobile}</td>
                    <td className="px-4 py-3 text-text-secondary hidden 2xl:table-cell">{p.healthCard || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {showVisitAction && (user?.role === 1 || user?.role === 2) && (
                          <Link
                            href={`/patients/${p.id}/new-visit`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-success hover:bg-success-light transition-colors"
                            title="New Visit"
                          >
                            + New Visit
                          </Link>
                        )}
                        {showRxAction && user?.role === 1 && (
                          <Link
                            href={`/prescriptions/new?patientId=${p.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-indigo-700 hover:bg-indigo-50 transition-colors"
                            title="Add Prescription"
                          >
                            + Rx
                          </Link>
                        )}
                        <Link
                          href={`/patients/${p.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-primary hover:bg-primary-50 transition-colors"
                          title="View"
                        >
                          👁
                        </Link>
                        <Link
                          href={`/patients/${p.id}/edit`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-warning hover:bg-warning-light transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </Link>
                        {(user?.role === 1 || user?.role === 2) && (
                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-danger hover:bg-danger-light transition-colors cursor-pointer"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        )}
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
            <span className="font-medium text-text">{filtered.length}</span> patients
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md text-sm font-medium text-text-secondary hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((page) => (
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
  );
}
