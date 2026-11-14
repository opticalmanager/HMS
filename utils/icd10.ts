/**
 * In-Memory Searchable ICD-10 Clinical Diagnosis Catalog
 * Fast, zero-network-latency search for doctor OPD & IPD consultations.
 */

export interface Icd10Code {
  code: string;
  description: string;
  category: string;
  chapter: string;
}

export const COMMON_ICD10_DATABASE: Icd10Code[] = [
  // Circulatory
  { code: "I10", description: "Essential (primary) hypertension", category: "Hypertension", chapter: "Circulatory" },
  { code: "I20.9", description: "Angina pectoris, unspecified", category: "Ischemic Heart Disease", chapter: "Circulatory" },
  { code: "I21.9", description: "Acute myocardial infarction, unspecified", category: "Ischemic Heart Disease", chapter: "Circulatory" },
  { code: "I50.9", description: "Heart failure, unspecified", category: "Heart Failure", chapter: "Circulatory" },
  { code: "I63.9", description: "Cerebral infarction, unspecified (Stroke)", category: "Cerebrovascular", chapter: "Circulatory" },

  // Endocrine & Metabolic
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications", category: "Diabetes", chapter: "Endocrine" },
  { code: "E11.2", description: "Type 2 diabetes mellitus with renal complications", category: "Diabetes", chapter: "Endocrine" },
  { code: "E11.4", description: "Type 2 diabetes mellitus with neurological complications", category: "Diabetes", chapter: "Endocrine" },
  { code: "E03.9", description: "Hypothyroidism, unspecified", category: "Thyroid", chapter: "Endocrine" },
  { code: "E78.5", description: "Hyperlipidemia, unspecified", category: "Lipid Disorders", chapter: "Endocrine" },
  { code: "E66.9", description: "Obesity, unspecified", category: "Metabolic", chapter: "Endocrine" },

  // Respiratory
  { code: "J00", description: "Acute nasopharyngitis (common cold)", category: "Upper Respiratory", chapter: "Respiratory" },
  { code: "J02.9", description: "Acute pharyngitis, unspecified", category: "Upper Respiratory", chapter: "Respiratory" },
  { code: "J03.9", description: "Acute tonsillitis, unspecified", category: "Upper Respiratory", chapter: "Respiratory" },
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified", category: "Upper Respiratory", chapter: "Respiratory" },
  { code: "J18.9", description: "Pneumonia, unspecified organism", category: "Pneumonia", chapter: "Respiratory" },
  { code: "J20.9", description: "Acute bronchitis, unspecified", category: "Bronchitis", chapter: "Respiratory" },
  { code: "J44.9", description: "Chronic obstructive pulmonary disease (COPD), unspecified", category: "COPD", chapter: "Respiratory" },
  { code: "J45.909", description: "Unspecified asthma, uncomplicated", category: "Asthma", chapter: "Respiratory" },

  // Infectious & Parasitic (Common Indian Subcontinent OPD/IPD)
  { code: "A90", description: "Dengue fever (classical dengue)", category: "Vector-borne", chapter: "Infectious" },
  { code: "A91", description: "Dengue hemorrhagic fever", category: "Vector-borne", chapter: "Infectious" },
  { code: "B54", description: "Unspecified malaria", category: "Vector-borne", chapter: "Infectious" },
  { code: "A01.0", description: "Typhoid fever", category: "Enteric", chapter: "Infectious" },
  { code: "A09", description: "Infectious gastroenteritis and colitis, unspecified", category: "Gastrointestinal", chapter: "Infectious" },
  { code: "A15.0", description: "Tuberculosis of lung", category: "Tuberculosis", chapter: "Infectious" },
  { code: "B34.9", description: "Viral infection, unspecified", category: "Viral", chapter: "Infectious" },

  // Digestive
  { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis", category: "GERD", chapter: "Digestive" },
  { code: "K29.70", description: "Gastritis, unspecified, without bleeding", category: "Gastritis", chapter: "Digestive" },
  { code: "K35.80", description: "Unspecified acute appendicitis", category: "Appendicitis", chapter: "Digestive" },
  { code: "K80.20", description: "Calculus of gallbladder without cholecystitis (Gallstones)", category: "Cholelithiasis", chapter: "Digestive" },
  { code: "K59.00", description: "Constipation, unspecified", category: "Intestinal", chapter: "Digestive" },

  // Genitourinary
  { code: "N39.0", description: "Urinary tract infection, site not specified", category: "UTI", chapter: "Genitourinary" },
  { code: "N20.0", description: "Calculus of kidney (Kidney stones)", category: "Nephrolithiasis", chapter: "Genitourinary" },
  { code: "N18.9", description: "Chronic kidney disease, unspecified", category: "Renal", chapter: "Genitourinary" },

  // Musculoskeletal
  { code: "M54.5", description: "Low back pain", category: "Spine", chapter: "Musculoskeletal" },
  { code: "M54.2", description: "Cervicalgia (Neck pain)", category: "Spine", chapter: "Musculoskeletal" },
  { code: "M17.9", description: "Osteoarthritis of knee, unspecified", category: "Arthritis", chapter: "Musculoskeletal" },
  { code: "M19.90", description: "Unspecified osteoarthritis, unspecified site", category: "Arthritis", chapter: "Musculoskeletal" },

  // Nervous & Mental
  { code: "G43.909", description: "Migraine, unspecified, not intractable", category: "Headache", chapter: "Nervous" },
  { code: "G40.909", description: "Epilepsy, unspecified, not intractable", category: "Seizure", chapter: "Nervous" },
  { code: "F41.1", description: "Generalized anxiety disorder", category: "Anxiety", chapter: "Mental" },
  { code: "F32.9", description: "Major depressive disorder, single episode, unspecified", category: "Depression", chapter: "Mental" },

  // Eye & Ear
  { code: "H26.9", description: "Unspecified cataract", category: "Cataract", chapter: "Sensory" },
  { code: "H10.9", description: "Unspecified conjunctivitis", category: "Conjunctivitis", chapter: "Sensory" },
  { code: "H66.90", description: "Otitis media, unspecified, unspecified ear", category: "Ear Infection", chapter: "Sensory" },

  // Skin
  { code: "L20.9", description: "Atopic dermatitis, unspecified", category: "Dermatitis", chapter: "Integumentary" },
  { code: "L30.9", description: "Dermatitis, unspecified (Eczema)", category: "Dermatitis", chapter: "Integumentary" },
  { code: "L03.90", description: "Cellulitis, unspecified", category: "Skin Infection", chapter: "Integumentary" },

  // General Symptoms
  { code: "R50.9", description: "Fever, unspecified", category: "Symptoms", chapter: "General" },
  { code: "R51", description: "Headache", category: "Symptoms", chapter: "General" },
  { code: "R10.9", description: "Abdominal pain, unspecified", category: "Symptoms", chapter: "General" },
  { code: "R05", description: "Cough", category: "Symptoms", chapter: "General" },
  { code: "R53.83", description: "Other fatigue", category: "Symptoms", chapter: "General" },
];

/**
 * Searches the ICD-10 database matching code, description, or category
 */
export function searchIcd10(query: string, limit: number = 10): Icd10Code[] {
  if (!query || query.trim().length === 0) {
    return COMMON_ICD10_DATABASE.slice(0, limit);
  }

  const clean = query.trim().toLowerCase();
  const matched = COMMON_ICD10_DATABASE.filter((item) => {
    return (
      item.code.toLowerCase().includes(clean) ||
      item.description.toLowerCase().includes(clean) ||
      item.category.toLowerCase().includes(clean)
    );
  });

  return matched.slice(0, limit);
}

/**
 * Direct lookup by exact ICD-10 code
 */
export function getIcd10ByCode(code: string): Icd10Code | undefined {
  if (!code) return undefined;
  const clean = code.trim().toUpperCase();
  return COMMON_ICD10_DATABASE.find((c) => c.code.toUpperCase() === clean);
}
