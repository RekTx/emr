// Auth types
export interface User {
  uid: string;
  username: string;
  role: 1 | 2; // 1 = Doctor/Admin, 2 = Receptionist
  branch?: 'branch-1' | 'branch-2';
}

// Patient types
export interface RefractionRow {
  sph: string;
  cyl: string;
  axis: string;
  va: string;
  add: string;
}

export interface Patient {
  id: string; // Firestore document ID
  regNo: string;
  name: string;
  soDoWo: string; // Father/Husband/Wife name
  visitDate: string;
  age: string;
  sex: 'Male' | 'Female';
  address: string;
  city: string;
  phone: string;
  mobile: string;
  healthCard: string;

  // Muscle Balance Assessment
  eoms: string;
  tropia: string;
  phoria: string;
  iopRight: string;
  iopLeft: string;

  // Previous Refraction
  prevRefractionRE: RefractionRow;
  prevRefractionLE: RefractionRow;
  prevIPD: string;

  // Today's Refraction with BCVA
  todayRefractionRE: RefractionRow;
  todayRefractionLE: RefractionRow;
  todayIPD: string;

  createdAt?: string;
  updatedAt?: string;
}

// Prescription types
export interface HistoryRow {
  eyeSide: string;
  personalComplaints?: string;
  personalComplaintsDetail?: string;
  symptom: string;
  detail: string;
  remarks: string;
  pcheck: boolean;
}

export interface ExaminationRow {
  sign: string;
  rightSign?: string;
  leftSign?: string;
  rightEye: string;
  leftEye: string;
  remarks: string;
  pcheck: boolean;
}

export interface InvestigationRow {
  eyeSide: string;
  type: string;
  type2?: string;
  remarks: string;
  images: string;
  pcheck: boolean;
}

export interface DiagnosisRow {
  eyeSide: string;
  disease: string;
  rightDisease?: string;
  leftDisease?: string;
  details: string;
  rightDetails?: string;
  leftDetails?: string;
  remarks: string;
  pcheck: boolean;
}

export interface SurgicalRow {
  eyeSide: string;
  procedure: string;
  rightProcedure?: string;
  leftProcedure?: string;
  details: string;
  rightDetails?: string;
  leftDetails?: string;
  remarks: string;
  pcheck: boolean;
}

export interface MedicationRow {
  medicineGroup: string;
  medicine: string;
  frequency: string;
  eyeSide: string;
  usage: string;
  remarks: string;
}

export interface Prescription {
  id: string; // Firestore document ID
  patientId: string;
  patientName: string;
  regNo: string;
  visitDate: string;
  isActive: boolean;

  // Patient info (snapshot at time of prescription)
  soDoWo: string;
  age: string;
  sex: string;
  address: string;
  city: string;
  phone: string;
  mobile: string;
  healthCard: string;

  // Muscle Balance
  eoms: string;
  tropia: string;
  phoria: string;
  iopRight: string;
  iopLeft: string;

  // Previous Refraction
  prevRefractionRE: RefractionRow;
  prevRefractionLE: RefractionRow;
  prevIPD: string;

  // Today's Refraction
  todayRefractionRE: RefractionRow;
  todayRefractionLE: RefractionRow;
  todayIPD: string;

  // Clinical Data
  history: HistoryRow[];
  examination: ExaminationRow[];
  investigation: InvestigationRow[];
  diagnosis: DiagnosisRow[];
  surgical: SurgicalRow[];
  medication: MedicationRow[];

  reviewInstructions: string;

  // Print visibility flags
  showPrevRefraction?: boolean;
  showTodayRefraction?: boolean;
  showClinical?: boolean;
  showIOP?: boolean;

  createdAt?: string;
  updatedAt?: string;
}

export interface LetterStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  fontWeight: 400 | 500 | 700;
  italic: boolean;
}

export interface Certificate {
  id: string;
  title: string;
  content: string;
  contentHtml?: string;
  createdByUid: string;
  createdByName: string;
  isActive: boolean;
  style?: LetterStyle;
  createdAt?: string;
  updatedAt?: string;
}

export interface LetterTemplate {
  id: string;
  name: string;
  title?: string;
  content: string;
  contentHtml?: string;
  createdByUid: string;
  createdByName: string;
  isActive: boolean;
  style?: LetterStyle;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Master Data Types ───

export interface DetailItem {
  text: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}


export interface MasterHistory {
  id: string;
  symptom: string;
  details: DetailItem[]; // split from semicolon-separated sdetails
  comments: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface MasterPersonalComplaint {
  id: string;
  complaint: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface MasterExamination {
  id: string;
  title: string;
  explanations: DetailItem[]; // split from semicolon-separated explanation
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface MasterInvestigation {
  id: string;
  investigation: string;
  comments: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface MasterDiagnosis {
  id: string;
  disease: string;
  details: DetailItem[]; // split from semicolon-separated
  comments: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface MasterManagement {
  id: string;
  procedure: string;
  details: DetailItem[]; // split from semicolon-separated
  comments: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface MasterDrug {
  id: string;
  drugType: string;
  drugName: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface MasterFrequency {
  id: string;
  frequency: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface MasterUsage {
  id: string;
  usage: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface MasterReviewInstruction {
  id: string;
  review: string;
  instruction: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
  reviewSortOrder?: number | null;
  instructionSortOrder?: number | null;
}

export interface MasterEyeSide {
  id: string;
  eyeSide: string;
  starred?: boolean;
  starredAt?: number;
  sortOrder?: number | null;
}

export interface ReceptionAccount {
  uid: string;
  username: string;
  email: string;
  role: 2;
  branch?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
