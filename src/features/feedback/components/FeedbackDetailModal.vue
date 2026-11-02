<script setup lang="ts">
import { ref } from 'vue'
import type { FeedbackItem, FeedbackStatus } from '../types'
import UiModal from '@/components/ui/UiModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import UiSelect from '@/components/ui/UiSelect.vue'
import { formatDocUrl, isPdfDoc, getDocDownloadUrl } from '@/utils/documentUrl'

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

// Image Zoom / Lightbox State
const isZoomOpen = ref(false)
const zoomImage = ref<string | null>(null)

const openZoom = (url: string) => {
  zoomImage.value = formatDocUrl(url)
  isZoomOpen.value = true
}

const closeZoom = () => {
  isZoomOpen.value = false
  zoomImage.value = null
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

      <!-- Attached Screenshot / Evidence Section -->
      <div class="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Attached Evidence / Screenshot</span>
          </div>
          <span v-if="feedback.attachmentUrl" class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            1 Attachment Included
          </span>
        </div>

        <template v-if="feedback.attachmentUrl">
          <!-- PDF Document Case -->
          <div v-if="isPdfDoc(feedback.attachmentUrl)" class="space-y-2 pt-1">
            <div class="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-xs">
                  PDF
                </div>
                <div>
                  <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 m-0">Attached PDF Evidence Document</p>
                  <p class="text-[10px] text-slate-400 m-0">Click to view or download</p>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <a
                  :href="formatDocUrl(feedback.attachmentUrl)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white no-underline transition-colors"
                >
                  Open PDF
                </a>
                <a
                  :href="getDocDownloadUrl(feedback.attachmentUrl)"
                  download
                  class="px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 no-underline transition-colors"
                >
                  Download
                </a>
              </div>
            </div>
          </div>

          <!-- Image Screenshot Case -->
          <div v-else class="space-y-2 pt-1">
            <div class="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center max-h-[260px]">
              <img
                :src="formatDocUrl(feedback.attachmentUrl)"
                alt="Feedback Screenshot"
                class="w-full max-h-[260px] object-contain cursor-pointer transition-transform duration-200 group-hover:scale-[1.01]"
                @click="openZoom(feedback.attachmentUrl)"
              />
              <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                @click="openZoom(feedback.attachmentUrl)"
              >
                <span class="px-3 py-1.5 rounded-lg bg-black/75 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                  Click to View Full Size
                </span>
              </div>
            </div>

            <!-- Action Buttons for Image -->
            <div class="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
                @click="openZoom(feedback.attachmentUrl)"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
                Zoom Preview
              </button>
              <a
                :href="formatDocUrl(feedback.attachmentUrl)"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/60 no-underline transition-colors"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open in New Tab
              </a>
              <a
                :href="getDocDownloadUrl(feedback.attachmentUrl)"
                download
                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 no-underline transition-colors"
              >
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download
              </a>
            </div>
          </div>
        </template>

        <!-- No Screenshot Empty State -->
        <p v-else class="text-xs text-slate-400 dark:text-slate-500 italic m-0 pt-0.5">
          No screenshot or document attached to this submission.
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

  <!-- Zoom / Lightbox Modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="isZoomOpen && zoomImage"
        class="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6"
        @click="closeZoom"
      >
        <div class="relative max-w-4xl max-h-[90vh] flex flex-col items-center" @click.stop>
          <div class="w-full flex items-center justify-between pb-3 text-white">
            <span class="text-xs font-semibold tracking-wide uppercase opacity-80">Feedback Evidence Screenshot</span>
            <button
              type="button"
              class="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              @click="closeZoom"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <img
            :src="zoomImage"
            alt="Zoomed Evidence"
            class="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl border border-white/10"
          />
          <div class="mt-3 flex items-center gap-3">
            <a
              :href="zoomImage"
              target="_blank"
              rel="noopener noreferrer"
              class="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium no-underline shadow-md transition-colors"
            >
              Open Full Resolution
            </a>
            <button
              type="button"
              class="px-3.5 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium cursor-pointer transition-colors"
              @click="closeZoom"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
