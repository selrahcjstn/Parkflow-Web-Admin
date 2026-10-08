<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import type { UserRole } from '../types'
import {
  collegeCourseGroups,
  YEAR_LEVEL_OPTIONS,
  isCustomCourse
} from '@/constants/courses'

defineProps<{
  role: UserRole
  studentNumber: string
  course: string
  section: string
  yearLevel: number
  idCardNumber: string
  department: string
  assignedGate: number
  studentErrors?: {
    studentNumber?: string | null
    course?: string | null
    section?: string | null
  }
}>()

const emit = defineEmits<{
  (e: 'update:role', val: UserRole): void
  (e: 'update:studentNumber', val: string): void
  (e: 'update:course', val: string): void
  (e: 'update:section', val: string): void
  (e: 'update:yearLevel', val: number): void
  (e: 'update:idCardNumber', val: string): void
  (e: 'update:department', val: string): void
  (e: 'update:assignedGate', val: number): void
  (e: 'studentNumberInput', val: string | number): void
}>()

import { computed } from 'vue'
import { isSuperAdminUser } from '@/utils/auth'

const isSuperAdmin = computed(() => isSuperAdminUser())

const roleOptions = computed(() => {
  const options = [
    { label: 'Student', value: 'Student' },
    { label: 'Faculty', value: 'UniversityStaff' },
    { label: 'University Staff', value: 'NonAcademicPersonnel' },
    { label: 'Security Guard', value: 'Guard' }
  ]
  if (isSuperAdmin.value) {
    options.push({ label: 'System Administrator', value: 'Admin' })
  }
  return options
})

const gateOptions = [
  { label: 'Gate 1 — Main Entrance', value: 1 },
  { label: 'Gate 2 — North Entrance', value: 2 },
  { label: 'Gate 3 — South Entrance', value: 3 },
  { label: 'Gate 4 — West Gate', value: 4 },
  { label: 'Gate 5 — East Service Gate', value: 5 }
]
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
          <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">3. Role Classification & Credentials</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Specify institutional account type, academic records, or personnel assignments</p>
      </div>
    </div>

    <!-- Role Selector -->
    <div>
      <UiSelect
        :model-value="role"
        label="User Classification Role"
        :options="roleOptions"
        required
        @update:model-value="emit('update:role', $event as UserRole)"
      />
    </div>

    <!-- Dynamic Student Records -->
    <div v-if="role === 'Student'" class="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 space-y-5">
      <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        Student Academic Records
      </h4>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <!-- Student Number -->
        <UiInput
          :model-value="studentNumber"
          label="Student Number (Client ID)"
          placeholder="e.g. 2024-00001 or 202600123"
          :maxlength="12"
          :error="studentErrors?.studentNumber || ''"
          hint="Format: YYYY-NNNNN or 7-10 digit student ID"
          required
          @update:model-value="emit('studentNumberInput', $event)"
        />

        <!-- Course Dropdown -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Course / Degree Program <span class="text-red-500 font-bold">*</span>
          </label>
          <select
            :value="course"
            class="w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 transition-all cursor-pointer"
            :class="[
              studentErrors?.course
                ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
                : 'border-slate-200 dark:border-slate-700 focus:ring-red-500/20 focus:border-red-500'
            ]"
            required
            @change="emit('update:course', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Select College Degree Program</option>
            <option v-if="isCustomCourse(course)" :value="course">
              {{ course }} (Current)
            </option>
            <optgroup v-for="group in collegeCourseGroups" :key="group.college" :label="group.college">
              <option v-for="c in group.courses" :key="c" :value="c">
                {{ c }}
              </option>
            </optgroup>
          </select>
          <p v-if="studentErrors?.course" class="text-[11.5px] font-medium text-red-500 mt-1">
            {{ studentErrors.course }}
          </p>
        </div>

        <!-- Section -->
        <UiInput
          :model-value="section"
          label="Academic Section"
          placeholder="e.g. 3A or 4B-G1"
          :maxlength="10"
          :error="studentErrors?.section || ''"
          hint="Assigned class section code"
          required
          @update:model-value="emit('update:section', String($event).toUpperCase())"
        />

        <!-- Year Level -->
        <UiSelect
          :model-value="yearLevel"
          label="Year / Grade Level"
          :options="YEAR_LEVEL_OPTIONS"
          required
          @update:model-value="emit('update:yearLevel', Number($event))"
        />
      </div>
    </div>

    <!-- Dynamic Personnel Records -->
    <div
      v-else-if="role === 'UniversityStaff' || role === 'NonAcademicPersonnel'"
      class="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 space-y-5"
    >
      <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-blue-500"></span>
        Staff / Faculty Credentials
      </h4>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        <UiInput
          :model-value="idCardNumber"
          label="Client ID (Employee ID)"
          placeholder="e.g. EMP-2024-991"
          required
          @update:model-value="emit('update:idCardNumber', String($event))"
        />

        <UiInput
          :model-value="department"
          label="Department / College"
          placeholder="e.g. College of Engineering"
          required
          @update:model-value="emit('update:department', String($event))"
        />
      </div>
    </div>

    <!-- Dynamic Guard Records -->
    <div
      v-else-if="role === 'Guard'"
      class="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 space-y-5"
    >
      <h4 class="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
        Campus Security Assignment
      </h4>

      <div>
        <UiSelect
          :model-value="assignedGate"
          label="Assigned Campus Gate"
          :options="gateOptions"
          required
          @update:model-value="emit('update:assignedGate', Number($event))"
        />
      </div>
    </div>
  </UiCard>
</template>
