<script setup lang="ts">
import type { UserRole } from '../types'
import UiCard from '@/components/ui/UiCard.vue'

const props = defineProps<{
  modelValue: UserRole
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', role: UserRole): void
}>()

function selectRole(role: UserRole) {
  emit('update:modelValue', role)
}
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">1. Account Classification & Role</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Select client classification to apply automatic permissions</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Student Option -->
      <div
        class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
        :class="modelValue === 'Student' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
        @click="selectRole('Student')"
      >
        <div class="flex items-center justify-between">
          <div class="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12.5v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
            :class="modelValue === 'Student' ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500' : 'border-slate-300 dark:border-slate-600'"
          >
            <div v-if="modelValue === 'Student'" class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-slate-900 dark:text-white text-sm">Student</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Enrolled student account with schedule parking privileges</p>
        </div>
      </div>

      <!-- Faculty Option -->
      <div
        class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
        :class="modelValue === 'UniversityStaff' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
        @click="selectRole('UniversityStaff')"
      >
        <div class="flex items-center justify-between">
          <div class="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
            </svg>
          </div>
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
            :class="modelValue === 'UniversityStaff' ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500' : 'border-slate-300 dark:border-slate-600'"
          >
            <div v-if="modelValue === 'UniversityStaff'" class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-slate-900 dark:text-white text-sm">Faculty</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Academic teaching faculty with reserved area access</p>
        </div>
      </div>

      <!-- University Staff Option -->
      <div
        class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
        :class="modelValue === 'NonAcademicPersonnel' ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
        @click="selectRole('NonAcademicPersonnel')"
      >
        <div class="flex items-center justify-between">
          <div class="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
            :class="modelValue === 'NonAcademicPersonnel' ? 'border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500' : 'border-slate-300 dark:border-slate-600'"
          >
            <div v-if="modelValue === 'NonAcademicPersonnel'" class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-slate-900 dark:text-white text-sm">University Staff</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Administrative & non-academic staff personnel</p>
        </div>
      </div>
    </div>
  </UiCard>
</template>
