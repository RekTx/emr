'use client';

import Link from 'next/link';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import PatientTable from '@/components/PatientTable';

export default function AllPatientsPage() {
  const { user } = useAuth();
  const { patients, deletePatient } = useData();
  const isReception = user?.role === 2;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">All Patients</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Manage and view all registered patients
          </p>
        </div>
        <Link
          href="/patients/new"
          id="addNewPatient"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Add New Patient
        </Link>
      </div>

      <PatientTable patients={patients} onDelete={deletePatient} showRxAction={false} />
    </div>
  );
}
