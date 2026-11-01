'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useData } from '@/context/DataContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PrescriptionForm from '@/components/PrescriptionForm';
import { Prescription, Patient } from '@/lib/types';

function NewPrescriptionContent() {
  const searchParams = useSearchParams();
  const patientId = searchParams.get('patientId') || '';
  const { getPatient, addPrescription } = useData();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      getPatient(patientId).then((p) => { setPatient(p); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, [patientId, getPatient]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary-100 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-text">Patient Not Found</h2>
        <p className="text-sm text-text-muted mt-2">Cannot create prescription without a valid patient.</p>
        <button onClick={() => router.push('/patients')} className="mt-4 px-4 py-2 rounded bg-primary text-white text-sm font-medium cursor-pointer">Back to Patients</button>
      </div>
    );
  }

  const handleSave = async (data: Omit<Prescription, 'id'>) => {
    await addPrescription(data);
    router.push('/prescriptions');
  };

  const handleSaveAndPrint = async (data: Omit<Prescription, 'id'>) => {
    const rx = await addPrescription(data);
    router.push(`/prescriptions/${rx.id}/print?from=edit`);
  };

  return (
    <PrescriptionForm
      patient={patient}
      onSave={handleSave}
      onSaveAndPrint={handleSaveAndPrint}
      title="New Prescription"
      cancelHref="/patients"
    />
  );
}

export default function NewPrescriptionPage() {
  return (
    <ProtectedRoute requiredRole={1}>
      <Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-100 border-t-primary rounded-full animate-spin" />
        </div>
      }>
        <NewPrescriptionContent />
      </Suspense>
    </ProtectedRoute>
  );
}
