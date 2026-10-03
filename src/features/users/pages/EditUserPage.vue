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
import EditUserConfirmModal from '../components/EditUserConfirmModal.vue'

const route = useRoute()
const userId = computed(() => String(route.params.id || ''))

const {
  form,
  isLoading,
  isSubmitting,
  isConfirmModalOpen,
  hasPasswordChange,
  errorMessage,
  successToast,
  toasts,
  showToast,
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
  closeConfirmModal,
  confirmSubmit,
  goBack
} = useEditUser(userId)
</script>

<template>
  <div class="w-full space-y-6">
    <!-- Toast Notifications (Top-Right Popup Strip) -->
    <TransitionGroup name="fade">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="fixed top-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl text-white transition-all"
        :class="toast.type === 'error' ? 'bg-rose-600' : toast.type === 'warning' ? 'bg-amber-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-emerald-600'"
      >
        <span>{{ toast.message }}</span>
      </div>
    </TransitionGroup>

    <!-- Header & Navigation -->
    <EditUserHeader
      :is-submitting="isSubmitting"
      @back="goBack"
      @submit="handleSubmit"
    />

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

    <!-- Confirmation Modal on Save Changes -->
    <EditUserConfirmModal
      :is-open="isConfirmModalOpen"
      :is-submitting="isSubmitting"
      :form="form"
      :initials="getInitials()"
      :has-password-change="hasPasswordChange"
      @close="closeConfirmModal"
      @confirm="confirmSubmit"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>

