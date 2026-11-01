'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useData } from '@/context/DataContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Prescription, RefractionRow } from '@/lib/types';

export default function ViewPrescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getPrescription } = useData();
  const [rx, setRx] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPrescription(id).then((p) => { setRx(p); setLoading(false); });
  }, [id, getPrescription]);

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
          <Link href="/prescriptions" className="inline-flex mt-4 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">Back</Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requiredRole={1}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">Prescription — {rx.patientName}</h1>
            <p className="text-sm text-text-muted mt-0.5">
              <span className="font-mono font-semibold text-primary">{rx.regNo}</span> · {rx.visitDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/prescriptions" className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors">
              ← Back
            </Link>
            <Link href={`/prescriptions/${rx.id}/print?from=view`} className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity">
              🖨️ Print
            </Link>
            <Link href={`/prescriptions/${rx.id}/edit`} className="px-4 py-2 rounded-lg bg-warning text-white text-sm font-medium hover:opacity-90 transition-opacity">
              ✏️ Edit
            </Link>
          </div>
        </div>

        {/* Patient Info */}
        <Section title="Patient Information">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <Info label="Reg No" value={rx.regNo} />
            <Info label="S/O, D/O, W/O" value={rx.soDoWo} />
            <Info label="Visit Date" value={rx.visitDate} />
            <Info label="Age" value={String(rx.age)} />
            <Info label="Gender" value={rx.sex} />
            <Info label="Address" value={rx.address} />
            <Info label="City" value={rx.city} />
            <Info label="Mobile" value={rx.mobile} />
            <Info label="Misc" value={rx.healthCard || 'N/A'} />
          </div>
        </Section>

        {/* Muscle Balance + IOP */}
        <Section title="Muscle Balance Assessment & IOP">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Info label="EOMs / SARE" value={rx.eoms} />
            <Info label="Tropia" value={rx.tropia} />
            <Info label="Phoria" value={rx.phoria} />
            <Info label="IOP Right" value={rx.iopRight} />
            <Info label="IOP Left" value={rx.iopLeft} />
          </div>
        </Section>

        {/* Previous Refraction */}
        <Section title="Previous Refraction with BCVA">
          <RefTable re={rx.prevRefractionRE} le={rx.prevRefractionLE} />
          <p className="mt-2 text-sm"><span className="font-medium text-text-secondary">IPD:</span> {rx.prevIPD}</p>
        </Section>

        {/* Today's Refraction */}
        <Section title="Today's Refraction with BCVA" accent>
          <RefTable re={rx.todayRefractionRE} le={rx.todayRefractionLE} />
          <p className="mt-2 text-sm"><span className="font-medium text-text-secondary">IPD:</span> {rx.todayIPD}</p>
        </Section>

        {/* History */}
        {rx.history?.length > 0 && (
          <Section title="History">
            <DataTable
              headers={['Eye Side', 'P/C', 'P/C Detail', 'Symptom', 'Detail', 'Remarks', 'Rx✓']}
              rows={rx.history.map((h) => [h.eyeSide, h.personalComplaints || '', h.personalComplaintsDetail || '', h.symptom, h.detail, h.remarks, h.pcheck ? '✅' : '—'])}
            />
          </Section>
        )}

        {/* Examination */}
        {rx.examination?.length > 0 && (
          <Section title="Examination">
            <DataTable
              headers={['Right Sign', 'Right Eye', 'Left Sign', 'Left Eye', 'Remarks', 'Rx✓']}
              rows={rx.examination.map((e) => [e.rightSign || e.sign, e.rightEye, e.leftSign || e.sign, e.leftEye, e.remarks, e.pcheck ? '✅' : '—'])}
            />
          </Section>
        )}

        {/* Investigation */}
        {rx.investigation?.length > 0 && (
          <Section title="Investigation">
            <DataTable
              headers={['Eye Side', 'Type', 'Remarks', 'Images', 'Rx✓']}
              rows={rx.investigation.map((i) => [i.eyeSide, formatInvestigationTypes(i), i.remarks, i.images, i.pcheck ? '✅' : '—'])}
            />
          </Section>
        )}

        {/* Diagnosis */}
        {rx.diagnosis?.length > 0 && (
          <Section title="Diagnosis">
            <DataTable
              headers={['Eye Side', 'Disease', 'Details', 'Remarks', 'Rx✓']}
              rows={rx.diagnosis.map((d) => {
                const summary = formatEyePair(d.rightDisease, d.rightDetails, d.leftDisease, d.leftDetails);
                return [d.eyeSide, d.eyeSide === 'N/A' ? summary.name : d.disease, d.eyeSide === 'N/A' ? summary.details : d.details, d.remarks, d.pcheck ? '✅' : '—'];
              })}
            />
          </Section>
        )}

        {/* Surgical */}
        {rx.surgical?.length > 0 && (
          <Section title="Surgical Management">
            <DataTable
              headers={['Eye Side', 'Procedure', 'Details', 'Remarks', 'Rx✓']}
              rows={rx.surgical.map((s) => {
                const summary = formatEyePair(s.rightProcedure, s.rightDetails, s.leftProcedure, s.leftDetails);
                return [s.eyeSide, s.eyeSide === 'N/A' ? summary.name : s.procedure, s.eyeSide === 'N/A' ? summary.details : s.details, s.remarks, s.pcheck ? '✅' : '—'];
              })}
            />
          </Section>
        )}

        {/* Medication */}
        {rx.medication?.length > 0 && (
          <Section title="Medication">
            <DataTable
              headers={['Medicine Group', 'Medicine', 'Frequency', 'Eye Side', 'Usage', 'Remarks']}
              rows={rx.medication.map((m) => [m.medicineGroup, m.medicine, m.frequency, m.eyeSide, m.usage, m.remarks])}
            />
          </Section>
        )}

        {/* Review */}
        {rx.reviewInstructions && (
          <Section title="Review & Instructions">
            <p className="text-sm text-text whitespace-pre-wrap">{rx.reviewInstructions}</p>
          </Section>
        )}
      </div>
    </ProtectedRoute>
  );
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <div className={`px-6 py-3.5 border-b border-border ${accent ? 'bg-gradient-to-r from-accent/10 to-white' : 'bg-gradient-to-r from-primary-50 to-white'}`}>
        <h2 className={`text-base font-semibold ${accent ? 'text-accent-dark' : 'text-primary-dark'}`}>{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text">{value}</p>
    </div>
  );
}

function RefTable({ re, le }: { re: RefractionRow; le: RefractionRow }) {
  const cols = ['SPH', 'CYL', 'Axis', 'VA', 'Add'];
  const keys: (keyof RefractionRow)[] = ['sph', 'cyl', 'axis', 'va', 'add'];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-alt">
            <th className="px-3 py-2 text-left font-semibold text-text-secondary w-32">Eye</th>
            {cols.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold text-text-secondary">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <td className="px-3 py-2 font-medium">RE</td>
            {keys.map((k) => <td key={k} className="px-3 py-2 text-text-secondary">{re?.[k]}</td>)}
          </tr>
          <tr className="border-t border-border">
            <td className="px-3 py-2 font-medium">LE</td>
            {keys.map((k) => <td key={k} className="px-3 py-2 text-text-secondary">{le?.[k]}</td>)}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-alt">
            {headers.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-text-secondary">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-text-secondary">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatInvestigationTypes(inv: { type?: string; type2?: string }) {
  const parts = [inv.type, inv.type2].filter(Boolean).join(', ');
  if (!parts) return '';
  return parts
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, idx) => `${idx + 1}. ${part}`)
    .join(' ');
}

function formatEyePair(rightName?: string, rightDetails?: string, leftName?: string, leftDetails?: string) {
  const right = formatEyeValue('Right', rightName, rightDetails);
  const left = formatEyeValue('Left', leftName, leftDetails);
  return {
    name: [right.name, left.name].filter(Boolean).join(' | '),
    details: [right.details, left.details].filter(Boolean).join(' | '),
  };
}

function formatEyeValue(label: string, name?: string, details?: string) {
  const cleanName = name?.trim() || '';
  const cleanDetails = details?.trim() || '';
  return {
    name: cleanName ? `${label}: ${cleanName}` : '',
    details: cleanDetails ? `${label}: ${cleanDetails}` : '',
  };
}
