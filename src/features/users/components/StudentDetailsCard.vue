<script setup lang="ts">
import { computed } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  studentNumber: string
  yearLevel: number
  course: string
  section: string
  clientIdError?: string | null
  courseError?: string | null
  sectionError?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:studentNumber', val: string): void
  (e: 'update:yearLevel', val: number): void
  (e: 'update:course', val: string): void
  (e: 'update:section', val: string): void
}>()

const isJuniorHigh = computed(() => props.yearLevel >= 7 && props.yearLevel <= 10)

const collegeCourseGroups = [
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

const courseOptions = computed(() => {
  const list: { label: string; value: string }[] = []
  collegeCourseGroups.forEach((group) => {
    group.courses.forEach((c) => {
      list.push({ label: `${c} — (${group.college.replace('College of ', '')})`, value: c })
    })
  })
  return list
})

const yearLevelOptions = [
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

function onClientIdInput(val: string | number) {
  const digits = String(val).replace(/\D/g, '').slice(0, 10)
  emit('update:studentNumber', digits)
}

function onSectionInput(val: string | number) {
  const formatted = String(val).replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 10)
  emit('update:section', formatted)
}
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12.5v5c3 3 9 3 12 0v-5"/>
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">3. Student Academic Records</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Institutional student ID, academic level, and section details</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <!-- Client ID / Student Number -->
      <UiInput
        :model-value="studentNumber"
        label="Client ID (Student Number)"
        placeholder="e.g. 202600123"
        :maxlength="10"
        :error="clientIdError || ''"
        hint="7 to 10 digits official student ID number"
        required
        @update:model-value="onClientIdInput"
      />

      <!-- Year / Grade Level -->
      <UiSelect
        :model-value="yearLevel"
        label="Year / Grade Level"
        :options="yearLevelOptions"
        required
        @update:model-value="emit('update:yearLevel', Number($event))"
      />

      <!-- Course / Program (College Only) -->
      <div v-if="!isJuniorHigh" class="md:col-span-2">
        <UiSelect
          :model-value="course"
          label="College Degree Program / Course"
          placeholder="Select College Degree Program"
          :options="courseOptions"
          :error="courseError || ''"
          required
          @update:model-value="emit('update:course', String($event))"
        />
      </div>

      <!-- Section -->
      <div :class="isJuniorHigh ? 'md:col-span-2' : ''">
        <UiInput
          :model-value="section"
          label="Class Section"
          placeholder="e.g. 3A-G1 or 4B"
          :maxlength="10"
          :error="sectionError || ''"
          hint="Assigned academic section code"
          required
          @update:model-value="onSectionInput"
        />
      </div>
    </div>
  </UiCard>
</template>
