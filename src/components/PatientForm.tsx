'use client';

import { useState } from 'react';
import { Patient, RefractionRow } from '@/lib/types';

const defaultRefraction: RefractionRow = {
  sph: '0', cyl: '0', axis: '0', va: '6/6', add: '0',
};

export type PatientSex = '' | 'Male' | 'Female';

export interface PatientFormData {
  name: string;
  soDoWo: string;
  visitDate: string;
  age: string;
  sex: PatientSex;
  address: string;
  city: string;
  phone: string;
  mobile: string;
  healthCard: string;
  eoms: string;
  tropia: string;
  phoria: string;
  iopRight: string;
  iopLeft: string;
  prevRefractionRE: RefractionRow;
  prevRefractionLE: RefractionRow;
  prevIPD: string;
  todayRefractionRE: RefractionRow;
  todayRefractionLE: RefractionRow;
  todayIPD: string;
}

function localDateStr(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function getDefaultForm(patient?: Patient): PatientFormData {
  const today = localDateStr();
  if (patient) {
    return {
      name: patient.name,
      soDoWo: patient.soDoWo,
      visitDate: patient.visitDate,
      age: patient.age,
      sex: patient.sex,
      address: patient.address,
      city: patient.city,
      phone: patient.phone,
      mobile: patient.mobile,
      healthCard: patient.healthCard,
      eoms: patient.eoms,
      tropia: patient.tropia,
      phoria: patient.phoria,
      iopRight: patient.iopRight,
      iopLeft: patient.iopLeft,
      prevRefractionRE: { ...patient.prevRefractionRE },
      prevRefractionLE: { ...patient.prevRefractionLE },
      prevIPD: patient.prevIPD,
      todayRefractionRE: { ...patient.todayRefractionRE },
      todayRefractionLE: { ...patient.todayRefractionLE },
      todayIPD: patient.todayIPD,
    };
  }
  return {
    name: '', soDoWo: '', visitDate: today, age: '', sex: '',
    address: 'N/A', city: '', phone: 'N/A', mobile: 'N/A', healthCard: '',
    eoms: 'WNL', tropia: 'N/A', phoria: 'N/A', iopRight: '18', iopLeft: '18',
    prevRefractionRE: { ...defaultRefraction }, prevRefractionLE: { ...defaultRefraction }, prevIPD: '0',
    todayRefractionRE: { ...defaultRefraction }, todayRefractionLE: { ...defaultRefraction }, todayIPD: '0',
  };
}

interface PatientFormProps {
  patient?: Patient;
  regNo: string;
  onSubmit: (data: PatientFormData) => void | Promise<void>;
  title: string;
  isNewVisit?: boolean;
}

export default function PatientForm({ patient, regNo, onSubmit, title, isNewVisit }: PatientFormProps) {
  const requireSexSelection = !patient && !isNewVisit;

  const getInitialForm = (): PatientFormData => {
    if (isNewVisit && patient) {
      const today = localDateStr();
      return {
        ...getDefaultForm(patient),
        visitDate: today,
        // Carry forward today's refraction as previous
        prevRefractionRE: { ...patient.todayRefractionRE },
        prevRefractionLE: { ...patient.todayRefractionLE },
        prevIPD: patient.todayIPD,
        // Reset today's refraction
        todayRefractionRE: { ...defaultRefraction },
        todayRefractionLE: { ...defaultRefraction },
        todayIPD: '0',
      };
    }
    return getDefaultForm(patient);
  };

  const [form, setForm] = useState<PatientFormData>(getInitialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof PatientFormData>(key: K, value: PatientFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateRefraction = (
    field: 'prevRefractionRE' | 'prevRefractionLE' | 'todayRefractionRE' | 'todayRefractionLE',
    key: keyof RefractionRow,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  };

  const copyPrevToToday = () => {
    setForm((prev) => ({
      ...prev,
      todayRefractionRE: { ...prev.prevRefractionRE },
      todayRefractionLE: { ...prev.prevRefractionLE },
      todayIPD: prev.prevIPD,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (requireSexSelection && !form.sex) {
      alert('Please select gender before saving patient.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text">{title}</h1>
      </div>

      {/* Section 1: Basic Information */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-primary-50 to-white border-b border-border">
          <h2 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            Basic Information
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          <InputField label="Reg No" value={regNo} readOnly id="regNo" />
          <InputField label="Name" value={form.name} onChange={(v) => updateField('name', v)} required id="patientName" />
          <InputField label="S/O, D/O, W/O" value={form.soDoWo} onChange={(v) => updateField('soDoWo', v)} id="soDoWo" />
          <InputField label="Visit Date" type="date" value={form.visitDate} onChange={(v) => updateField('visitDate', v)} id="visitDate" />
          <InputField label="Age" value={form.age} onChange={(v) => updateField('age', v)} id="patientAge" />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary" htmlFor="patientSex">Gender</label>
            <select
              id="patientSex"
              value={form.sex}
              onChange={(e) => updateField('sex', e.target.value as PatientSex)}
              required={requireSexSelection}
              className="h-10 px-3 rounded-lg border border-border bg-white text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            >
              {requireSexSelection && <option value="">Please select</option>}
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <InputField label="Address" value={form.address} onChange={(v) => updateField('address', v)} id="address" />
          <InputField label="City" value={form.city} onChange={(v) => updateField('city', v)} id="city" />
          <InputField label="Mobile" value={form.mobile} onChange={(v) => updateField('mobile', v)} id="mobile" />
          <InputField label="Misc" value={form.healthCard} onChange={(v) => updateField('healthCard', v)} id="misc" />
        </div>
      </section>

      {/* Section 2: Muscle Balance Assessment */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-primary-50 to-white border-b border-border">
          <h2 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            Muscle Balance Assessment
          </h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          <InputField label="EOMs / SARE" value={form.eoms} onChange={(v) => updateField('eoms', v)} id="eoms" />
          <InputField label="Tropia" value={form.tropia} onChange={(v) => updateField('tropia', v)} id="tropia" />
          <InputField label="Phoria" value={form.phoria} onChange={(v) => updateField('phoria', v)} id="phoria" />
          <InputField label="IOP Right Eye" value={form.iopRight} onChange={(v) => updateField('iopRight', v)} id="iopRight" />
          <InputField label="IOP Left Eye" value={form.iopLeft} onChange={(v) => updateField('iopLeft', v)} id="iopLeft" />
        </div>
      </section>

      {/* Section 3: Previous Refraction Card */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-primary-50 to-white border-b border-border">
          <h2 className="text-lg font-semibold text-primary-dark flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            Previous Refraction Card
          </h2>
        </div>
        <div className="p-6">
          <RefractionTable
            reLabel="Right Eye (RE)"
            leLabel="Left Eye (LE)"
            reData={form.prevRefractionRE}
            leData={form.prevRefractionLE}
            onREChange={(k, v) => updateRefraction('prevRefractionRE', k, v)}
            onLEChange={(k, v) => updateRefraction('prevRefractionLE', k, v)}
            prefix="prev"
          />
          <div className="mt-4 max-w-xs">
            <InputField label="IPD" value={form.prevIPD} onChange={(v) => updateField('prevIPD', v)} id="prevIPD" />
          </div>
        </div>
      </section>

      {/* Section 4: Today's Refraction Card */}
      <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-accent/10 to-white border-b border-border">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-accent-dark flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /></svg>
              Today&apos;s Refraction Card
            </h2>
            {isNewVisit && (
              <button
                type="button"
                onClick={copyPrevToToday}
                className="px-3 py-1.5 rounded-lg border border-accent/40 text-xs font-medium text-accent-dark hover:bg-accent/10 transition-colors"
              >
                Copy previous to today
              </button>
            )}
          </div>
        </div>
        <div className="p-6">
          <RefractionTable
            reLabel="Right Eye (RE)"
            leLabel="Left Eye (LE)"
            reData={form.todayRefractionRE}
            leData={form.todayRefractionLE}
            onREChange={(k, v) => updateRefraction('todayRefractionRE', k, v)}
            onLEChange={(k, v) => updateRefraction('todayRefractionLE', k, v)}
            prefix="today"
          />
          <div className="mt-4 max-w-xs">
            <InputField label="IPD" value={form.todayIPD} onChange={(v) => updateField('todayIPD', v)} id="todayIPD" />
          </div>
        </div>
      </section>

      {/* Submit */}
      <div className="flex justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          id="savePatient"
          disabled={isSubmitting}
          className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-medium shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none min-w-[140px]"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Patient'
          )}
        </button>
      </div>
    </form>
  );
}

function InputField({
  label, value, onChange, type = 'text', readOnly, required, id,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; readOnly?: boolean; required?: boolean; id?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-text-secondary" htmlFor={id}>
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        required={required}
        className={`h-10 px-3 rounded-lg border text-sm transition-colors
          ${readOnly
            ? 'border-border-dark bg-surface-alt text-text-muted cursor-not-allowed'
            : 'border-border bg-white hover:border-border-dark focus:border-primary focus:ring-2 focus:ring-primary/20'
          }`}
      />
    </div>
  );
}

function RefractionTable({
  reLabel, leLabel, reData, leData,
  onREChange, onLEChange, prefix,
}: {
  reLabel: string; leLabel: string;
  reData: RefractionRow; leData: RefractionRow;
  onREChange: (k: keyof RefractionRow, v: string) => void;
  onLEChange: (k: keyof RefractionRow, v: string) => void;
  prefix: string;
}) {
  const cols: { key: keyof RefractionRow; label: string }[] = [
    { key: 'sph', label: 'SPH' },
    { key: 'cyl', label: 'CYL' },
    { key: 'axis', label: 'Axis' },
    { key: 'va', label: 'BCVA' },
    { key: 'add', label: 'Addition for Near' },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-alt">
            <th className="px-3 py-2.5 text-left font-semibold text-text-secondary rounded-tl-lg w-36">Eye</th>
            {cols.map((c) => (
              <th key={c.key} className="px-3 py-2.5 text-left font-semibold text-text-secondary">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <td className="px-3 py-2.5 font-medium text-text">{reLabel}</td>
            {cols.map((c) => (
              <td key={c.key} className="px-2 py-2">
                <input
                  id={`${prefix}RE_${c.key}`}
                  value={reData[c.key]}
                  onChange={(e) => onREChange(c.key, e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="px-3 py-2.5 font-medium text-text">{leLabel}</td>
            {cols.map((c) => (
              <td key={c.key} className="px-2 py-2">
                <input
                  id={`${prefix}LE_${c.key}`}
                  value={leData[c.key]}
                  onChange={(e) => onLEChange(c.key, e.target.value)}
                  className="w-full h-9 px-2.5 rounded-md border border-border text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
