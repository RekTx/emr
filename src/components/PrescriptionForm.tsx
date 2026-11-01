'use client';

import Link from 'next/link';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Patient, Prescription, RefractionRow, HistoryRow, ExaminationRow, InvestigationRow, DiagnosisRow, SurgicalRow, MedicationRow } from '@/lib/types';
import MultiSelect from '@/components/MultiSelect';
import { useData } from '@/context/DataContext';
import * as firestore from '@/lib/firestore';
import { PatientFormData } from '@/components/PatientForm';
import { sortByStarAndOrder } from '@/lib/sorting';

// Shared input class for less-rounded, practical styling
const inputCls = 'h-9 px-2.5 rounded border border-border bg-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors w-full';
const selectCls = 'h-9 px-2 rounded border border-border bg-white text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors w-full cursor-pointer';
const sectionHeaderCls = 'px-4 py-3 bg-gray-50 border-b border-border flex items-center justify-between rounded-t';
const sectionTitleCls = 'text-sm font-semibold text-primary-dark';

function createPatientDraft(patient: Patient): PatientFormData {
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

function clonePatientDraft(draft: PatientFormData): PatientFormData {
  return {
    ...draft,
    prevRefractionRE: { ...draft.prevRefractionRE },
    prevRefractionLE: { ...draft.prevRefractionLE },
    todayRefractionRE: { ...draft.todayRefractionRE },
    todayRefractionLE: { ...draft.todayRefractionLE },
  };
}

function patientDraftsEqual(a: PatientFormData, b: PatientFormData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function splitListValue(text?: string): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n|;/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitReviewInstructions(text?: string): { review: string[]; instructions: string[] } {
  if (!text?.trim()) return { review: [], instructions: [] };
  const parts = text.split(' | ');
  return {
    review: splitListValue(parts[0]?.replace('Review: ', '')),
    instructions: splitListValue(parts[1]?.replace('Instructions: ', '')),
  };
}

function joinReviewInstructions(review: string[], instructions: string[]): string {
  const reviewText = review.map((item) => item.trim()).filter(Boolean).join('\n');
  const instructionText = instructions.map((item) => item.trim()).filter(Boolean).join('\n');

  return [
    reviewText ? `Review: ${reviewText}` : '',
    instructionText ? `Instructions: ${instructionText}` : '',
  ].filter(Boolean).join(' | ');
}

function cloneRows<T extends object>(rows: T[] | undefined): T[] {
  return (rows || []).map((row) => ({ ...row }));
}

interface PrescriptionFormProps {
  patient: Patient;
  prescription?: Prescription; // if editing
  onSave: (data: Omit<Prescription, 'id'>) => void | Promise<void>;
  onSaveAndPrint: (data: Omit<Prescription, 'id'>) => void | Promise<void>;
  title: string;
  cancelHref?: string;
}

export default function PrescriptionForm({ patient, prescription, onSave, onSaveAndPrint, title, cancelHref }: PrescriptionFormProps) {
  const { updatePatient } = useData();
  const router = useRouter();
  // ─── Master data from Firestore ───
  const [EYE_SIDES, setEyeSides] = useState<string[]>(['Left Eye', 'Right Eye', 'Both Eyes', 'N/A']);
  const [SYMPTOMS, setSymptoms] = useState<string[]>([]);
  const [SYMPTOM_DETAILS, setSymptomDetails] = useState<Record<string, string[]>>({});
  const [PERSONAL_COMPLAINTS, setPersonalComplaints] = useState<string[]>([]);
  const [SIGNS, setSigns] = useState<string[]>([]);
  const [SIGN_DETAILS, setSignDetails] = useState<Record<string, string[]>>({});
  const [INVESTIGATION_TYPES, setInvestigationTypes] = useState<string[]>([]);
  const [DISEASES, setDiseases] = useState<string[]>([]);
  const [DISEASE_DETAILS, setDiseaseDetails] = useState<Record<string, string[]>>({});
  const [PROCEDURES, setProcedures] = useState<string[]>([]);
  const [PROCEDURE_DETAILS, setProcedureDetails] = useState<Record<string, string[]>>({});
  const [MEDICINE_GROUPS, setMedicineGroups] = useState<string[]>([]);
  const [GROUP_MEDICINES, setGroupMedicines] = useState<Record<string, string[]>>({});
  const [FREQUENCIES, setFrequencies] = useState<string[]>([]);
  const [USAGES, setUsages] = useState<string[]>([]);
  const [REVIEW_OPTIONS, setReviewOptions] = useState<string[]>([]);
  const [INSTRUCTION_OPTIONS, setInstructionOptions] = useState<string[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingAndPrinting, setIsSavingAndPrinting] = useState(false);
  const [patientDraft, setPatientDraft] = useState<PatientFormData>(() => createPatientDraft(patient));
  const initialPatientDraftRef = useRef<PatientFormData>(createPatientDraft(patient));

  useEffect(() => {
    async function loadMasterData() {
      try {
        // Eye sides
        const eyeData = await firestore.getEyeSideOptions();
        if (eyeData.length > 0) {
          const sorted = sortByStarAndOrder(eyeData, e => e.eyeSide).map(e => e.eyeSide);
          setEyeSides([...new Set(sorted)].filter(Boolean));
        }

        // History (symptoms + details)
        const histData = await firestore.getHistoryOptions();
        const sortedHist = sortByStarAndOrder(histData, h => h.symptom);
        const symptomOptions = [...new Set(sortedHist.map(h => h.symptom))].filter(Boolean);
        setSymptoms(symptomOptions);
        
        const symMap: Record<string, string[]> = {};
        sortedHist.forEach(h => {
          if (!symMap[h.symptom]) symMap[h.symptom] = [];
          // Sort details within the symptom
          const sortedDetails = sortByStarAndOrder(h.details || [], d => d.text);
          symMap[h.symptom].push(...sortedDetails.map(d => d.text));
        });
        // Deduplicate while preserving order
        Object.keys(symMap).forEach(k => { symMap[k] = [...new Set(symMap[k])]; });
        setSymptomDetails(symMap);

        // Personal complaints (P/C)
        const pcData = await firestore.getPersonalComplaintOptions();
        const sortedPc = sortByStarAndOrder(pcData, p => p.complaint);
        const pcOptions = [...new Set(sortedPc.map(p => p.complaint))].filter(Boolean);
        setPersonalComplaints(pcOptions.length > 0 ? pcOptions : symptomOptions);

        // Examination (signs + details)
        const examData = await firestore.getExaminationOptions();
        const sortedExam = sortByStarAndOrder(examData, e => e.title);
        setSigns([...new Set(sortedExam.map(e => e.title))].filter(Boolean));
        
        const signMap: Record<string, string[]> = {};
        sortedExam.forEach(e => {
          if (!signMap[e.title]) signMap[e.title] = [];
          const sortedExpl = sortByStarAndOrder(e.explanations || [], d => d.text);
          signMap[e.title].push(...sortedExpl.map(d => d.text));
        });
        Object.keys(signMap).forEach(k => { signMap[k] = [...new Set(signMap[k])]; });
        setSignDetails(signMap);

        // Investigation
        const invData = await firestore.getInvestigationOptions();
        setInvestigationTypes([...new Set(sortByStarAndOrder(invData, i => i.investigation).map(i => i.investigation))].filter(Boolean));

        // Diagnosis (diseases + details)
        const diagData = await firestore.getDiagnosisOptions();
        const sortedDiag = sortByStarAndOrder(diagData, d => d.disease);
        setDiseases([...new Set(sortedDiag.map(d => d.disease))].filter(Boolean));
        
        const diseaseMap: Record<string, string[]> = {};
        sortedDiag.forEach(d => {
          if (!diseaseMap[d.disease]) diseaseMap[d.disease] = [];
          const sortedDet = sortByStarAndOrder(d.details || [], det => det.text);
          diseaseMap[d.disease].push(...sortedDet.map(det => det.text));
        });
        Object.keys(diseaseMap).forEach(k => { diseaseMap[k] = [...new Set(diseaseMap[k])]; });
        setDiseaseDetails(diseaseMap);

        // Management (procedures + details)
        const mgmtData = await firestore.getManagementOptions();
        const sortedMgmt = sortByStarAndOrder(mgmtData, m => m.procedure);
        setProcedures([...new Set(sortedMgmt.map(m => m.procedure))].filter(Boolean));
        
        const procMap: Record<string, string[]> = {};
        sortedMgmt.forEach(m => {
          if (!procMap[m.procedure]) procMap[m.procedure] = [];
          const sortedDet = sortByStarAndOrder(m.details || [], d => d.text);
          procMap[m.procedure].push(...sortedDet.map(d => d.text));
        });
        Object.keys(procMap).forEach(k => { procMap[k] = [...new Set(procMap[k])]; });
        setProcedureDetails(procMap);

        // Drugs (grouped by drugType)
        const drugData = await firestore.getDrugOptions();
        const sortedDrugs = sortByStarAndOrder(drugData, d => d.drugName);
        
        const groupSet = new Set<string>();
        const grpMeds: Record<string, string[]> = {};
        
        // We want drug types also sorted by order if possible, but drugType is a string field
        // For now, keep alphabetical for types but sort drugs within them
        sortedDrugs.forEach(d => {
          groupSet.add(d.drugType);
          if (!grpMeds[d.drugType]) grpMeds[d.drugType] = [];
          grpMeds[d.drugType].push(d.drugName);
        });
        Object.keys(grpMeds).forEach(k => { grpMeds[k] = [...new Set(grpMeds[k])]; });
        setMedicineGroups([...groupSet].sort());
        setGroupMedicines(grpMeds);

        // Frequency
        const freqData = await firestore.getFrequencyOptions();
        setFrequencies([...new Set(sortByStarAndOrder(freqData, f => f.frequency).map(f => f.frequency))].filter(Boolean));

        // Usages
        const usageData = await firestore.getUsageOptions();
        setUsages([...new Set(sortByStarAndOrder(usageData, u => u.usage).map(u => u.usage))].filter(Boolean));

        // Review & Instructions
        const reviewData = await firestore.getReviewInstructionOptions();
        const sortedReviews = sortByStarAndOrder(
          reviewData
            .filter((r) => Boolean(r.review?.trim()))
            .map((r) => ({ ...r, sortOrder: r.reviewSortOrder ?? r.sortOrder })),
          (r) => r.review || '',
        );
        const sortedInstructions = sortByStarAndOrder(
          reviewData
            .filter((r) => Boolean(r.instruction?.trim()))
            .map((r) => ({ ...r, sortOrder: r.instructionSortOrder ?? r.sortOrder })),
          (r) => r.instruction || '',
        );
        setReviewOptions([...new Set(sortedReviews.map(r => r.review.trim()))].filter(Boolean));
        setInstructionOptions([...new Set(sortedInstructions.map(r => r.instruction.trim()))].filter(Boolean));
      } catch (err) {
        console.error('Failed to load master data:', err);
      }
      setOptionsLoading(false);
    }
    loadMasterData();
  }, []);

  // Toggle sections
  const [showClinical, setShowClinical] = useState(prescription ? (prescription.showClinical ?? false) : false);
  const [showIOP, setShowIOP] = useState(prescription ? (prescription.showIOP ?? false) : true);
  const [showPrevRefraction, setShowPrevRefraction] = useState(prescription ? (prescription.showPrevRefraction ?? false) : false);
  const [showTodayRefraction, setShowTodayRefraction] = useState(prescription ? (prescription.showTodayRefraction ?? false) : true);

  // Section visibility (master checkboxes)
  const [showHistory, setShowHistory] = useState(prescription ? prescription.history.length > 0 : false);
  const [showExamination, setShowExamination] = useState(prescription ? prescription.examination.length > 0 : false);
  const [showInvestigation, setShowInvestigation] = useState(prescription ? prescription.investigation.length > 0 : false);
  const [showDiagnosis, setShowDiagnosis] = useState(prescription ? prescription.diagnosis.length > 0 : true);
  const [showSurgical, setShowSurgical] = useState(prescription ? prescription.surgical.length > 0 : false);
  const [showMedication, setShowMedication] = useState(prescription ? prescription.medication.length > 0 : true);

  // Dynamic sections
  const [history, setHistory] = useState<HistoryRow[]>(prescription?.history?.length ? prescription.history.map(h => ({ ...h })) : []);
  const [examination, setExamination] = useState<ExaminationRow[]>(prescription?.examination?.length ? prescription.examination.map(e => ({ ...e })) : []);
  const [investigation, setInvestigation] = useState<InvestigationRow[]>(prescription?.investigation?.length ? prescription.investigation.map(i => ({ ...i })) : []);
  const [diagnosis, setDiagnosis] = useState<DiagnosisRow[]>(prescription?.diagnosis?.length ? prescription.diagnosis.map(d => ({ ...d })) : (prescription ? [] : [{ eyeSide: 'N/A', disease: '', details: '', remarks: '', pcheck: true }]));
  const [surgical, setSurgical] = useState<SurgicalRow[]>(prescription?.surgical?.length ? prescription.surgical.map(s => ({ ...s })) : []);
  const [medication, setMedication] = useState<MedicationRow[]>(prescription?.medication?.length ? prescription.medication.map(m => ({ ...m })) : (prescription ? [] : [{ medicineGroup: '', medicine: '', frequency: '', eyeSide: 'Both Eyes', usage: '', remarks: '' }]));

  // Review
  const initialReviewInstructions = splitReviewInstructions(prescription?.reviewInstructions);
  const [reviewItems, setReviewItems] = useState<string[]>(initialReviewInstructions.review);
  const [instructionItems, setInstructionItems] = useState<string[]>(initialReviewInstructions.instructions);
  const [reviewDraft, setReviewDraft] = useState('');
  const [instructionDraft, setInstructionDraft] = useState('');

  const [imagePreviewMap, setImagePreviewMap] = useState<Record<number, string[]>>({});
  const [pastPrescriptions, setPastPrescriptions] = useState<Prescription[]>([]);
  const [pastPrescriptionsLoading, setPastPrescriptionsLoading] = useState(false);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>('');
  const autoCopiedLastRxRef = useRef(false);

  useEffect(() => {
    let active = true;

    async function loadPastPrescriptions() {
      if (prescription) {
        setPastPrescriptions([]);
        setPastPrescriptionsLoading(false);
        return;
      }

      try {
        setPastPrescriptionsLoading(true);
        const all = await firestore.getPrescriptionsByRegNo(patient.regNo);
        if (!active) return;
        setPastPrescriptions(all);
        if (all.length > 0) setSelectedPrescriptionId(all[0].id);
      } catch (err) {
        console.error('Failed to load past prescriptions:', err);
        if (active) setPastPrescriptions([]);
      } finally {
        if (active) setPastPrescriptionsLoading(false);
      }
    }

    loadPastPrescriptions();

    return () => {
      active = false;
    };
  }, [patient.regNo, prescription]);

  const selectedPrescription = pastPrescriptions.find(p => p.id === selectedPrescriptionId) ?? null;

  useEffect(() => {
    if (prescription) return;
    if (autoCopiedLastRxRef.current) return;
    if (!selectedPrescription) return;
    autoCopiedLastRxRef.current = true;
    applyLastPrescriptionSection('all');
  }, [prescription, selectedPrescription]);

  const applyLastPrescriptionSection = (
    section: 'all' | 'history' | 'examination' | 'investigation' | 'diagnosis' | 'surgical' | 'medication' | 'review'
  ) => {
    if (!selectedPrescription) return;

    if (section === 'all' || section === 'history') {
      const rows = cloneRows(selectedPrescription.history);
      setHistory(rows);
      setShowHistory(rows.length > 0);
    }

    if (section === 'all' || section === 'examination') {
      const rows = cloneRows(selectedPrescription.examination);
      setExamination(rows);
      setShowExamination(rows.length > 0);
    }

    if (section === 'all' || section === 'investigation') {
      const rows = cloneRows(selectedPrescription.investigation);
      setInvestigation(rows);
      setShowInvestigation(rows.length > 0);
      setImagePreviewMap({});
    }

    if (section === 'all' || section === 'diagnosis') {
      const rows = cloneRows(selectedPrescription.diagnosis);
      setDiagnosis(rows);
      setShowDiagnosis(rows.length > 0);
    }

    if (section === 'all' || section === 'surgical') {
      const rows = cloneRows(selectedPrescription.surgical);
      setSurgical(rows);
      setShowSurgical(rows.length > 0);
    }

    if (section === 'all' || section === 'medication') {
      const rows = cloneRows(selectedPrescription.medication);
      setMedication(rows);
      setShowMedication(rows.length > 0);
    }

    if (section === 'all' || section === 'review') {
      const parsed = splitReviewInstructions(selectedPrescription.reviewInstructions);
      setReviewItems(parsed.review);
      setInstructionItems(parsed.instructions);
    }
  };

  const addReviewItem = (value: string) => {
    const review = value.trim();
    if (!review) return;
    setReviewItems((prev) => [...prev, review]);
    setReviewDraft('');
  };

  const addInstructionItem = (value: string) => {
    const instruction = value.trim();
    if (!instruction) return;
    setInstructionItems((prev) => [...prev, instruction]);
    setInstructionDraft('');
  };

  const buildData = useCallback((): Omit<Prescription, 'id'> => {
    const reviewText = joinReviewInstructions(reviewItems, instructionItems);

    return {
      patientId: patient.id,
      patientName: patientDraft.name,
      regNo: patient.regNo,
      visitDate: patientDraft.visitDate,
      isActive: true,
      soDoWo: patientDraft.soDoWo,
      age: patientDraft.age,
      sex: patientDraft.sex,
      address: patientDraft.address,
      city: patientDraft.city,
      phone: patientDraft.phone,
      mobile: patientDraft.mobile,
      healthCard: patientDraft.healthCard,
      eoms: patientDraft.eoms,
      tropia: patientDraft.tropia,
      phoria: patientDraft.phoria,
      iopRight: patientDraft.iopRight,
      iopLeft: patientDraft.iopLeft,
      prevRefractionRE: patientDraft.prevRefractionRE,
      prevRefractionLE: patientDraft.prevRefractionLE,
      prevIPD: patientDraft.prevIPD,
      todayRefractionRE: patientDraft.todayRefractionRE,
      todayRefractionLE: patientDraft.todayRefractionLE,
      todayIPD: patientDraft.todayIPD,
      history: showHistory ? history.filter(h => h.symptom || h.personalComplaints || h.personalComplaintsDetail) : [],
      examination: showExamination ? examination.filter(e => e.sign || e.rightSign || e.leftSign || e.rightEye || e.leftEye) : [],
      investigation: showInvestigation ? investigation.filter(i => i.type || i.type2) : [],
      diagnosis: showDiagnosis ? diagnosis.filter(d => d.disease || d.rightDisease || d.leftDisease) : [],
      surgical: showSurgical ? surgical.filter(s => s.procedure || s.rightProcedure || s.leftProcedure) : [],
      medication: showMedication ? medication.filter(m => m.medicine) : [],
      reviewInstructions: reviewText,
      showPrevRefraction,
      showTodayRefraction,
      showClinical,
      showIOP,
    };
  }, [patient, patientDraft, history, examination, investigation, diagnosis, surgical, medication, reviewItems, instructionItems, showHistory, showExamination, showInvestigation, showDiagnosis, showSurgical, showMedication, showPrevRefraction, showTodayRefraction, showClinical, showIOP]);

  const updatePatientField = <K extends keyof PatientFormData>(key: K, value: PatientFormData[K]) => {
    setPatientDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updatePatientRefraction = (
    field: 'prevRefractionRE' | 'prevRefractionLE' | 'todayRefractionRE' | 'todayRefractionLE',
    key: keyof RefractionRow,
    value: string
  ) => {
    setPatientDraft((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  };

  const persistPatientChanges = async () => {
    if (patientDraftsEqual(patientDraft, initialPatientDraftRef.current)) return;
    await updatePatient(patient.id, patientDraft as Partial<Patient>);
    initialPatientDraftRef.current = clonePatientDraft(patientDraft);
  };

  // Helper to update a row in any array
  function updateRow<T>(arr: T[], index: number, updates: Partial<T>): T[] {
    return arr.map((item, i) => i === index ? { ...item, ...updates } : item);
  }

    function splitDetailValues(value?: string): string[] {
      if (!value?.trim()) return [];
      return value.split(', ').map((part) => part.trim()).filter(Boolean);
    }

    function buildSideDetailSummary(rightDetails?: string, leftDetails?: string): string {
      const parts: string[] = [];
      if (rightDetails?.trim()) parts.push(`Right: ${rightDetails.trim()}`);
      if (leftDetails?.trim()) parts.push(`Left: ${leftDetails.trim()}`);
      return parts.join(' | ');
    }

  function handleImageUpload(index: number, files: FileList | null) {
    if (!files) return;
    const urls = Array.from(files).map(f => URL.createObjectURL(f));
    setImagePreviewMap(prev => ({ ...prev, [index]: [...(prev[index] || []), ...urls] }));
    const names = Array.from(files).map(f => f.name).join(', ');
    setInvestigation(prev => updateRow(prev, index, { images: prev[index].images ? `${prev[index].images}, ${names}` : names }));
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Page title */}
      <h1 className="text-xl font-bold text-text">{title}</h1>

      {optionsLoading && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg text-sm text-primary">
          <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Loading dropdown options...
        </div>
      )}

      {/* ─── PATIENT INFO BAR ─── */}
      <div className="bg-white border border-border rounded shadow-sm">
        <div className={sectionHeaderCls}>
          <span className={sectionTitleCls}>Patient Information</span>
          <span className="text-xs font-mono font-semibold text-primary bg-primary-50 px-2 py-0.5 rounded">{patient.regNo}</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Field label="Name" value={patientDraft.name} onChange={(v) => updatePatientField('name', v)} />
          <Field label="S/D/W of" value={patientDraft.soDoWo} onChange={(v) => updatePatientField('soDoWo', v)} />
          <Field label="Visit Date" type="date" value={patientDraft.visitDate} onChange={(v) => updatePatientField('visitDate', v)} />
          <Field label="Age" value={patientDraft.age} onChange={(v) => updatePatientField('age', v)} />
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1 block">Gender</label>
            <select
              value={patientDraft.sex}
              onChange={(e) => updatePatientField('sex', e.target.value as 'Male' | 'Female')}
              className={selectCls}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <Field label="City" value={patientDraft.city} onChange={(v) => updatePatientField('city', v)} />
          <Field label="Mobile" value={patientDraft.mobile} onChange={(v) => updatePatientField('mobile', v)} />
          <Field label="Address" value={patientDraft.address} onChange={(v) => updatePatientField('address', v)} />
          <Field label="Misc" value={patientDraft.healthCard} onChange={(v) => updatePatientField('healthCard', v)} />
        </div>
      </div>

      {!prescription && (
        <div className="bg-white border border-border rounded shadow-sm">
          <div className={sectionHeaderCls}>
            <span className={sectionTitleCls}>Previous Prescriptions</span>
            {pastPrescriptions.length > 0 && (
              <span className="text-xs text-text-secondary">
                {pastPrescriptions.length} prescription{pastPrescriptions.length !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {pastPrescriptionsLoading ? (
              <div className="flex items-center gap-2 text-sm text-primary">
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Loading previous prescriptions...
              </div>
            ) : pastPrescriptions.length === 0 ? (
              <p className="text-sm text-text-muted">No previous prescriptions found for this patient.</p>
            ) : (
              <>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-xs font-medium text-text-secondary whitespace-nowrap">Select Prescription:</label>
                  <select
                    value={selectedPrescriptionId}
                    onChange={e => setSelectedPrescriptionId(e.target.value)}
                    className="flex-1 min-w-[200px] h-9 rounded border border-border bg-surface-alt text-xs text-text px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {pastPrescriptions.map((p, idx) => (
                      <option key={p.id} value={p.id}>
                        {idx === 0 ? '🕐 Latest — ' : `#${idx + 1} — `}{p.visitDate || 'No date'}
                        {p.diagnosis?.length ? ` · ${p.diagnosis.map(d => d.disease).filter(Boolean).join(', ')}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPrescription && (
                  <>
                    <p className="text-sm text-text-secondary">
                      Review the selected prescription, then copy complete sections into this new one.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/prescriptions/${selectedPrescription.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded border border-primary/40 text-xs font-medium text-primary hover:bg-primary-50 transition-colors"
                      >
                        View Prescription
                      </Link>
                      <Link
                        href={`/prescriptions/${selectedPrescription.id}/print`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors"
                      >
                        Open Print
                      </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-text-secondary">
                      <div>History: <span className="font-semibold text-text">{selectedPrescription.history?.length || 0}</span></div>
                      <div>Examination: <span className="font-semibold text-text">{selectedPrescription.examination?.length || 0}</span></div>
                      <div>Investigation: <span className="font-semibold text-text">{selectedPrescription.investigation?.length || 0}</span></div>
                      <div>Diagnosis: <span className="font-semibold text-text">{selectedPrescription.diagnosis?.length || 0}</span></div>
                      <div>Surgical: <span className="font-semibold text-text">{selectedPrescription.surgical?.length || 0}</span></div>
                      <div>Medication: <span className="font-semibold text-text">{selectedPrescription.medication?.length || 0}</span></div>
                    </div>
                    <details className="rounded border border-border p-3 bg-surface-alt">
                      <summary className="text-xs font-semibold text-primary-dark cursor-pointer select-none">Preview Selected Prescription</summary>
                      <div className="mt-3 space-y-3 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-text-secondary">
                          <div><span className="font-semibold text-text">Date:</span> {selectedPrescription.visitDate || 'N/A'}</div>
                          <div><span className="font-semibold text-text">IOP:</span> RE {selectedPrescription.iopRight || '-'} | LE {selectedPrescription.iopLeft || '-'}</div>
                          <div><span className="font-semibold text-text">Review:</span> {splitReviewInstructions(selectedPrescription.reviewInstructions).review.join(', ') || 'N/A'}</div>
                          <div><span className="font-semibold text-text">Instructions:</span> {splitReviewInstructions(selectedPrescription.reviewInstructions).instructions.join(', ') || 'N/A'}</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-text-secondary">
                          <PreviewList
                            title="History"
                            items={(selectedPrescription.history || []).map((r) => {
                              const pcPart = r.personalComplaints || '';
                              const pcDetailPart = r.personalComplaintsDetail ? (r.personalComplaints ? ` - ${r.personalComplaintsDetail}` : r.personalComplaintsDetail) : '';
                              const pcText = pcPart || pcDetailPart ? ` P/C: ${pcPart}${pcDetailPart}` : '';
                              const detailText = r.detail ? ` (${r.detail})` : '';
                              return `${r.eyeSide}: ${r.symptom}${pcText}${detailText}`;
                            })}
                          />
                          <PreviewList
                            title="Examination"
                            items={(selectedPrescription.examination || []).map((r) => {
                              const rightSign = r.rightSign || r.sign || 'Right';
                              const leftSign = r.leftSign || r.sign || 'Left';
                              return `${rightSign}: ${r.rightEye} | ${leftSign}: ${r.leftEye}`;
                            })}
                          />
                          <PreviewList
                            title="Investigation"
                            items={(selectedPrescription.investigation || []).map((r) => {
                              const types = [r.type, r.type2].filter(Boolean).join(', ');
                              return `${r.eyeSide}: ${types}`;
                            })}
                          />
                          <PreviewList title="Diagnosis" items={(selectedPrescription.diagnosis || []).map((r) => `${r.eyeSide}: ${r.disease}${r.details ? ` (${r.details})` : ''}`)} />
                          <PreviewList title="Surgical" items={(selectedPrescription.surgical || []).map((r) => `${r.eyeSide}: ${r.procedure}${r.details ? ` (${r.details})` : ''}`)} />
                          <PreviewList title="Medication" items={(selectedPrescription.medication || []).map((r) => `${r.medicine}${r.frequency ? ` | ${r.frequency}` : ''}`)} />
                        </div>
                      </div>
                    </details>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => applyLastPrescriptionSection('all')} className="px-3 py-1.5 rounded bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-colors cursor-pointer">Copy All</button>
                      <button type="button" onClick={() => applyLastPrescriptionSection('history')} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer">Copy History</button>
                      <button type="button" onClick={() => applyLastPrescriptionSection('examination')} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer">Copy Examination</button>
                      <button type="button" onClick={() => applyLastPrescriptionSection('investigation')} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer">Copy Investigation</button>
                      <button type="button" onClick={() => applyLastPrescriptionSection('diagnosis')} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer">Copy Diagnosis</button>
                      <button type="button" onClick={() => applyLastPrescriptionSection('surgical')} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer">Copy Surgical</button>
                      <button type="button" onClick={() => applyLastPrescriptionSection('medication')} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer">Copy Medication</button>
                      <button type="button" onClick={() => applyLastPrescriptionSection('review')} className="px-3 py-1.5 rounded border border-border text-xs font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer">Copy Review/Instruction</button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTION TOGGLES ─── */}
      <div className="bg-white border border-border rounded shadow-sm p-4">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Show / Hide Sections</p>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <ToggleCB label="Clinical Info" checked={showClinical} onChange={setShowClinical} />
          <ToggleCB label="IOP" checked={showIOP} onChange={setShowIOP} />
          <ToggleCB label="Previous Refraction" checked={showPrevRefraction} onChange={setShowPrevRefraction} />
          <ToggleCB label="Today's Refraction" checked={showTodayRefraction} onChange={setShowTodayRefraction} />
        </div>
      </div>

      {/* ─── CLINICAL INFO ─── */}
      {showClinical && (
        <div className="bg-white border border-border rounded shadow-sm">
          <div className={sectionHeaderCls}>
            <span className={sectionTitleCls}>Clinical Info (Muscle Balance Assessment)</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="EOMs" value={patientDraft.eoms} onChange={(v) => updatePatientField('eoms', v)} />
            <Field label="Tropia" value={patientDraft.tropia} onChange={(v) => updatePatientField('tropia', v)} />
            <Field label="Phoria" value={patientDraft.phoria} onChange={(v) => updatePatientField('phoria', v)} />
          </div>
        </div>
      )}

      {/* ─── IOP ─── */}
      {showIOP && (
        <div className="bg-white border border-border rounded shadow-sm">
          <div className={sectionHeaderCls}>
            <span className={sectionTitleCls}>Intraocular Pressure (IOP)</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <Field label="IOP Right Eye" value={patientDraft.iopRight} onChange={(v) => updatePatientField('iopRight', v)} />
            <Field label="IOP Left Eye" value={patientDraft.iopLeft} onChange={(v) => updatePatientField('iopLeft', v)} />
          </div>
        </div>
      )}

      {/* ─── PREVIOUS REFRACTION (read-only) ─── */}
      {showPrevRefraction && (
        <div className="bg-white border border-border rounded shadow-sm">
          <div className={sectionHeaderCls}>
            <span className={sectionTitleCls}>Previous Refraction Card</span>
          </div>
          <div className="p-4 overflow-x-auto">
            <RefractionTable
              re={patientDraft.prevRefractionRE}
              le={patientDraft.prevRefractionLE}
              ipd={patientDraft.prevIPD}
              onREChange={(k, v) => updatePatientRefraction('prevRefractionRE', k, v)}
              onLEChange={(k, v) => updatePatientRefraction('prevRefractionLE', k, v)}
              onIPDChange={(v) => updatePatientField('prevIPD', v)}
            />
          </div>
        </div>
      )}

      {/* ─── TODAY'S REFRACTION (editable) ─── */}
      {showTodayRefraction && (
        <div className="bg-white border border-border rounded shadow-sm">
          <div className={sectionHeaderCls}>
            <span className={sectionTitleCls}>Today&apos;s Refraction Card</span>
          </div>
          <div className="p-4 overflow-x-auto">
            <RefractionTable
              re={patientDraft.todayRefractionRE}
              le={patientDraft.todayRefractionLE}
              ipd={patientDraft.todayIPD}
              onREChange={(k, v) => updatePatientRefraction('todayRefractionRE', k, v)}
              onLEChange={(k, v) => updatePatientRefraction('todayRefractionLE', k, v)}
              onIPDChange={(v) => updatePatientField('todayIPD', v)}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          DYNAMIC TABLE SECTIONS
         ═══════════════════════════════════════ */}

      {/* ─── HISTORY ─── */}
      <DynSection
        title="History"
        enabled={showHistory}
        onToggle={(val) => {
          setShowHistory(val);
          if (val && history.length === 0) {
            setHistory([{ eyeSide: 'Both Eyes', personalComplaints: '', personalComplaintsDetail: '', symptom: '', detail: '', remarks: '', pcheck: true }]);
          }
        }}
        onAdd={() => setHistory(prev => [...prev, { eyeSide: 'Both Eyes', personalComplaints: '', personalComplaintsDetail: '', symptom: '', detail: '', remarks: '', pcheck: true }])}
        count={history.length}
      >
        {history.map((row, i) => (
          <DynRow key={i} onRemove={() => setHistory(prev => prev.filter((_, idx) => idx !== i))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              <MultiSelect
                options={PERSONAL_COMPLAINTS}
                selected={row.personalComplaints ? row.personalComplaints.split(', ').filter(Boolean) : []}
                onChange={vals => setHistory(prev => updateRow(prev, i, { personalComplaints: vals.join(', '), pcheck: true }))}
                placeholder="P / C"
              />
              <input
                placeholder="PC Details"
                value={row.personalComplaintsDetail || ''}
                onChange={e => setHistory(prev => updateRow(prev, i, { personalComplaintsDetail: e.target.value }))}
                className={inputCls}
              />
              <select
                value={row.symptom}
                onChange={e => setHistory(prev => updateRow(prev, i, { symptom: e.target.value, detail: '', pcheck: true }))}
                className={selectCls}
              >
                <option value="">— Symptom —</option>
                {SYMPTOMS.map(s => <option key={s}>{s}</option>)}
              </select>
              <MultiSelect
                options={row.symptom ? (SYMPTOM_DETAILS[row.symptom] || []) : []}
                selected={row.detail ? row.detail.split(', ').filter(Boolean) : []}
                onChange={vals => setHistory(prev => updateRow(prev, i, { detail: vals.join(', '), pcheck: true }))}
                placeholder="Select details..."
                disabled={!row.symptom}
              />
              <input
                placeholder="Remarks"
                value={row.remarks}
                onChange={e => setHistory(prev => updateRow(prev, i, { remarks: e.target.value }))}
                className={inputCls}
              />
              <label className="flex items-center gap-1.5 text-xs h-9">
                <input type="checkbox" checked={row.pcheck} onChange={e => setHistory(prev => updateRow(prev, i, { pcheck: e.target.checked }))} className="accent-primary w-4 h-4" />
                <span>Rx ✓</span>
              </label>
            </div>
          </DynRow>
        ))}
      </DynSection>

      {/* ─── EXAMINATION ─── */}
      <DynSection
        title="Examination"
        enabled={showExamination}
        onToggle={(val) => {
          setShowExamination(val);
          if (val && examination.length === 0) {
            setExamination([{ sign: '', rightSign: '', leftSign: '', rightEye: '', leftEye: '', remarks: '', pcheck: true }]);
          }
        }}
        onAdd={() => setExamination(prev => [...prev, { sign: '', rightSign: '', leftSign: '', rightEye: '', leftEye: '', remarks: '', pcheck: true }])}
        count={examination.length}
      >
        {examination.map((row, i) => (
          <DynRow key={i} onRemove={() => setExamination(prev => prev.filter((_, idx) => idx !== i))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              {(() => {
                const rightSign = row.rightSign || row.sign;
                const leftSign = row.leftSign || row.sign;
                return (
                  <>
                    <select
                      value={rightSign}
                      onChange={e => setExamination(prev => updateRow(prev, i, { rightSign: e.target.value, rightEye: '', pcheck: true }))}
                      className={selectCls}
                    >
                      <option value="">— Right Sign —</option>
                      {SIGNS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <MultiSelect
                      options={rightSign ? (SIGN_DETAILS[rightSign] || []) : []}
                      selected={row.rightEye ? row.rightEye.split(', ').filter(Boolean) : []}
                      onChange={vals => setExamination(prev => updateRow(prev, i, { rightEye: vals.join(', '), pcheck: true }))}
                      placeholder="Right Eye detail..."
                      disabled={!rightSign}
                    />
                    <select
                      value={leftSign}
                      onChange={e => setExamination(prev => updateRow(prev, i, { leftSign: e.target.value, leftEye: '', pcheck: true }))}
                      className={selectCls}
                    >
                      <option value="">— Left Sign —</option>
                      {SIGNS.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <MultiSelect
                      options={leftSign ? (SIGN_DETAILS[leftSign] || []) : []}
                      selected={row.leftEye ? row.leftEye.split(', ').filter(Boolean) : []}
                      onChange={vals => setExamination(prev => updateRow(prev, i, { leftEye: vals.join(', '), pcheck: true }))}
                      placeholder="Left Eye detail..."
                      disabled={!leftSign}
                    />
                  </>
                );
              })()}
              <input
                placeholder="Remarks"
                value={row.remarks}
                onChange={e => setExamination(prev => updateRow(prev, i, { remarks: e.target.value }))}
                className={inputCls}
              />
              <label className="flex items-center gap-1.5 text-xs h-9">
                <input type="checkbox" checked={row.pcheck} onChange={e => setExamination(prev => updateRow(prev, i, { pcheck: e.target.checked }))} className="accent-primary w-4 h-4" />
                <span>Rx ✓</span>
              </label>
            </div>
          </DynRow>
        ))}
      </DynSection>

      {/* ─── INVESTIGATION ─── */}
      <DynSection
        title="Investigation"
        enabled={showInvestigation}
        onToggle={(val) => {
          setShowInvestigation(val);
          if (val && investigation.length === 0) {
            setInvestigation([{ eyeSide: 'Both Eyes', type: '', type2: '', remarks: '', images: '', pcheck: true }]);
          }
        }}
        onAdd={() => setInvestigation(prev => [...prev, { eyeSide: 'Both Eyes', type: '', type2: '', remarks: '', images: '', pcheck: true }])}
        count={investigation.length}
      >
        {investigation.map((row, i) => (
          <DynRow key={i} onRemove={() => { setInvestigation(prev => prev.filter((_, idx) => idx !== i)); }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              <select value={row.eyeSide} onChange={e => setInvestigation(prev => updateRow(prev, i, { eyeSide: e.target.value }))} className={selectCls}>
                {EYE_SIDES.map(s => <option key={s}>{s}</option>)}
              </select>
              <MultiSelect
                options={INVESTIGATION_TYPES}
                selected={[...new Set([...splitDetailValues(row.type), ...splitDetailValues(row.type2)])]}
                onChange={vals => setInvestigation(prev => updateRow(prev, i, { type: vals.join(', '), type2: '', pcheck: true }))}
                placeholder="Select tests..."
              />
              <input
                placeholder="Remarks"
                value={row.remarks}
                onChange={e => setInvestigation(prev => updateRow(prev, i, { remarks: e.target.value }))}
                className={inputCls}
              />
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={e => handleImageUpload(i, e.target.files)}
                  className="text-xs w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-border file:text-xs file:bg-surface-alt file:text-text-secondary file:cursor-pointer"
                />
                {imagePreviewMap[i] && imagePreviewMap[i].length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {imagePreviewMap[i].map((url, j) => (
                      <img key={j} src={url} alt="preview" className="w-8 h-8 object-cover rounded border border-border" />
                    ))}
                  </div>
                )}
              </div>
              <label className="flex items-center gap-1.5 text-xs h-9">
                <input type="checkbox" checked={row.pcheck} onChange={e => setInvestigation(prev => updateRow(prev, i, { pcheck: e.target.checked }))} className="accent-primary w-4 h-4" />
                <span>Rx ✓</span>
              </label>
            </div>
          </DynRow>
        ))}
      </DynSection>

      {/* ─── DIAGNOSIS ─── */}
      <DynSection
        title="Diagnosis"
        enabled={showDiagnosis}
        onToggle={(val) => {
          setShowDiagnosis(val);
          if (val && diagnosis.length === 0) {
            setDiagnosis([{ eyeSide: 'N/A', disease: '', details: '', remarks: '', pcheck: true }]);
          }
        }}
        onAdd={() => setDiagnosis(prev => [...prev, { eyeSide: 'N/A', disease: '', details: '', remarks: '', pcheck: true }])}
        count={diagnosis.length}
      >
        {diagnosis.map((row, i) => {
          const isNaSide = row.eyeSide === 'N/A';
          const rightDisease = row.rightDisease || row.disease;
          const leftDisease = row.leftDisease || row.disease;
          const rightDetails = splitDetailValues(row.rightDetails ?? row.details);
          const leftDetails = splitDetailValues(row.leftDetails ?? row.details);

          return (
            <DynRow key={i} onRemove={() => setDiagnosis(prev => prev.filter((_, idx) => idx !== i))}>
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${isNaSide ? 'lg:grid-cols-7' : 'lg:grid-cols-5'} gap-2`}>
                <select
                  value={row.eyeSide}
                  onChange={e => {
                    const nextEyeSide = e.target.value;
                    setDiagnosis(prev => updateRow(prev, i, {
                      eyeSide: nextEyeSide,
                      disease: nextEyeSide === 'N/A'
                        ? row.disease
                        : (row.disease || row.rightDisease || row.leftDisease || ''),
                      rightDisease: nextEyeSide === 'N/A'
                        ? (row.rightDisease || row.disease)
                        : row.rightDisease,
                      leftDisease: nextEyeSide === 'N/A'
                        ? (row.leftDisease || row.disease)
                        : row.leftDisease,
                      details: nextEyeSide === 'N/A'
                        ? row.details
                        : (row.rightDetails || row.leftDetails || row.details),
                      ...(nextEyeSide === 'N/A'
                        ? {
                            rightDetails: row.rightDetails || row.details,
                            leftDetails: row.leftDetails || row.details,
                          }
                        : {}),
                    }));
                  }}
                  className={selectCls}
                >
                  {EYE_SIDES.map(s => <option key={s}>{s}</option>)}
                </select>
                {isNaSide ? (
                  <select
                    value={rightDisease || ''}
                    onChange={e => setDiagnosis(prev => updateRow(prev, i, { rightDisease: e.target.value, rightDetails: '', pcheck: true }))}
                    className={selectCls}
                  >
                    <option value="">— Right Disease —</option>
                    {DISEASES.map(d => <option key={d}>{d}</option>)}
                  </select>
                ) : (
                  <select
                    value={row.disease}
                    onChange={e => setDiagnosis(prev => updateRow(prev, i, { disease: e.target.value, details: '', rightDisease: '', leftDisease: '', rightDetails: '', leftDetails: '', pcheck: true }))}
                    className={selectCls}
                  >
                    <option value="">— Disease —</option>
                    {DISEASES.map(d => <option key={d}>{d}</option>)}
                  </select>
                )}
                {isNaSide ? (
                  <>
                    <MultiSelect
                      options={rightDisease ? (DISEASE_DETAILS[rightDisease] || []) : []}
                      selected={rightDetails}
                      onChange={vals => {
                        const nextRightDetails = vals.join(', ');
                        setDiagnosis(prev => updateRow(prev, i, {
                          rightDetails: nextRightDetails,
                          details: buildSideDetailSummary(nextRightDetails, row.leftDetails || row.details),
                          pcheck: true,
                        }));
                      }}
                      placeholder="Right eye details..."
                      disabled={!rightDisease}
                    />
                    <select
                      value={leftDisease || ''}
                      onChange={e => setDiagnosis(prev => updateRow(prev, i, { leftDisease: e.target.value, leftDetails: '', pcheck: true }))}
                      className={selectCls}
                    >
                      <option value="">— Left Disease —</option>
                      {DISEASES.map(d => <option key={d}>{d}</option>)}
                    </select>
                    <MultiSelect
                      options={leftDisease ? (DISEASE_DETAILS[leftDisease] || []) : []}
                      selected={leftDetails}
                      onChange={vals => {
                        const nextLeftDetails = vals.join(', ');
                        setDiagnosis(prev => updateRow(prev, i, {
                          leftDetails: nextLeftDetails,
                          details: buildSideDetailSummary(row.rightDetails || row.details, nextLeftDetails),
                          pcheck: true,
                        }));
                      }}
                      placeholder="Left eye details..."
                      disabled={!leftDisease}
                    />
                  </>
                ) : (
                  <MultiSelect
                    options={row.disease ? (DISEASE_DETAILS[row.disease] || []) : []}
                    selected={splitDetailValues(row.details)}
                    onChange={vals => setDiagnosis(prev => updateRow(prev, i, { details: vals.join(', '), pcheck: true }))}
                    placeholder="Select details..."
                    disabled={!row.disease}
                  />
                )}
                <input
                  placeholder="Remarks"
                  value={row.remarks}
                  onChange={e => setDiagnosis(prev => updateRow(prev, i, { remarks: e.target.value }))}
                  className={inputCls}
                />
                <label className="flex items-center gap-1.5 text-xs h-9">
                  <input type="checkbox" checked={row.pcheck} onChange={e => setDiagnosis(prev => updateRow(prev, i, { pcheck: e.target.checked }))} className="accent-primary w-4 h-4" />
                  <span>Rx ✓</span>
                </label>
              </div>
            </DynRow>
          );
        })}
      </DynSection>

      {/* ─── SURGICAL MANAGEMENT ─── */}
      <DynSection
        title="Surgical Management"
        enabled={showSurgical}
        onToggle={(val) => {
          setShowSurgical(val);
          if (val && surgical.length === 0) {
            setSurgical([{ eyeSide: 'N/A', procedure: '', details: '', remarks: '', pcheck: true }]);
          }
        }}
        onAdd={() => setSurgical(prev => [...prev, { eyeSide: 'N/A', procedure: '', details: '', remarks: '', pcheck: true }])}
        count={surgical.length}
      >
        {surgical.map((row, i) => {
          const isNaSide = row.eyeSide === 'N/A';
          const rightProcedure = row.rightProcedure || row.procedure;
          const leftProcedure = row.leftProcedure || row.procedure;
          const rightDetails = splitDetailValues(row.rightDetails ?? row.details);
          const leftDetails = splitDetailValues(row.leftDetails ?? row.details);

          return (
            <DynRow key={i} onRemove={() => setSurgical(prev => prev.filter((_, idx) => idx !== i))}>
              <div className={`grid grid-cols-1 sm:grid-cols-2 ${isNaSide ? 'lg:grid-cols-7' : 'lg:grid-cols-5'} gap-2`}>
                <select
                  value={row.eyeSide}
                  onChange={e => {
                    const nextEyeSide = e.target.value;
                    setSurgical(prev => updateRow(prev, i, {
                      eyeSide: nextEyeSide,
                      procedure: nextEyeSide === 'N/A'
                        ? row.procedure
                        : (row.procedure || row.rightProcedure || row.leftProcedure || ''),
                      rightProcedure: nextEyeSide === 'N/A'
                        ? (row.rightProcedure || row.procedure)
                        : row.rightProcedure,
                      leftProcedure: nextEyeSide === 'N/A'
                        ? (row.leftProcedure || row.procedure)
                        : row.leftProcedure,
                      details: nextEyeSide === 'N/A'
                        ? row.details
                        : (row.rightDetails || row.leftDetails || row.details),
                      ...(nextEyeSide === 'N/A'
                        ? {
                            rightDetails: row.rightDetails || row.details,
                            leftDetails: row.leftDetails || row.details,
                          }
                        : {}),
                    }));
                  }}
                  className={selectCls}
                >
                  {EYE_SIDES.map(s => <option key={s}>{s}</option>)}
                </select>
                {isNaSide ? (
                  <select
                    value={rightProcedure || ''}
                    onChange={e => setSurgical(prev => updateRow(prev, i, { rightProcedure: e.target.value, rightDetails: '', pcheck: true }))}
                    className={selectCls}
                  >
                    <option value="">— Right Procedure —</option>
                    {PROCEDURES.map(p => <option key={p}>{p}</option>)}
                  </select>
                ) : (
                  <select
                    value={row.procedure}
                    onChange={e => setSurgical(prev => updateRow(prev, i, { procedure: e.target.value, details: '', rightProcedure: '', leftProcedure: '', rightDetails: '', leftDetails: '', pcheck: true }))}
                    className={selectCls}
                  >
                    <option value="">— Procedure —</option>
                    {PROCEDURES.map(p => <option key={p}>{p}</option>)}
                  </select>
                )}
                {isNaSide ? (
                  <>
                    <MultiSelect
                      options={rightProcedure ? (PROCEDURE_DETAILS[rightProcedure] || []) : []}
                      selected={rightDetails}
                      onChange={vals => {
                        const nextRightDetails = vals.join(', ');
                        setSurgical(prev => updateRow(prev, i, {
                          rightDetails: nextRightDetails,
                          details: buildSideDetailSummary(nextRightDetails, row.leftDetails || row.details),
                          pcheck: true,
                        }));
                      }}
                      placeholder="Right eye details..."
                      disabled={!rightProcedure}
                    />
                    <select
                      value={leftProcedure || ''}
                      onChange={e => setSurgical(prev => updateRow(prev, i, { leftProcedure: e.target.value, leftDetails: '', pcheck: true }))}
                      className={selectCls}
                    >
                      <option value="">— Left Procedure —</option>
                      {PROCEDURES.map(p => <option key={p}>{p}</option>)}
                    </select>
                    <MultiSelect
                      options={leftProcedure ? (PROCEDURE_DETAILS[leftProcedure] || []) : []}
                      selected={leftDetails}
                      onChange={vals => {
                        const nextLeftDetails = vals.join(', ');
                        setSurgical(prev => updateRow(prev, i, {
                          leftDetails: nextLeftDetails,
                          details: buildSideDetailSummary(row.rightDetails || row.details, nextLeftDetails),
                          pcheck: true,
                        }));
                      }}
                      placeholder="Left eye details..."
                      disabled={!leftProcedure}
                    />
                  </>
                ) : (
                  <MultiSelect
                    options={row.procedure ? (PROCEDURE_DETAILS[row.procedure] || []) : []}
                    selected={splitDetailValues(row.details)}
                    onChange={vals => setSurgical(prev => updateRow(prev, i, { details: vals.join(', '), pcheck: true }))}
                    placeholder="Select details..."
                    disabled={!row.procedure}
                  />
                )}
                <input
                  placeholder="Remarks"
                  value={row.remarks}
                  onChange={e => setSurgical(prev => updateRow(prev, i, { remarks: e.target.value }))}
                  className={inputCls}
                />
                <label className="flex items-center gap-1.5 text-xs h-9">
                  <input type="checkbox" checked={row.pcheck} onChange={e => setSurgical(prev => updateRow(prev, i, { pcheck: e.target.checked }))} className="accent-primary w-4 h-4" />
                  <span>Rx ✓</span>
                </label>
              </div>
            </DynRow>
          );
        })}
      </DynSection>

      {/* ─── MEDICATION ─── */}
      <DynSection
        title="Medication"
        enabled={showMedication}
        onToggle={(val) => {
          setShowMedication(val);
          if (val && medication.length === 0) {
            setMedication([{ medicineGroup: '', medicine: '', frequency: '', eyeSide: 'Both Eyes', usage: '', remarks: '' }]);
          }
        }}
        onAdd={() => setMedication(prev => [...prev, { medicineGroup: '', medicine: '', frequency: '', eyeSide: EYE_SIDES[0] || '', usage: '', remarks: '' }])}
        count={medication.length}
      >
        {medication.map((row, i) => (
          <DynRow key={i} onRemove={() => setMedication(prev => prev.filter((_, idx) => idx !== i))}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
              <select
                value={row.medicineGroup}
                onChange={e => setMedication(prev => updateRow(prev, i, { medicineGroup: e.target.value, medicine: '' }))}
                className={selectCls}
              >
                <option value="">— Group —</option>
                {MEDICINE_GROUPS.map(g => <option key={g}>{g}</option>)}
                <option value="Custom">Custom</option>
              </select>
              {row.medicineGroup === 'Custom' ? (
                <input
                  value={row.medicine}
                  onChange={e => setMedication(prev => updateRow(prev, i, { medicine: e.target.value }))}
                  className={inputCls}
                  placeholder="Type drug name..."
                />
              ) : (
                <select
                  value={row.medicine}
                  onChange={e => setMedication(prev => updateRow(prev, i, { medicine: e.target.value }))}
                  className={selectCls}
                  disabled={!row.medicineGroup}
                >
                  <option value="">— Medicine —</option>
                  {(row.medicineGroup ? GROUP_MEDICINES[row.medicineGroup] || [] : []).map(m => <option key={m}>{m}</option>)}
                </select>
              )}
              <select value={row.frequency} onChange={e => setMedication(prev => updateRow(prev, i, { frequency: e.target.value }))} className={selectCls}>
                <option value="">— Frequency —</option>
                {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
              </select>
              <select value={row.eyeSide} onChange={e => setMedication(prev => updateRow(prev, i, { eyeSide: e.target.value }))} className={selectCls}>
                <option value="">— Dur —</option>
                {EYE_SIDES.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={row.usage} onChange={e => setMedication(prev => updateRow(prev, i, { usage: e.target.value }))} className={selectCls}>
                <option value="">— Usage —</option>
                {USAGES.map(u => <option key={u}>{u}</option>)}
              </select>
              <input
                placeholder="Remarks"
                value={row.remarks}
                onChange={e => setMedication(prev => updateRow(prev, i, { remarks: e.target.value }))}
                className={inputCls}
              />
            </div>
          </DynRow>
        ))}
      </DynSection>

      {/* ─── REVIEW & INSTRUCTIONS ─── */}
      <div className="bg-white border border-border rounded shadow-sm">
        <div className={sectionHeaderCls}>
          <span className={sectionTitleCls}>Review &amp; Instructions</span>
        </div>
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={reviewDraft} onChange={e => setReviewDraft(e.target.value)} className={selectCls}>
                <option value="">— Select Review —</option>
                {REVIEW_OPTIONS.map(r => <option key={r}>{r}</option>)}
              </select>
              <button type="button" onClick={() => addReviewItem(reviewDraft)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium cursor-pointer whitespace-nowrap">Add</button>
            </div>
            <div className="space-y-2">
              {reviewItems.length === 0 ? (
                <p className="text-sm text-text-muted">No review items added</p>
              ) : (
                reviewItems.map((item, idx) => (
                  <div key={`${item}-${idx}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-surface-alt">
                    <span className="text-sm text-text">{item}</span>
                    <button
                      type="button"
                      onClick={() => setReviewItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
        </div>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={instructionDraft} onChange={e => setInstructionDraft(e.target.value)} className={selectCls}>
                <option value="">— Select Instruction —</option>
                {INSTRUCTION_OPTIONS.map(ins => <option key={ins}>{ins}</option>)}
              </select>
              <button type="button" onClick={() => addInstructionItem(instructionDraft)} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium cursor-pointer whitespace-nowrap">Add</button>
            </div>
            <div className="space-y-2">
              {instructionItems.length === 0 ? (
                <p className="text-sm text-text-muted">No instruction items added</p>
              ) : (
                instructionItems.map((item, idx) => (
                  <div key={`${item}-${idx}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-surface-alt">
                    <span className="text-sm text-text">{item}</span>
                    <button
                      type="button"
                      onClick={() => setInstructionItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs font-medium text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── ACTION BUTTONS ─── */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pb-8 pt-2">
        <button
          type="button"
          onClick={() => {
            if (cancelHref) {
              router.push(cancelHref);
              return;
            }
            window.history.back();
          }}
          className="px-5 py-2.5 rounded border border-border text-sm font-medium text-text-secondary hover:bg-surface-alt transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          id="savePrescription"
          disabled={isSaving || isSavingAndPrinting}
          onClick={async () => {
            if (isSaving || isSavingAndPrinting) return;
            setIsSaving(true);
            try {
              await persistPatientChanges();
              await onSave(buildData());
            } catch {
              setIsSaving(false);
            }
          }}
          className="px-6 py-2.5 rounded bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
        >
          {isSaving ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>💾 Save Prescription</>
          )}
        </button>
        <button
          type="button"
          id="saveAndPrint"
          disabled={isSaving || isSavingAndPrinting}
          onClick={async () => {
            if (isSaving || isSavingAndPrinting) return;
            setIsSavingAndPrinting(true);
            try {
              await persistPatientChanges();
              await onSaveAndPrint(buildData());
            } catch {
              setIsSavingAndPrinting(false);
            }
          }}
          className="px-6 py-2.5 rounded bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors cursor-pointer shadow-sm flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
        >
          {isSavingAndPrinting ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Wait...
            </>
          ) : (
            <>💾 Save &amp; Print Prescription</>
          )}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────
   HELPER COMPONENTS
   ────────────────────────────── */

function ToggleCB({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="accent-primary w-4 h-4"
      />
      <span className={checked ? 'text-text font-medium' : 'text-text-secondary'}>{label}</span>
    </label>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs font-medium text-text-secondary mb-1 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className={inputCls} />
    </div>
  );
}

function RefractionTable({
  re, le, ipd, readOnly, onREChange, onLEChange, onIPDChange,
}: {
  re: RefractionRow; le: RefractionRow; ipd: string; readOnly?: boolean;
  onREChange?: (k: keyof RefractionRow, v: string) => void;
  onLEChange?: (k: keyof RefractionRow, v: string) => void;
  onIPDChange?: (v: string) => void;
}) {
  const cols: { key: keyof RefractionRow; label: string }[] = [
    { key: 'sph', label: 'SPH' }, { key: 'cyl', label: 'CYL' }, { key: 'axis', label: 'Axis' },
    { key: 'va', label: 'BCVA' }, { key: 'add', label: 'Addition for Near' },
  ];
  return (
    <div>
      <table className="w-full text-sm border border-border">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-2 py-2 text-left font-semibold text-text-secondary border-r border-border w-24">Eye</th>
            {cols.map(c => <th key={c.key} className="px-2 py-2 text-left font-semibold text-text-secondary border-r border-border">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-border">
            <td className="px-2 py-1.5 font-medium text-text border-r border-border">RE</td>
            {cols.map(c => (
              <td key={c.key} className="px-1 py-1 border-r border-border">
                {readOnly ? <span className="px-1.5 text-text-secondary">{re[c.key]}</span> :
                  <input value={re[c.key]} onChange={e => onREChange?.(c.key, e.target.value)} className="w-full h-8 px-1.5 rounded border border-border text-sm focus:border-primary" />
                }
              </td>
            ))}
          </tr>
          <tr className="border-t border-border">
            <td className="px-2 py-1.5 font-medium text-text border-r border-border">LE</td>
            {cols.map(c => (
              <td key={c.key} className="px-1 py-1 border-r border-border">
                {readOnly ? <span className="px-1.5 text-text-secondary">{le[c.key]}</span> :
                  <input value={le[c.key]} onChange={e => onLEChange?.(c.key, e.target.value)} className="w-full h-8 px-1.5 rounded border border-border text-sm focus:border-primary" />
                }
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs font-medium text-text-secondary">IPD:</span>
        {readOnly ? <span className="text-sm text-text">{ipd}</span> :
          <input value={ipd} onChange={e => onIPDChange?.(e.target.value)} className="h-8 w-20 px-2 rounded border border-border text-sm focus:border-primary" />
        }
      </div>
    </div>
  );
}

function DynSection({
  title, enabled, onToggle, onAdd, count, children,
}: {
  title: string; enabled: boolean; onToggle: (v: boolean) => void;
  onAdd: () => void; count: number; children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-border rounded shadow-sm">
      <div className={sectionHeaderCls}>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={enabled} onChange={e => onToggle(e.target.checked)} className="accent-primary w-4 h-4" />
          <span className={`text-sm font-semibold ${enabled ? 'text-primary-dark' : 'text-text-muted'}`}>{title}</span>
          {count > 0 && enabled && <span className="text-xs bg-primary-50 text-primary-dark rounded-full px-2 py-0.5">{count}</span>}
        </label>
        {enabled && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 px-3 py-1 rounded border border-primary/30 text-xs font-medium text-primary hover:bg-primary-50 transition-colors cursor-pointer"
          >
            ＋ Add Row
          </button>
        )}
      </div>
      {enabled && (
        <div className="p-4 space-y-2">
          {count === 0 ? (
            <p className="text-sm text-text-muted text-center py-3">No entries yet. Click &quot;＋ Add Row&quot; to begin.</p>
          ) : children}
        </div>
      )}
    </div>
  );
}

function DynRow({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="flex gap-2 items-start p-2 bg-surface-alt rounded border border-border/60">
      <div className="flex-1 min-w-0">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        className="mt-1 p-1.5 rounded text-danger hover:bg-danger-light transition-colors cursor-pointer shrink-0"
        title="Remove row"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  const visible = items.filter(Boolean).slice(0, 4);

  return (
    <div className="rounded border border-border bg-white p-2">
      <p className="font-semibold text-text mb-1">{title}</p>
      {visible.length === 0 ? (
        <p className="text-text-muted">No entries</p>
      ) : (
        <div className="space-y-1">
          {visible.map((item, idx) => (
            <p key={`${title}-${idx}`} className="truncate" title={item}>{item}</p>
          ))}
          {items.filter(Boolean).length > visible.length && (
            <p className="text-text-muted">+{items.filter(Boolean).length - visible.length} more</p>
          )}
        </div>
      )}
    </div>
  );
}
