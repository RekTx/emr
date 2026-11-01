'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Patient, Prescription } from '@/lib/types';
import * as fs from '@/lib/firestore';

interface DataContextType {
  patients: Patient[];
  prescriptions: Prescription[];
  loading: boolean;
  error: string | null;
  refreshPatients: () => Promise<void>;
  refreshPrescriptions: () => Promise<void>;
  addPatient: (patient: Omit<Patient, 'id'>) => Promise<Patient>;
  updatePatient: (id: string, data: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  getPatient: (id: string) => Promise<Patient | null>;
  getPatientByRegNo: (regNo: string) => Promise<Patient | null>;
  addPrescription: (prescription: Omit<Prescription, 'id'>) => Promise<Prescription>;
  updatePrescription: (id: string, data: Partial<Prescription>) => Promise<void>;
  deletePrescription: (id: string) => Promise<void>;
  getPrescription: (id: string) => Promise<Prescription | null>;
  nextRegNo: () => Promise<string>;
  searchPatients: (term: string) => Promise<Patient[]>;
  searchPrescriptions: (term: string) => Promise<Prescription[]>;
  getTodayPatients: () => Promise<Patient[]>;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

import { useAuth } from '@/context/AuthContext';

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshPatients = useCallback(async () => {
    try {
      const data = await fs.getPatients();
      setPatients(data);
    } catch (err) {
      console.error('Failed to fetch patients:', err);
      setError('Failed to load patients');
    }
  }, []);

  const refreshPrescriptions = useCallback(async () => {
    try {
      const data = await fs.getPrescriptions();
      setPrescriptions(data);
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err);
      setError('Failed to load prescriptions');
    }
  }, []);

  // Initial load
  useEffect(() => {
    async function load() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      
      const tasks: Promise<any>[] = [refreshPatients()];
      if (user.role === 1) {
        tasks.push(refreshPrescriptions());
        tasks.push(fs.preloadPrescriptionMasterOptions());
      } else {
        setPrescriptions([]);
      }
      
      await Promise.all(tasks);
      setLoading(false);
    }
    load();
  }, [refreshPatients, refreshPrescriptions, user]);

  const addPatient = useCallback(async (data: Omit<Patient, 'id'>): Promise<Patient> => {
    const newPatient = await fs.addPatient(data);
    setPatients((prev) => [newPatient, ...prev]);
    return newPatient;
  }, []);

  const updatePatient = useCallback(async (id: string, data: Partial<Patient>) => {
    await fs.updatePatient(id, data);
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deletePatient = useCallback(async (id: string) => {
    await fs.deletePatient(id);
    setPatients((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getPatient = useCallback(async (id: string): Promise<Patient | null> => {
    // Check local state first
    const local = patients.find((p) => p.id === id);
    if (local) return local;
    return fs.getPatient(id);
  }, [patients]);

  const getPatientByRegNo = useCallback(async (regNo: string): Promise<Patient | null> => {
    const localMatches = patients.filter((p) => p.regNo === regNo);
    if (localMatches.length > 0) {
      localMatches.sort((a, b) => String(b.visitDate || '').localeCompare(String(a.visitDate || '')));
      return localMatches[0];
    }
    return fs.getPatientByRegNo(regNo);
  }, [patients]);

  const addPrescription = useCallback(async (data: Omit<Prescription, 'id'>): Promise<Prescription> => {
    const newPrescription = await fs.addPrescription(data);
    setPrescriptions((prev) => [newPrescription, ...prev]);
    return newPrescription;
  }, []);

  const updatePrescription = useCallback(async (id: string, data: Partial<Prescription>) => {
    await fs.updatePrescription(id, data);
    setPrescriptions((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  const deletePrescription = useCallback(async (id: string) => {
    await fs.softDeletePrescription(id);
    setPrescriptions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getPrescription = useCallback(async (id: string): Promise<Prescription | null> => {
    const local = prescriptions.find((p) => p.id === id);
    if (local) return local;
    return fs.getPrescription(id);
  }, [prescriptions]);

  const nextRegNo = useCallback(async (): Promise<string> => {
    return fs.getNextRegNo();
  }, []);

  const searchPatients = useCallback(async (term: string): Promise<Patient[]> => {
    const q = term.trim().toLowerCase();
    if (!q) return patients;
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
  }, [patients]);

  const searchPrescriptions = useCallback(async (term: string): Promise<Prescription[]> => {
    const q = term.trim().toLowerCase();
    if (!q) return prescriptions;
    return prescriptions.filter((p) =>
      p.regNo?.toLowerCase().includes(q) ||
      p.patientName?.toLowerCase().includes(q) ||
      p.visitDate?.includes(q)
    );
  }, [prescriptions]);

  const getTodayPatients = useCallback(async (): Promise<Patient[]> => {
    return fs.getTodayPatients();
  }, []);

  return (
    <DataContext.Provider
      value={{
        patients,
        prescriptions,
        loading,
        error,
        refreshPatients,
        refreshPrescriptions,
        addPatient,
        updatePatient,
        deletePatient,
        getPatient,
        getPatientByRegNo,
        addPrescription,
        updatePrescription,
        deletePrescription,
        getPrescription,
        nextRegNo,
        searchPatients,
        searchPrescriptions,
        getTodayPatients,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
