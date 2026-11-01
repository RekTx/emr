import type {
  Patient, Prescription, MasterHistory, MasterPersonalComplaint, MasterExamination,
  MasterInvestigation, MasterDiagnosis, MasterManagement,
  MasterDrug, MasterFrequency, MasterUsage, MasterReviewInstruction,
  MasterEyeSide, ReceptionAccount, Certificate, LetterTemplate, DetailItem,
} from './types';
import { sortByStarAndOrder } from './sorting';

// ─── Helpers ───

function todayStr(): string {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function sortStarredByLabel<T extends { starred?: boolean; starredAt?: number; sortOrder?: number | null }>(
  items: T[],
  labelSelector: (item: T) => string,
): T[] {
  return sortByStarAndOrder(items, labelSelector);
}

function normalizeDetails(value: unknown): DetailItem[] {
  let raw: any[] = [];
  if (Array.isArray(value)) {
    raw = value;
  } else if (typeof value === 'string') {
    raw = value.split(';').map((v) => v.trim()).filter(Boolean);
  }
  
  const details = raw.map((item) => {
    if (typeof item === 'string') {
      return { text: item, starred: false };
    }
    if (typeof item === 'object' && item !== null) {
      return {
        text: String(item.text || ''),
        starred: Boolean(item.starred),
        starredAt: typeof item.starredAt === 'number' ? item.starredAt : 0,
      };
    }
    return { text: '', starred: false };
  }).filter((d) => d.text);

  return sortStarredByLabel(details, (item) => item.text);
}

// ─── PATIENTS ───

export async function getPatients(searchTerm?: string): Promise<Patient[]> {
  const url = '/api/patients' + (searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch patients');
  return res.json();
}

export async function getTodayPatients(): Promise<Patient[]> {
  const now = new Date();
  const localDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const res = await fetch(`/api/patients?today=true&date=${localDate}`);
  if (!res.ok) throw new Error('Failed to fetch today\'s patients');
  return res.json();
}

export async function getPatient(id: string): Promise<Patient | null> {
  if (!id) return null;
  const res = await fetch(`/api/patients/${id}`);
  if (!res.ok) throw new Error('Failed to fetch patient');
  return res.json();
}

export async function addPatient(data: Omit<Patient, 'id'>): Promise<Patient> {
  const res = await fetch('/api/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add patient');
  return res.json();
}

export async function getPatientByRegNo(regNo: string): Promise<Patient | null> {
  if (!regNo) return null;
  const res = await fetch(`/api/patients?regNo=${encodeURIComponent(regNo)}`);
  if (!res.ok) throw new Error('Failed to fetch patient by regNo');
  return res.json();
}

export async function updatePatient(id: string, data: Partial<Patient>): Promise<void> {
  const res = await fetch(`/api/patients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update patient');
}

export async function deletePatient(id: string): Promise<void> {
  const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete patient');
}

export async function getNextRegNo(): Promise<string> {
  const res = await fetch('/api/patients/next-regno');
  if (!res.ok) throw new Error('Failed to get next regNo');
  return res.json();
}

export async function searchPatientsDb(searchTerm: string): Promise<Patient[]> {
  return getPatients(searchTerm);
}

// ─── PRESCRIPTIONS ───

export async function getPrescriptions(): Promise<Prescription[]> {
  const res = await fetch('/api/prescriptions');
  if (!res.ok) throw new Error('Failed to fetch prescriptions');
  return res.json();
}

export async function getPrescription(id: string): Promise<Prescription | null> {
  const res = await fetch(`/api/prescriptions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch prescription');
  return res.json();
}

export async function getPrescriptionsByRegNo(regNo: string, excludeId?: string): Promise<Prescription[]> {
  if (!regNo) return [];
  const res = await fetch(`/api/prescriptions?regNo=${encodeURIComponent(regNo)}`);
  if (!res.ok) throw new Error('Failed to fetch prescriptions by regNo');
  const data: Prescription[] = await res.json();
  
  return data
    .filter((p) => p.isActive !== false)
    .filter((p) => (excludeId ? p.id !== excludeId : true));
}

export async function getLatestPrescriptionByRegNo(regNo: string, excludeId?: string): Promise<Prescription | null> {
  const matches = await getPrescriptionsByRegNo(regNo, excludeId);
  return matches.length > 0 ? matches[0] : null;
}

export async function searchPrescriptionsDb(searchTerm: string): Promise<Prescription[]> {
  const url = '/api/prescriptions' + (searchTerm ? `?q=${encodeURIComponent(searchTerm)}` : '');
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to search prescriptions');
  return res.json();
}

export async function addPrescription(data: Omit<Prescription, 'id'>): Promise<Prescription> {
  const res = await fetch('/api/prescriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add prescription');
  return res.json();
}

export async function updatePrescription(id: string, data: Partial<Prescription>): Promise<void> {
  const res = await fetch(`/api/prescriptions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update prescription');
}

export async function softDeletePrescription(id: string): Promise<void> {
  const res = await fetch(`/api/prescriptions/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to soft delete prescription');
}

// ─── CERTIFICATES ───

export async function getCertificates(): Promise<Certificate[]> {
  const res = await fetch('/api/certificates');
  if (!res.ok) throw new Error('Failed to fetch certificates');
  return res.json();
}

export async function getCertificate(id: string): Promise<Certificate | null> {
  const res = await fetch(`/api/certificates/${id}`);
  if (!res.ok) throw new Error('Failed to fetch certificate');
  return res.json();
}

export async function addCertificate(data: Omit<Certificate, 'id'>): Promise<Certificate> {
  const res = await fetch('/api/certificates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add certificate');
  return res.json();
}

export async function updateCertificate(id: string, data: Partial<Certificate>): Promise<void> {
  const res = await fetch(`/api/certificates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update certificate');
}

export async function deleteCertificate(id: string): Promise<void> {
  const res = await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete certificate');
}

// ─── LETTER TEMPLATES ───

export async function getLetterTemplates(): Promise<LetterTemplate[]> {
  const res = await fetch('/api/letter-templates');
  if (!res.ok) throw new Error('Failed to fetch letter templates');
  return res.json();
}

export async function addLetterTemplate(data: Omit<LetterTemplate, 'id'>): Promise<LetterTemplate> {
  const res = await fetch('/api/letter-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add letter template');
  return res.json();
}

// ─── MASTER DATA (generic) ───

type MasterType =
  | 'master_history'
  | 'master_personal_complaints'
  | 'master_examination'
  | 'master_investigation'
  | 'master_diagnosis'
  | 'master_management'
  | 'master_drugs'
  | 'master_frequency'
  | 'master_usages'
  | 'master_review_instructions'
  | 'master_eyeside';

const masterDataCache: Partial<Record<MasterType, unknown[]>> = {};

const MASTER_COLLECTIONS: MasterType[] = [
  'master_history',
  'master_personal_complaints',
  'master_examination',
  'master_investigation',
  'master_diagnosis',
  'master_management',
  'master_drugs',
  'master_frequency',
  'master_usages',
  'master_review_instructions',
  'master_eyeside',
];

function clearSingleMasterCache(collectionName: MasterType) {
  delete masterDataCache[collectionName];
}

export function clearPrescriptionMasterOptionsCache() {
  MASTER_COLLECTIONS.forEach((name) => clearSingleMasterCache(name));
}

export async function preloadPrescriptionMasterOptions(): Promise<void> {
  await Promise.all(MASTER_COLLECTIONS.map((name) => getMasterCollection(name)));
}

export async function getMasterCollection<T>(collectionName: MasterType): Promise<T[]> {
  const cached = masterDataCache[collectionName] as T[] | undefined;
  if (cached) return cached;

  const res = await fetch(`/api/master/${collectionName}`);
  if (!res.ok) throw new Error(`Failed to fetch master collection: ${collectionName}`);
  const data = await res.json();
  masterDataCache[collectionName] = data as unknown[];
  return data;
}

export async function addMasterItem(collectionName: MasterType, data: Record<string, unknown>): Promise<string> {
  const res = await fetch(`/api/master/${collectionName}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to add master item');
  const id = await res.json();
  clearSingleMasterCache(collectionName);
  return id;
}

export async function updateMasterItem(collectionName: MasterType, id: string, data: Record<string, unknown>): Promise<void> {
  const res = await fetch(`/api/master/${collectionName}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update master item');
  clearSingleMasterCache(collectionName);
}

export async function deleteMasterItem(collectionName: MasterType, id: string): Promise<void> {
  const res = await fetch(`/api/master/${collectionName}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete master item');
  clearSingleMasterCache(collectionName);
}

// ─── RECEPTION ACCOUNTS ───

const EMAIL_DOMAIN = '@ophthemr.app';

async function createAuthUserWithPassword(email: string, password: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) throw new Error('Missing Firebase API key');

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const payload = await response.json();
  if (!response.ok || !payload.localId) {
    throw new Error(payload?.error?.message || 'Failed to create auth user');
  }

  return payload.localId as string;
}

export async function getReceptionAccounts(): Promise<ReceptionAccount[]> {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error('Failed to fetch reception accounts');
  return res.json();
}

export async function addReceptionAccount(username: string, password: string, branch: string): Promise<ReceptionAccount> {
  const normalized = username.trim();
  if (!normalized) throw new Error('Username is required');
  if (password.length < 6) throw new Error('Password must be at least 6 characters');

  const email = normalized.includes('@') ? normalized : `${normalized}${EMAIL_DOMAIN}`;
  const uid = 'rec_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uid,
      username: normalized,
      email,
      password,
      role: 2,
      branch,
      active: true,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create reception database profile');
  }

  return {
    uid,
    username: normalized,
    email,
    role: 2,
    branch,
    active: true,
  };
}

export async function updateReceptionUsername(uid: string, username: string): Promise<void> {
  const res = await fetch(`/api/users/${uid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to update reception username');
  }
}

export async function updateUserUsername(uid: string, username: string): Promise<void> {
  return updateReceptionUsername(uid, username);
}

export async function resetReceptionPassword(uid: string, username: string, newPassword: string): Promise<ReceptionAccount> {
  const normalized = username.trim();
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters');

  const res = await fetch(`/api/users/${uid}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: normalized,
      password: newPassword,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to reset password');
  }

  return res.json();
}

export async function deactivateReceptionAccount(uid: string): Promise<void> {
  const res = await fetch(`/api/users/${uid}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to deactivate reception account');
}

// ─── Convenience getters for master data ───

export async function getHistoryOptions(): Promise<MasterHistory[]> {
  const data = await getMasterCollection<Record<string, unknown>>('master_history');
  const normalized = data.map(item => ({
    ...item,
    symptom: String(item.symptom || ''),
    details: normalizeDetails(item.details ?? item.sdetails),
    comments: String(item.comments || ''),
    starred: Boolean(item.starred),
    starredAt: typeof item.starredAt === 'number' ? item.starredAt : 0,
  } as MasterHistory));
  return sortStarredByLabel(normalized, (item) => item.symptom || '');
}

export async function getPersonalComplaintOptions(): Promise<MasterPersonalComplaint[]> {
  const data = await getMasterCollection<Record<string, unknown>>('master_personal_complaints');
  const normalized = data.map(item => ({
    ...item,
    complaint: String(item.complaint || ''),
    starred: Boolean(item.starred),
    starredAt: typeof item.starredAt === 'number' ? item.starredAt : 0,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : null,
  } as MasterPersonalComplaint));
  return sortStarredByLabel(normalized, (item) => item.complaint || '');
}

export async function getExaminationOptions(): Promise<MasterExamination[]> {
  const data = await getMasterCollection<Record<string, unknown>>('master_examination');
  const normalized = data.map(item => ({
    ...item,
    title: String(item.title || ''),
    explanations: normalizeDetails(item.explanations ?? item.explanation),
    starred: Boolean(item.starred),
    starredAt: typeof item.starredAt === 'number' ? item.starredAt : 0,
  } as MasterExamination));
  return sortStarredByLabel(normalized, (item) => item.title || '');
}

const LEGACY_INVESTIGATION_OPTIONS = [
  'VF',
  'FFA',
  'OCT',
  'B Scan',
  'Blood',
  'MRI',
  'CT Scan',
  'Misc',
  'Orbscan/Glallie scan',
  'Biometry',
  'Hepatitis B and C screening test',
];

export async function getInvestigationOptions(): Promise<MasterInvestigation[]> {
  const raw = await getMasterCollection<Record<string, unknown>>('master_investigation');
  const map = new Map<string, MasterInvestigation>();

  raw.forEach((item, index) => {
    const investigation = String(item.investigation ?? item.investig ?? '').trim();
    if (!investigation) return;

    const key = investigation.toLowerCase();
    map.set(key, {
      id: String(item.id ?? `legacy-db-${index}`),
      investigation,
      comments: String(item.comments ?? ''),
      starred: Boolean(item.starred),
      starredAt: typeof item.starredAt === 'number' ? item.starredAt : 0,
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : null,
    });
  });

  LEGACY_INVESTIGATION_OPTIONS.forEach((investigation, index) => {
    const key = investigation.toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        id: `legacy-${index}`,
        investigation,
        comments: '',
        starred: false,
      });
    }
  });

  return sortStarredByLabel(Array.from(map.values()), (item) => item.investigation || '');
}

export async function getDiagnosisOptions(): Promise<MasterDiagnosis[]> {
  const data = await getMasterCollection<Record<string, unknown>>('master_diagnosis');
  const normalized = data.map(item => ({
    ...item,
    disease: String(item.disease || ''),
    details: normalizeDetails(item.details),
    comments: String(item.comments || ''),
    starred: Boolean(item.starred),
    starredAt: typeof item.starredAt === 'number' ? item.starredAt : 0,
  } as MasterDiagnosis));
  return sortStarredByLabel(normalized, (item) => item.disease || '');
}

export async function getManagementOptions(): Promise<MasterManagement[]> {
  const raw = await getMasterCollection<Record<string, unknown>>('master_management');
  const normalized = raw
    .map((item) => {
      const rawProcedure = String(
        item.procedure ??
        item.surgical_managment ??
        item.surgical_management ??
        item.management ??
        ''
      ).trim();
      const id = String(item.id ?? '');

      const details = normalizeDetails(item.details ?? item.sdetails);
      const comments = String(item.comments ?? item.coments ?? '').trim();
      const procedure = rawProcedure || `Untitled Procedure (${id.slice(0, 6) || 'no-id'})`;

      return {
        id,
        procedure,
        details,
        comments,
        starred: Boolean(item.starred),
        starredAt: typeof item.starredAt === 'number' ? item.starredAt : 0,
      } as MasterManagement;
    });

  return sortStarredByLabel(normalized, (item) => item.procedure || '');
}

export async function getDrugOptions(): Promise<MasterDrug[]> {
  const data = await getMasterCollection<MasterDrug>('master_drugs');
  return sortStarredByLabel(data, (item) => item.drugName || '');
}

export async function getFrequencyOptions(): Promise<MasterFrequency[]> {
  const data = await getMasterCollection<MasterFrequency>('master_frequency');
  return sortStarredByLabel(data, (item) => item.frequency || '');
}

export async function getUsageOptions(): Promise<MasterUsage[]> {
  const data = await getMasterCollection<MasterUsage>('master_usages');
  return sortStarredByLabel(data, (item) => item.usage || '');
}

export async function getReviewInstructionOptions(): Promise<MasterReviewInstruction[]> {
  const raw = await getMasterCollection<Record<string, unknown>>('master_review_instructions');
  const normalized = raw.map((item) => ({
    id: String(item.id || ''),
    review: String(item.review || ''),
    instruction: String(item.instruction || ''),
    starred: Boolean(item.starred),
    starredAt: typeof item.starredAt === 'number' ? item.starredAt : 0,
    sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : null,
    reviewSortOrder: typeof item.reviewSortOrder === 'number' ? item.reviewSortOrder : null,
    instructionSortOrder: typeof item.instructionSortOrder === 'number' ? item.instructionSortOrder : null,
  } as MasterReviewInstruction));
  return sortStarredByLabel(normalized, (item) => item.review || item.instruction || '');
}

export async function getEyeSideOptions(): Promise<MasterEyeSide[]> {
  const data = await getMasterCollection<MasterEyeSide>('master_eyeside');
  return sortStarredByLabel(data, (item) => item.eyeSide || '');
}
