'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import PrescriptionForm from '@/components/PrescriptionForm';
import { Prescription, Patient } from '@/lib/types';

export default function EditPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getPrescription, updatePrescription, getPatient, getPatientByRegNo } = useData();
  const router = useRouter();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPrescription(id).then(async (prescription) => {
      setRx(prescription);
      if (prescription) {
        let p = null;
        if (prescription.patientId) {
          p = await getPatient(prescription.patientId);
        }
        if (!p && prescription.regNo) {
          p = await getPatientByRegNo(prescription.regNo);
        }
        setPatient(p);
      }
      setLoading(false);
    });
  }, [id, getPrescription, getPatient, getPatientByRegNo]);

  if (loading) {
    return (
      <ProtectedRoute requiredRole={1}>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-100 border-t-primary rounded-full animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!rx) {
    return (
      <ProtectedRoute requiredRole={1}>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-text">Prescription Not Found</h2>
          <Link href="/prescriptions" className="inline-flex mt-4 px-4 py-2 rounded bg-primary text-white text-sm font-medium">
            Back to Prescriptions
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  if (!patient) {
    return (
      <ProtectedRoute requiredRole={1}>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-text">Patient Not Found</h2>
          <Link href="/prescriptions" className="inline-flex mt-4 px-4 py-2 rounded bg-primary text-white text-sm font-medium">
            Back to Prescriptions
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  const handleSave = async (data: Omit<Prescription, 'id'>) => {
    await updatePrescription(rx.id, data);
    router.push(`/prescriptions/${rx.id}`);
  };

  const handleSaveAndPrint = async (data: Omit<Prescription, 'id'>) => {
    await updatePrescription(rx.id, data);
    router.push(`/prescriptions/${rx.id}/print?from=edit`);
  };

  return (
    <ProtectedRoute requiredRole={1}>
      <PrescriptionForm
        patient={patient}
        prescription={rx}
        onSave={handleSave}
        onSaveAndPrint={handleSaveAndPrint}
        title={`Edit Prescription — ${rx.patientName}`}
        cancelHref={`/prescriptions/${rx.id}`}
      />
    </ProtectedRoute>
  );
}
