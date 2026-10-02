<script setup lang="ts">
import { computed } from 'vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { getRoleLabel } from '@/utils/role'
import type { EditUserFormData } from '../composables/useEditUser'

const props = defineProps<{
  isOpen: boolean
  isSubmitting: boolean
  form: EditUserFormData
  initials?: string
  hasPasswordChange?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const fullName = computed(() => {
  const parts = [props.form.firstName, props.form.middleName, props.form.lastName].filter(Boolean)
  return parts.join(' ')
})

const gateNames: Record<number, string> = {
  1: 'Gate 1 — Main Entrance',
  2: 'Gate 2 — North Entrance',
  3: 'Gate 3 — South Entrance',
  4: 'Gate 4 — West Gate',
  5: 'Gate 5 — East Service Gate'
}

const statusBadgeClasses = computed(() => {
  switch (props.form.status) {
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'Suspended':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    case 'PendingVerification':
    default:
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800'
  }
})

const statusLabel = computed(() => {
  switch (props.form.status) {
    case 'Active':
      return 'Active Clearance'
    case 'Suspended':
      return 'Suspended Access'
    case 'PendingVerification':
      return 'Pending Verification'
    default:
      return props.form.status
  }
})
</script>

<template>
  <UiModal
    :is-open="isOpen"
    size="md"
    @close="emit('close')"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Confirm Profile Changes</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Please review the updated details before saving changes.</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Profile Header Snapshot -->
      <div class="flex items-center gap-3.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
        <div class="relative w-12 h-12 flex-shrink-0">
          <img
            v-if="form.photoUrl"
            :src="form.photoUrl"
            alt="User Avatar"
            class="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
          <div
            v-else
            class="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-rose-700 text-white font-bold text-sm flex items-center justify-center border border-slate-200 dark:border-slate-700"
          >
            {{ initials || 'US' }}
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate">
              {{ fullName }}
            </h4>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border"
              :class="statusBadgeClasses"
            >
              {{ statusLabel }}
            </span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 truncate">
            {{ form.email }}
          </p>
        </div>
      </div>

      <!-- Detail Summary Table -->
      <div class="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-4 space-y-2.5 text-xs border border-slate-200/60 dark:border-slate-700/60">
        <!-- Role Classification -->
        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">User Role</span>
          <span class="font-semibold text-slate-900 dark:text-white">{{ getRoleLabel(form.role) }}</span>
        </div>

        <!-- Phone Number -->
        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Phone Number</span>
          <span class="font-medium text-slate-900 dark:text-white">{{ form.phoneNumber || '—' }}</span>
        </div>

        <!-- Student Details -->
        <template v-if="form.role === 'Student'">
          <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Student Number</span>
            <span class="font-bold text-slate-900 dark:text-white">{{ form.studentNumber || '—' }}</span>
          </div>

          <div class="flex justify-between items-start gap-4 py-1 border-b border-slate-200/40 dark:border-slate-700/40">
            <span class="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Course / Degree</span>
            <span class="font-semibold text-slate-900 dark:text-white text-right leading-snug">{{ form.course || '—' }}</span>
          </div>

          <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Year & Section</span>
            <span class="font-semibold text-slate-900 dark:text-white">Year {{ form.yearLevel }} - {{ form.section }}</span>
          </div>
        </template>

        <!-- Personnel Details -->
        <template v-else-if="form.role === 'UniversityStaff' || form.role === 'NonAcademicPersonnel'">
          <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Employee / Card ID</span>
            <span class="font-bold text-slate-900 dark:text-white">{{ form.idCardNumber || '—' }}</span>
          </div>

          <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Department / College</span>
            <span class="font-semibold text-slate-900 dark:text-white">{{ form.department || '—' }}</span>
          </div>
        </template>

        <!-- Guard Details -->
        <template v-else-if="form.role === 'Guard'">
          <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Assigned Gate</span>
            <span class="font-semibold text-slate-900 dark:text-white">{{ gateNames[form.assignedGate] || `Gate ${form.assignedGate}` }}</span>
          </div>
        </template>

        <!-- Password Override Status -->
        <div v-if="hasPasswordChange" class="flex justify-between items-center py-1">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Password Override</span>
          <span class="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Custom Password Updated
          </span>
        </div>
      </div>

      <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed m-0">
        By confirming, this client's profile information, access clearance, and system records will be immediately updated.
      </p>
    </div>

    <template #footer>
      <UiButton
        type="button"
        variant="secondary"
        size="md"
        :disabled="isSubmitting"
        @click="emit('close')"
      >
        Cancel
      </UiButton>
      <UiButton
        type="button"
        variant="primary"
        size="md"
        :loading="isSubmitting"
        @click="emit('confirm')"
      >
        Save & Apply Changes
      </UiButton>
    </template>
  </UiModal>
</template>
