<script setup lang="ts">
import type { FeedbackItem, FeedbackStatus } from '../types'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  isOpen: boolean
  feedback: FeedbackItem | null
  status: FeedbackStatus
  replyMessage: string
  markAsResolved: boolean
  isSendingReply: boolean
  isSavingStatus: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:status', val: FeedbackStatus): void
  (e: 'update:replyMessage', val: string): void
  (e: 'update:markAsResolved', val: boolean): void
  (e: 'sendReply'): void
  (e: 'saveStatus'): void
}>()

const statusOptions = [
  { label: 'Pending Review', value: 'Pending' },
  { label: 'Reviewed', value: 'Reviewed' },
  { label: 'Resolved', value: 'Resolved' }
]

const getUserName = (f: FeedbackItem) => f.fullName || f.userFullName || 'Anonymous User'
const getUserEmail = (f: FeedbackItem) => f.email || f.userEmail || 'N/A'
const getMessageText = (f: FeedbackItem) => f.description || f.message || ''

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Just now'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Recently'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date)
}
</script>

<template>
  <UiModal
    :is-open="isOpen && !!feedback"
    title="Feedback & Inquiry Details"
    size="md"
    :show-close="!isSendingReply && !isSavingStatus"
    :close-on-backdrop="!isSendingReply && !isSavingStatus"
    :close-on-esc="!isSendingReply && !isSavingStatus"
    @close="emit('close')"
  >
    <div v-if="feedback" class="space-y-4">
      <!-- User profile & rating card -->
      <div class="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
            {{ getUserName(feedback).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }}
          </div>
          <div>
            <h4 class="font-bold text-slate-900 dark:text-white text-sm m-0">{{ getUserName(feedback) }}</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400 m-0">{{ getUserEmail(feedback) }}</p>
          </div>
        </div>

        <div class="flex flex-col items-end">
          <div class="flex items-center gap-1 text-amber-400 text-sm">
            <span v-for="star in 5" :key="star" :class="star <= (feedback.rating || 0) ? 'opacity-100' : 'opacity-30'">
              ★
            </span>
          </div>
          <span class="text-[11px] text-slate-400 mt-0.5">{{ formatDate(feedback.createdAt) }}</span>
        </div>
      </div>

      <!-- Feedback Content Box -->
      <div class="space-y-1.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Feedback Content</span>
        <p class="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap m-0">
          {{ getMessageText(feedback) }}
        </p>
      </div>

      <!-- Change Status -->
      <div class="flex flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <UiSelect
          class="sm:w-48"
          :model-value="status"
          label="Workflow Status"
          :options="statusOptions"
          size="sm"
          :disabled="isSendingReply || isSavingStatus"
          @update:model-value="emit('update:status', $event as typeof props.status)"
        />
        <UiButton
          type="button"
          variant="secondary"
          size="sm"
          :loading="isSavingStatus"
          :disabled="isSendingReply || isSavingStatus"
          @click="emit('saveStatus')"
        >Save Status</UiButton>
      </div>
      <p class="text-xs text-muted">Save Status updates the workflow without sending an email. Sending a reply marks it Reviewed unless you select Resolved.</p>

      <!-- Reply Box -->
      <div class="space-y-1.5">
        <UiTextarea
          :model-value="replyMessage"
          label="Answer Inquiry & Send Thank You Message"
          placeholder="Type your thank you message, inquiry response, or service resolution details to the user..."
          :rows="3"
          :disabled="isSendingReply || isSavingStatus"
          @update:model-value="emit('update:replyMessage', String($event))"
        />
      </div>

      <!-- Email Notification Banner -->
      <div class="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
        <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        <div>
          <strong>Automated Email Notification:</strong> Submitting this response will automatically email <strong>{{ getUserEmail(feedback) }}</strong>.
        </div>
      </div>

      <!-- Mark as Resolved Checkbox -->
      <label class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
        <input
          type="checkbox"
          :checked="markAsResolved"
          :disabled="isSendingReply || isSavingStatus"
          class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          @change="emit('update:markAsResolved', ($event.target as HTMLInputElement).checked)"
        />
        <span>Mark Feedback as Resolved</span>
      </label>
      <p v-if="errorMessage" role="alert" class="text-sm text-(--color-danger)">{{ errorMessage }}</p>
    </div>

    <template #footer>
      <UiButton
        type="button"
        variant="secondary"
        size="md"
        :disabled="isSendingReply || isSavingStatus"
        @click="emit('close')"
      >
        Cancel
      </UiButton>
      <UiButton
        type="button"
        variant="primary"
        size="md"
        :loading="isSendingReply"
        :disabled="isSendingReply || isSavingStatus"
        @click="emit('sendReply')"
      >
        Send Reply & Email User
      </UiButton>
    </template>
  </UiModal>
</template>
