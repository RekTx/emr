'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import { Patient } from '@/lib/types';
import PatientForm, { PatientFormData } from '@/components/PatientForm';

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getPatient, updatePatient } = useData();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatient(id).then((p) => { setPatient(p); setLoading(false); });
  }, [id, getPatient]);

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
        <p className="text-sm text-text-muted mt-2">The requested patient record does not exist.</p>
        <Link href="/patients" className="inline-flex mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
          Back to Patients
        </Link>
      </div>
    );
  }

  const handleSubmit = async (data: PatientFormData) => {
    if (!data.sex) {
      throw new Error('Gender selection is required');
    }

    await updatePatient(patient.id, {
      ...data,
      sex: data.sex,
    });
    router.push(`/patients/${patient.id}`);
  };

  return (
    <PatientForm
      patient={patient}
      regNo={patient.regNo}
      onSubmit={handleSubmit}
      title={`Edit Patient — ${patient.name}`}
    />
  );
}
