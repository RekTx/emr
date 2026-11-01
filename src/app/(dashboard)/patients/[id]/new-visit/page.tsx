'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useData } from '@/context/DataContext';
import { Patient } from '@/lib/types';
import PatientForm, { PatientFormData } from '@/components/PatientForm';

export default function NewVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getPatient, addPatient } = useData();
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatient(id).then((p) => {
      setPatient(p);
      setLoading(false);
    });
  }, [getPatient, id]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-primary-100 border-t-primary rounded-full animate-spin" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!patient) {
    return (
      <ProtectedRoute>
        <div className="text-center py-20">Patient Not Found</div>
      </ProtectedRoute>
    );
  }

  const handleSubmit = async (data: PatientFormData) => {
    if (!data.sex) {
      throw new Error('Gender selection is required');
    }

    await addPatient({
      ...data,
      sex: data.sex,
      regNo: patient.regNo,
    } as Omit<Patient, 'id'>);

    router.push('/patients');
  };

  return (
    <ProtectedRoute>
      <PatientForm
        patient={patient}
        regNo={patient.regNo}
        onSubmit={handleSubmit}
        title={`New Visit — ${patient.name}`}
        isNewVisit
      />
    </ProtectedRoute>
  );
}
