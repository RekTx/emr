'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Patient, RefractionRow } from '@/lib/types';

export default function ViewPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { getPatient, deletePatient } = useData();
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

  const editHref = user?.role === 1 ? `/prescriptions/new?patientId=${patient.id}` : `/patients/${patient.id}/edit`;

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete patient "${patient.name}"?`)) {
      await deletePatient(patient.id);
      router.push('/patients');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">{patient.name}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Patient Profile — <span className="font-mono font-semibold text-primary">{patient.regNo}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/patients"
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors"
          >
            ← Back to Patients
          </Link>
          {(user?.role === 1 || user?.role === 2) && (
            <>
              <Link
                href={editHref}
                className="px-4 py-2 rounded-lg bg-warning text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                ✏️ Edit
              </Link>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
              >
                🗑️ Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Section 1: Basic Information */}
      <ReadOnlySection title="Basic Information" icon={<UserIcon />}>
        <InfoGrid>
          <InfoItem label="Reg No" value={patient.regNo} />
          <InfoItem label="Name" value={patient.name} />
          <InfoItem label="S/O, D/O, W/O" value={patient.soDoWo} />
          <InfoItem label="Visit Date" value={patient.visitDate} />
          <InfoItem label="Age" value={String(patient.age)} />
          <InfoItem label="Gender" value={patient.sex} />
          <InfoItem label="Address" value={patient.address} />
          <InfoItem label="City" value={patient.city} />
          <InfoItem label="Mobile" value={patient.mobile} />
          <InfoItem label="Misc" value={patient.healthCard || 'N/A'} />
        </InfoGrid>
      </ReadOnlySection>

      {/* Section 2: Muscle Balance */}
      <ReadOnlySection title="Muscle Balance Assessment" icon={<AlertIcon />}>
        <InfoGrid>
          <InfoItem label="EOMs / SARE" value={patient.eoms} />
          <InfoItem label="Tropia" value={patient.tropia} />
          <InfoItem label="Phoria" value={patient.phoria} />
          <InfoItem label="IOP Right Eye" value={patient.iopRight} />
          <InfoItem label="IOP Left Eye" value={patient.iopLeft} />
        </InfoGrid>
      </ReadOnlySection>

      {/* Section 3: Previous Refraction */}
      <ReadOnlySection title="Previous Refraction" icon={<GlassesIcon />}>
        <ReadOnlyRefractionTable re={patient.prevRefractionRE} le={patient.prevRefractionLE} />
        <div className="mt-3 text-sm">
          <span className="font-medium text-text-secondary">IPD:</span>{' '}
          <span className="text-text">{patient.prevIPD}</span>
        </div>
      </ReadOnlySection>

      {/* Section 4: Today's Refraction */}
      <ReadOnlySection title="Today's Refraction with BCVA" icon={<EyeIcon />} accent>
        <ReadOnlyRefractionTable re={patient.todayRefractionRE} le={patient.todayRefractionLE} />
        <div className="mt-3 text-sm">
          <span className="font-medium text-text-secondary">IPD:</span>{' '}
          <span className="text-text">{patient.todayIPD}</span>
        </div>
      </ReadOnlySection>
    </div>
  );
}

// Helper Components
function ReadOnlySection({ title, icon, children, accent }: { title: string; icon: React.ReactNode; children: React.ReactNode; accent?: boolean }) {
  return (
    <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className={`px-6 py-4 border-b border-border ${accent ? 'bg-gradient-to-r from-accent/10 to-white' : 'bg-gradient-to-r from-primary-50 to-white'}`}>
        <h2 className={`text-lg font-semibold flex items-center gap-2 ${accent ? 'text-accent-dark' : 'text-primary-dark'}`}>
          {icon} {title}
        </h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{children}</div>;
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm font-medium text-text">{value}</p>
    </div>
  );
}

function ReadOnlyRefractionTable({ re, le }: { re: RefractionRow; le: RefractionRow }) {
  const cols = ['SPH', 'CYL', 'Axis', 'VA', 'Add for Near'];
  const keys: (keyof RefractionRow)[] = ['sph', 'cyl', 'axis', 'va', 'add'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-alt">
            <th className="px-3 py-2.5 text-left font-semibold text-text-secondary w-36">Eye</th>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2.5 text-left font-semibold text-text-secondary">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <td className="px-3 py-2.5 font-medium text-text">Right Eye (RE)</td>
            {keys.map((k) => <td key={k} className="px-3 py-2.5 text-text-secondary">{re[k]}</td>)}
          </tr>
          <tr className="border-t border-border">
            <td className="px-3 py-2.5 font-medium text-text">Left Eye (LE)</td>
            {keys.map((k) => <td key={k} className="px-3 py-2.5 text-text-secondary">{le[k]}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// Icon components
function UserIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
}
function AlertIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
}
function GlassesIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
}
function EyeIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /></svg>;
}
