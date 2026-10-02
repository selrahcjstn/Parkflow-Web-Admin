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

import {
  collegeCourseGroups,
  COLLEGE_COURSE_OPTIONS,
  YEAR_LEVEL_OPTIONS,
  isJuniorHigh as checkJuniorHigh
} from '@/constants/courses'

const isJuniorHigh = computed(() => checkJuniorHigh(props.yearLevel))
const courseOptions = computed(() => COLLEGE_COURSE_OPTIONS)
const yearLevelOptions = YEAR_LEVEL_OPTIONS

function onClientIdInput(val: string | number) {
  const formatted = String(val).replace(/[^\d-]/g, '').slice(0, 12)
  emit('update:studentNumber', formatted)
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
