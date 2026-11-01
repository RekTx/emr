'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PatientTable from '@/components/PatientTable';
import { Patient } from '@/lib/types';

export default function TodayPatientsPage() {
  const { getTodayPatients, deletePatient } = useData();
  const [todayPatients, setTodayPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');

  useEffect(() => {
    let active = true;
    const loadTodayPatients = async () => {
      try {
        setLoading(true);
        const data = await getTodayPatients();
        if (!active) return;
        setTodayPatients(data);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadTodayPatients();
    return () => {
      active = false;
    };
  }, [getTodayPatients]);

  const handleDelete = async (id: string) => {
    await deletePatient(id);
    setTodayPatients((prev) => prev.filter((p) => p.id !== id));
  };

  const titleText = useMemo(() => `Patients with visits scheduled for today — ${today}`, [today]);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Today&apos;s Patients</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {titleText.split(' — ')[0]} — <span className="font-medium text-primary">{today}</span>
            </p>
          </div>
          <Link
            href="/patients/new"
            id="addNewPatientToday"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add New Patient
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <div className="w-7 h-7 border-2 border-primary-100 border-t-primary rounded-full animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-text">Loading today&apos;s patients...</h3>
          </div>
        ) : todayPatients.length === 0 ? (
          <div className="bg-white rounded-xl border border-border shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <h3 className="text-lg font-semibold text-text">No patients for today</h3>
            <p className="text-sm text-text-muted mt-1">There are no patients with visits scheduled for today.</p>
          </div>
        ) : (
          <PatientTable patients={todayPatients} onDelete={handleDelete} showSequence showVisitAction={false} />
        )}
      </div>
    </ProtectedRoute>
  );
}
