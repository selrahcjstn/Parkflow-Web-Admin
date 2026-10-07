<script setup lang="ts">
import { computed, useId } from 'vue'
import UiButton from './UiButton.vue'

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'primary' | 'success'
    isSubmitting?: boolean
  }>(),
  {
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    isSubmitting: false,
  },
)

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'close'): void
  (e: 'cancel'): void
}>()

function handleCancel() {
  if (props.isSubmitting) return
  emit('cancel')
  emit('close')
}

function handleConfirm() {
  if (props.isSubmitting) return
  emit('confirm')
}

const titleId = useId()
const messageId = useId()

const iconBadgeClass = computed(() => {
  if (props.variant === 'warning') return 'bg-warning-bg border-warning/20 text-warning'
  if (props.variant === 'primary') return 'bg-primary-light border-primary/20 text-primary'
  if (props.variant === 'success') return 'bg-success-bg border-success/20 text-success'
  return 'bg-danger-bg border-danger/20 text-danger'
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto bg-overlay p-4"
        @click="handleCancel"
      >
        <div
          class="relative max-h-[calc(100dvh-2rem)] w-full min-w-0 max-w-md overflow-y-auto rounded-card border border-border bg-surface p-6 text-center shadow-modal sm:p-7"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="messageId"
          @click.stop
        >
          <!-- Close top-right button -->
          <button
            type="button"
            aria-label="Close dialog"
            class="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-button text-muted hover:bg-surface-muted hover:text-text focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            @click="handleCancel"
            title="Close"
            :disabled="isSubmitting"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <!-- Icon Badge -->
          <div
            class="mx-auto mb-5 flex size-14 items-center justify-center rounded-full border"
            :class="iconBadgeClass"
          >
            <!-- Alert / Trash / Check Icon -->
            <svg
              v-if="variant === 'danger'"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" stroke-linecap="round" stroke-linejoin="round" />
              <path
                d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg
              v-else-if="variant === 'warning'"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <svg
              v-else-if="variant === 'success'"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg
              v-else
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>

          <!-- Title & Body -->
          <h3 :id="titleId" class="mb-2.5 text-xl font-bold text-text">{{ title }}</h3>
          <div
            :id="messageId"
            class="mb-6 break-words text-sm leading-relaxed text-muted [&_strong]:font-semibold [&_strong]:text-text"
            v-html="message"
          ></div>

          <!-- Actions using UiButton -->
          <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <UiButton
              type="button"
              variant="secondary"
              :disabled="isSubmitting"
              block
              class="min-w-0"
              @click="handleCancel"
            >
              {{ cancelText }}
            </UiButton>
            <UiButton
              type="button"
              :variant="variant"
              :loading="isSubmitting"
              block
              class="min-w-0"
              @click="handleConfirm"
            >
              {{ isSubmitting ? 'Processing...' : confirmText }}
            </UiButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
