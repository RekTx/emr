'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import PatientForm, { PatientFormData } from '@/components/PatientForm';
import { Patient } from '@/lib/types';

export default function NewPatientPage() {
  const { user } = useAuth();
  const { addPatient, nextRegNo } = useData();
  const router = useRouter();
  const [regNo, setRegNo] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    nextRegNo().then((rn) => { setRegNo(rn); setLoading(false); });
  }, [nextRegNo]);

  const handleSubmit = async (data: PatientFormData) => {
    if (!data.sex) {
      throw new Error('Gender selection is required');
    }

    const patientPayload: Omit<Patient, 'id'> = {
      ...data,
      sex: data.sex,
      regNo,
    };

    await addPatient(patientPayload);
    router.push('/patients');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary-100 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PatientForm
      onSubmit={handleSubmit}
      regNo={regNo}
      title="Register New Patient"
    />
  );
}
