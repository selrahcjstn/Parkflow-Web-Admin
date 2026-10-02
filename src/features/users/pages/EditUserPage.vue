<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useEditUser } from '../composables/useEditUser'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import EditUserHeader from '../components/EditUserHeader.vue'
import EditUserPhotoCard from '../components/EditUserPhotoCard.vue'
import EditUserPersonalInfoCard from '../components/EditUserPersonalInfoCard.vue'
import EditUserRoleCard from '../components/EditUserRoleCard.vue'
import EditUserSecurityCard from '../components/EditUserSecurityCard.vue'

const route = useRoute()
const userId = computed(() => String(route.params.id || ''))

const {
  form,
  isLoading,
  isSubmitting,
  errorMessage,
  successToast,
  fileInput,
  studentFieldErrors,
  showPasswordFields,
  showNewPassword,
  showConfirmPassword,
  isSendingTempPw,
  tempPwSuccessMessage,
  getInitials,
  triggerPhotoSelect,
  handlePhotoChange,
  removePhoto,
  onStudentNumberInput,
  handleSendTempPassword,
  handleSubmit,
  goBack
} = useEditUser(userId)
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Header & Navigation -->
    <EditUserHeader
      :is-submitting="isSubmitting"
      @back="goBack"
      @submit="handleSubmit"
    />

    <!-- Error Banner -->
    <div
      v-if="errorMessage"
      class="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm font-medium shadow-sm"
    >
      <svg class="w-5 h-5 flex-shrink-0 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span>{{ errorMessage }}</span>
    </div>

    <!-- Success Toast Notification -->
    <div
      v-if="successToast"
      class="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm font-semibold shadow-sm"
    >
      <svg class="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{{ successToast }}</span>
    </div>

    <!-- Loading Skeleton State -->
    <div v-if="isLoading" class="space-y-6 animate-pulse">
      <UiCard class="p-6">
        <div class="flex items-center gap-4">
          <div class="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800"></div>
          <div class="space-y-2 flex-1">
            <div class="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            <div class="h-4 w-72 bg-slate-100 dark:bg-slate-800/60 rounded-md"></div>
          </div>
        </div>
      </UiCard>
      <UiCard class="p-6 space-y-4">
        <div class="h-6 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
          <div class="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
          <div class="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
        </div>
      </UiCard>
      <UiCard class="p-6 space-y-4">
        <div class="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div class="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
      </UiCard>
    </div>

    <!-- Edit Form Container -->
    <form v-else @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Hidden File Input for Photo Upload -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handlePhotoChange"
      />

      <!-- 1. Photo & Profile Image Card -->
      <EditUserPhotoCard
        :photo-url="form.photoUrl"
        :initials="getInitials()"
        @select-photo="triggerPhotoSelect"
        @remove-photo="removePhoto"
      />

      <!-- 2. Personal Information Card -->
      <EditUserPersonalInfoCard
        v-model:first-name="form.firstName"
        v-model:middle-name="form.middleName"
        v-model:last-name="form.lastName"
        v-model:email="form.email"
        v-model:phone-number="form.phoneNumber"
        v-model:status="form.status"
      />

      <!-- 3. Role Classification & Dynamic Sub-records Card -->
      <EditUserRoleCard
        v-model:role="form.role"
        v-model:student-number="form.studentNumber"
        v-model:course="form.course"
        v-model:section="form.section"
        v-model:year-level="form.yearLevel"
        v-model:id-card-number="form.idCardNumber"
        v-model:department="form.department"
        v-model:assigned-gate="form.assignedGate"
        :student-errors="studentFieldErrors"
        @student-number-input="onStudentNumberInput"
      />

      <!-- 4. Security & Password Override Card -->
      <EditUserSecurityCard
        :email="form.email"
        :is-sending-temp-pw="isSendingTempPw"
        :temp-pw-success-message="tempPwSuccessMessage"
        v-model:show-password-fields="showPasswordFields"
        v-model:new-password="form.newPassword"
        v-model:confirm-password="form.confirmPassword"
        :show-new-password="showNewPassword"
        :show-confirm-password="showConfirmPassword"
        @send-temp-password="handleSendTempPassword"
        @toggle-show-new-password="showNewPassword = !showNewPassword"
        @toggle-show-confirm-password="showConfirmPassword = !showConfirmPassword"
      />

      <!-- Action Buttons Footer -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <UiButton
          type="button"
          variant="outline"
          size="md"
          @click="goBack"
        >
          Cancel
        </UiButton>
        <UiButton
          type="submit"
          variant="primary"
          size="md"
          :is-loading="isSubmitting"
        >
          Save Profile Changes
        </UiButton>
      </div>
    </form>
  </div>
</template>
