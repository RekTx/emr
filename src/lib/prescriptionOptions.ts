// Eye side options used across all sections
export const EYE_SIDES = ['Left Eye', 'Right Eye', 'Both Eyes', 'N/A'];

// ──────────────────────────────
// HISTORY — Symptom → Details
// ──────────────────────────────
export const SYMPTOMS = [
  'Blurred Vision',
  'Eye Pain',
  'Redness',
  'Discharge',
  'Itching',
  'Floaters',
  'Photophobia',
];

export const SYMPTOM_DETAILS: Record<string, string[]> = {
  'Blurred Vision': ['Distance vision affected', 'Near vision affected', 'Both distance and near', 'Sudden onset'],
  'Eye Pain': ['Dull aching pain', 'Sharp pain', 'Pain on eye movement', 'Pain with headache'],
  'Redness': ['Diffuse redness', 'Sectoral redness', 'Around cornea (ciliary injection)', 'Subconjunctival hemorrhage'],
  'Discharge': ['Watery discharge', 'Mucopurulent discharge', 'White stringy discharge', 'Sticky lids in morning'],
  'Itching': ['Mild itching', 'Severe itching', 'Seasonal pattern', 'Associated with swelling'],
  'Floaters': ['Few floaters', 'Shower of floaters', 'Associated with flashes', 'Progressive increase'],
  'Photophobia': ['Mild light sensitivity', 'Severe light sensitivity', 'Worse outdoors', 'Associated with tearing'],
};

// ──────────────────────────────
// EXAMINATION — Sign → Details
// ──────────────────────────────
export const SIGNS = [
  'Visual Acuity',
  'Cover Test',
  'Fundus',
  'Slit Lamp',
  'Cornea',
  'Lens',
  'Retina',
];

export const SIGN_DETAILS: Record<string, string[]> = {
  'Visual Acuity': ['6/6', '6/9', '6/12', '6/18', '6/24', '6/36', '6/60', 'CF', 'HM', 'PL', 'NPL'],
  'Cover Test': ['Orthophoria', 'Esophoria', 'Exophoria', 'Esotropia', 'Exotropia', 'Hypertropia'],
  'Fundus': ['Normal disc', 'Disc pallor', 'Cup:Disc ratio increased', 'Macular edema', 'Hemorrhages present', 'Healthy macula'],
  'Slit Lamp': ['Quiet anterior segment', 'Cells in AC', 'Flare in AC', 'KPs present', 'Normal conjunctiva'],
  'Cornea': ['Clear', 'Corneal opacity', 'Corneal ulcer', 'Arcus senilis', 'Endothelial guttae'],
  'Lens': ['Clear', 'NS Grade I', 'NS Grade II', 'NS Grade III', 'PSC', 'Cortical cataract', 'Pseudophakia', 'Aphakia'],
  'Retina': ['Normal retina', 'Lattice degeneration', 'Retinal tear', 'Retinal detachment', 'BRVO', 'CRVO', 'Diabetic changes'],
};

// ──────────────────────────────
// INVESTIGATION
// ──────────────────────────────
export const INVESTIGATION_TYPES = [
  'OCT',
  'Visual Field',
  'Fundus Photo',
  'B-Scan',
  'Topography',
  'ERG',
];

// ──────────────────────────────
// DIAGNOSIS — Disease → Details
// ──────────────────────────────
export const DISEASES = [
  'Myopia',
  'Hyperopia',
  'Astigmatism',
  'Cataract',
  'Glaucoma',
  'Diabetic Retinopathy',
  'Macular Degeneration',
  'Dry Eye',
  'Conjunctivitis',
  'Strabismus',
];

export const DISEASE_DETAILS: Record<string, string[]> = {
  'Myopia': ['Low myopia', 'Moderate myopia', 'High myopia'],
  'Hyperopia': ['Low hyperopia', 'Moderate hyperopia', 'High hyperopia'],
  'Astigmatism': ['With-the-rule', 'Against-the-rule', 'Oblique'],
  'Cataract': ['Nuclear sclerosis', 'Posterior subcapsular', 'Cortical', 'Mature cataract'],
  'Glaucoma': ['Open angle', 'Angle closure', 'Normal tension', 'Suspect'],
  'Diabetic Retinopathy': ['Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'PDR'],
  'Macular Degeneration': ['Dry AMD', 'Wet AMD', 'Geographic atrophy'],
  'Dry Eye': ['Aqueous deficient', 'Evaporative', 'Mixed type'],
  'Conjunctivitis': ['Allergic', 'Bacterial', 'Viral', 'Giant papillary'],
  'Strabismus': ['Esotropia', 'Exotropia', 'Hypertropia', 'Intermittent'],
};

// ──────────────────────────────
// SURGICAL — Procedure → Details
// ──────────────────────────────
export const PROCEDURES = [
  'Phacoemulsification',
  'LASIK',
  'PRK',
  'Trabeculectomy',
  'Vitrectomy',
  'Strabismus Surgery',
  'DCR',
  'Pterygium Excision',
];

export const PROCEDURE_DETAILS: Record<string, string[]> = {
  'Phacoemulsification': ['With PCIOL implant', 'With toric IOL', 'With multifocal IOL'],
  'LASIK': ['Conventional', 'Wavefront-guided', 'Topography-guided'],
  'PRK': ['Standard PRK', 'Trans-epithelial PRK', 'With MMC'],
  'Trabeculectomy': ['With MMC', 'Without MMC', 'Needling revision'],
  'Vitrectomy': ['23G PPV', '25G PPV', 'Combined with cataract surgery'],
  'Strabismus Surgery': ['Recession', 'Resection', 'Combined recession-resection'],
  'DCR': ['External DCR', 'Endoscopic DCR', 'With intubation'],
  'Pterygium Excision': ['With conjunctival autograft', 'With AMG', 'Bare sclera technique'],
};

// ──────────────────────────────
// MEDICATION — Group → Medicines
// ──────────────────────────────
export const MEDICINE_GROUPS = [
  'Antibiotics',
  'Anti-inflammatory',
  'Lubricants',
  'Anti-glaucoma',
  'Mydriatics',
  'Antifungals',
];

export const GROUP_MEDICINES: Record<string, string[]> = {
  'Antibiotics': ['Moxifloxacin 0.5%', 'Tobramycin 0.3%', 'Ofloxacin 0.3%', 'Ciprofloxacin 0.3%'],
  'Anti-inflammatory': ['Prednisolone 1%', 'Dexamethasone 0.1%', 'Nepafenac 0.1%', 'Ketorolac 0.5%'],
  'Lubricants': ['Carboxymethylcellulose 0.5%', 'Hypromellose 0.3%', 'Sodium Hyaluronate 0.1%', 'Polyethylene Glycol'],
  'Anti-glaucoma': ['Timolol 0.5%', 'Latanoprost 0.005%', 'Brimonidine 0.15%', 'Dorzolamide 2%'],
  'Mydriatics': ['Tropicamide 1%', 'Cyclopentolate 1%', 'Atropine 1%', 'Phenylephrine 2.5%'],
  'Antifungals': ['Natamycin 5%', 'Voriconazole 1%', 'Fluconazole 0.2%'],
};

// ──────────────────────────────
// FREQUENCY
// ──────────────────────────────
export const FREQUENCIES = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Four times daily',
  'Every 4 hours',
  'At night',
  'SOS',
];

// ──────────────────────────────
// USAGE
// ──────────────────────────────
export const USAGES = [
  'Eye drops',
  'Eye ointment',
  'Oral',
  'IV',
];

// ──────────────────────────────
// REVIEW & INSTRUCTIONS
// ──────────────────────────────
export const REVIEW_OPTIONS = [
  '1 week',
  '2 weeks',
  '1 month',
  '3 months',
  '6 months',
  '1 year',
  'As needed',
];

export const INSTRUCTION_OPTIONS = [
  'Avoid rubbing eyes',
  'Use sunglasses outdoors',
  'No swimming for 2 weeks',
  'Follow-up as scheduled',
  'Rest eyes frequently',
  'Apply warm compress',
];
