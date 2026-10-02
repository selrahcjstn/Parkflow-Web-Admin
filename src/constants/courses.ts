export interface CollegeCourseGroup {
  college: string
  courses: string[]
}

export const collegeCourseGroups: CollegeCourseGroup[] = [
  {
    college: 'College of Computer Studies & Information Technology',
    courses: [
      'BS Computer Science (BSCS)',
      'BS Information Technology (BSIT)',
      'BS Information Systems (BSIS)',
      'BS Data Science and Analytics (BSDSA)',
      'Associate in Computer Technology (ACT)'
    ]
  },
  {
    college: 'College of Engineering',
    courses: [
      'BS Civil Engineering (BSCE)',
      'BS Computer Engineering (BSCpE)',
      'BS Electrical Engineering (BSEE)',
      'BS Electronics Engineering (BSECE)',
      'BS Mechanical Engineering (BSME)',
      'BS Industrial Engineering (BSIE)',
      'BS Chemical Engineering (BSChE)',
      'BS Environmental and Sanitary Engineering (BSESE)',
      'BS Geodetic Engineering (BSGE)'
    ]
  },
  {
    college: 'College of Business, Accountancy & Management',
    courses: [
      'BS Accountancy (BSA)',
      'BS Management Accounting (BSMA)',
      'BS Accounting Information Systems (BSAIS)',
      'BSBA - Major in Marketing Management (BSBA-MM)',
      'BSBA - Major in Financial Management (BSBA-FM)',
      'BSBA - Major in Human Resource Management (BSBA-HRM)',
      'BSBA - Major in Operations Management (BSBA-OM)',
      'BS Entrepreneurship (BSEntrep)',
      'BS Hospitality Management (BSHM)',
      'BS Tourism Management (BSTM)',
      'BS Customs Administration (BSCA)',
      'BS Real Estate Management (BSREM)'
    ]
  },
  {
    college: 'College of Arts, Sciences & Humanities',
    courses: [
      'BS Psychology (BSPsych)',
      'BA Psychology (ABPsych)',
      'BA Communication (BAComm)',
      'BA Journalism (BAJourn)',
      'BA Political Science (BAPolSci)',
      'BA English Language Studies (BAELS)',
      'BS Biology (BSBio)',
      'BS Applied Mathematics (BSAM)',
      'BS Chemistry (BSChem)',
      'BS Social Work (BSSW)'
    ]
  },
  {
    college: 'College of Education',
    courses: [
      'Bachelor of Elementary Education (BEEd)',
      'Bachelor of Secondary Education - Major in English (BSEd-Eng)',
      'Bachelor of Secondary Education - Major in Mathematics (BSEd-Math)',
      'Bachelor of Secondary Education - Major in Science (BSEd-Sci)',
      'Bachelor of Secondary Education - Major in Social Studies (BSEd-SS)',
      'Bachelor of Secondary Education - Major in Filipino (BSEd-Fil)',
      'Bachelor of Physical Education (BPEd)',
      'Bachelor of Special Needs Education (BSNEd)',
      'Bachelor of Early Childhood Education (BECEd)'
    ]
  },
  {
    college: 'College of Nursing & Health Sciences',
    courses: [
      'BS Nursing (BSN)',
      'BS Medical Laboratory Science / Medical Technology (BSMLS)',
      'BS Pharmacy (BSPharm)',
      'BS Physical Therapy (BSPT)',
      'BS Radiologic Technology (BSRT)',
      'BS Nutrition and Dietetics (BSND)',
      'BS Respiratory Therapy (BSRTh)'
    ]
  },
  {
    college: 'College of Architecture & Fine Arts',
    courses: [
      'BS Architecture (BSArch)',
      'Bachelor of Fine Arts (BFA)',
      'BS Interior Design (BSID)'
    ]
  },
  {
    college: 'College of Criminology & Security',
    courses: [
      'BS Criminology (BSCrim)',
      'BS Industrial Security Management (BSISM)'
    ]
  }
]

export const ALL_COURSES_LIST: string[] = collegeCourseGroups.flatMap(g => g.courses)

export const COLLEGE_COURSE_OPTIONS: { label: string; value: string }[] = collegeCourseGroups.flatMap(group =>
  group.courses.map(c => ({
    label: `${c} — (${group.college.replace('College of ', '')})`,
    value: c
  }))
)

export const YEAR_LEVEL_OPTIONS = [
  { label: 'Grade 7 (Junior High School)', value: 7 },
  { label: 'Grade 8 (Junior High School)', value: 8 },
  { label: 'Grade 9 (Junior High School)', value: 9 },
  { label: 'Grade 10 (Junior High School)', value: 10 },
  { label: '1st Year (Freshman)', value: 1 },
  { label: '2nd Year (Sophomore)', value: 2 },
  { label: '3rd Year (Junior)', value: 3 },
  { label: '4th Year (Senior)', value: 4 },
  { label: '5th Year (Senior Extended)', value: 5 }
]

export const isJuniorHigh = (yearLevel?: number | string | null): boolean => {
  if (!yearLevel) return false
  const num = Number(yearLevel)
  return num >= 7 && num <= 10
}

/**
 * Valid student number regex supporting:
 * 1. Standard BulSU format: YYYY-NNNNN or YYYY-NNNNNN (e.g. 2024-00001, 2023-10921)
 * 2. 7 to 10 contiguous digits format (e.g. 202600123, 202310921)
 */
export const STUDENT_ID_REGEX = /^(\d{4}-\d{4,6}|\d{7,10})$/

/**
 * Normalizes a course string to the standardized option value.
 * Matches by exact text, acronym, or program name.
 */
export function normalizeCourseName(courseName?: string | null): string {
  if (!courseName) return ''
  const trimmed = courseName.trim()
  if (!trimmed) return ''

  // 1. Direct match (case insensitive)
  for (const group of collegeCourseGroups) {
    for (const course of group.courses) {
      if (course.toLowerCase() === trimmed.toLowerCase()) {
        return course
      }
    }
  }

  // 2. Acronym match (e.g. "BSCS" or "(BSCS)" matches "BS Computer Science (BSCS)")
  const cleanAcronym = trimmed.replace(/[()]/g, '').trim().toLowerCase()
  for (const group of collegeCourseGroups) {
    for (const course of group.courses) {
      const match = course.match(/\(([^)]+)\)/)
      if (match && match[1] && match[1].toLowerCase() === cleanAcronym) {
        return course
      }
    }
  }

  // 3. Prefix match before parentheses (e.g. "BS Computer Science" matches "BS Computer Science (BSCS)")
  for (const group of collegeCourseGroups) {
    for (const course of group.courses) {
      const prefix = course.replace(/\s*\([^)]+\)\s*$/, '').trim().toLowerCase()
      if (prefix === trimmed.toLowerCase()) {
        return course
      }
    }
  }

  return trimmed
}

/**
 * Checks if a course string is non-empty and not in the official predefined list.
 */
export function isCustomCourse(courseName?: string | null): boolean {
  if (!courseName || !courseName.trim()) return false
  const trimmed = courseName.trim()
  return !ALL_COURSES_LIST.some(c => c.toLowerCase() === trimmed.toLowerCase())
}
