<script setup lang="ts">
import { computed } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { getRoleLabel } from '@/utils/role'

const props = defineProps<{
  isOpen: boolean
  isSubmitting: boolean
  form: {
    firstName: string
    middleName: string
    lastName: string
    role: string
    email: string
    phoneNumber: string
    studentNumber: string
    course: string
    section: string
    yearLevel: number
    idCardNumber: string
    department: string
  }
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()

const isJuniorHigh = computed(() => props.form.yearLevel >= 7 && props.form.yearLevel <= 10)
</script>

<template>
  <UiModal
    :is-open="isOpen"
    size="md"
    @close="emit('close')"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <polyline points="16 11 18 13 22 9" />
          </svg>
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-900 dark:text-white">Confirm Client Registration</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400">Please review the details below before creating this client account.</p>
        </div>
      </div>
    </template>

    <div class="space-y-4">
      <!-- Summary details table -->
      <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-2.5 text-xs border border-slate-200/60 dark:border-slate-700/60">
        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Full Name</span>
          <span class="font-bold text-slate-900 dark:text-white">
            {{ form.firstName }} {{ form.middleName ? form.middleName + ' ' : '' }}{{ form.lastName }}
          </span>
        </div>

        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Role Classification</span>
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">{{ getRoleLabel(form.role) }}</span>
        </div>

        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Email Address</span>
          <span class="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
            {{ form.email }}
            <span class="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-500/20">Verified</span>
          </span>
        </div>

        <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Phone Number</span>
          <span class="font-medium text-slate-900 dark:text-white">{{ form.phoneNumber }}</span>
        </div>

        <!-- Student specifics -->
        <template v-if="form.role === 'Student'">
          <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Student ID number</span>
            <span class="font-bold text-slate-900 dark:text-white">{{ form.studentNumber }}</span>
          </div>
          <div v-if="!isJuniorHigh" class="flex justify-between items-start gap-4 py-1 border-b border-slate-200/40 dark:border-slate-700/40">
            <span class="text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">Course / Program</span>
            <span class="font-semibold text-slate-900 dark:text-white text-right leading-snug">{{ form.course }}</span>
          </div>
          <div class="flex justify-between items-center py-1">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Year & Section</span>
            <span class="font-semibold text-slate-900 dark:text-white">
              {{ isJuniorHigh ? `Grade ${form.yearLevel}` : `Year ${form.yearLevel}` }} - {{ form.section }}
            </span>
          </div>
        </template>

        <!-- Faculty / Personnel specifics -->
        <template v-else-if="form.role === 'UniversityStaff' || form.role === 'NonAcademicPersonnel'">
          <div class="flex justify-between items-center py-1 border-b border-slate-200/40 dark:border-slate-700/40">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Employee ID</span>
            <span class="font-bold text-slate-900 dark:text-white">{{ form.idCardNumber }}</span>
          </div>
          <div class="flex justify-between items-center py-1">
            <span class="text-slate-500 dark:text-slate-400 font-medium">Department</span>
            <span class="font-semibold text-slate-900 dark:text-white">{{ form.department }}</span>
          </div>
        </template>
      </div>

      <p class="text-xs text-slate-500 dark:text-slate-400 leading-relaxed m-0">
        By confirming, this client account will be provisioned in the system. An email containing their initial credentials will be sent to their verified address.
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
        variant="success"
        size="md"
        :loading="isSubmitting"
        @click="emit('confirm')"
      >
        Confirm & Register
      </UiButton>
    </template>
  </UiModal>
</template>
