<script setup lang="ts">
import { computed } from 'vue'
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
    isSubmitting: false
  }
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

const iconBadgeClass = computed(() => {
  if (props.variant === 'warning') return 'confirm-icon--warning'
  if (props.variant === 'primary') return 'confirm-icon--primary'
  if (props.variant === 'success') return 'confirm-icon--success'
  return 'confirm-icon--danger'
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="modal-backdrop" @click="handleCancel">
        <div class="modal-confirm" @click.stop>
          <!-- Close top-right button -->
          <button class="modal-close-btn" @click="handleCancel" title="Close" :disabled="isSubmitting">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <!-- Icon Badge -->
          <div class="confirm-icon-badge" :class="iconBadgeClass">
            <!-- Alert / Trash / Check Icon -->
            <svg v-if="variant === 'danger'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else-if="variant === 'warning'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <svg v-else-if="variant === 'success'" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>

          <!-- Title & Body -->
          <h3 class="modal-confirm__title">{{ title }}</h3>
          <div class="modal-confirm__body" v-html="message"></div>

          <!-- Actions using UiButton -->
          <div class="modal-confirm__footer">
            <UiButton
              type="button"
              variant="secondary"
              :disabled="isSubmitting"
              block
              @click="handleCancel"
            >
              {{ cancelText }}
            </UiButton>
            <UiButton
              type="button"
              :variant="variant"
              :loading="isSubmitting"
              block
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

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay, rgba(15, 23, 42, 0.65));
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.modal-confirm {
  position: relative;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 16px;
  padding: 32px 28px;
  max-width: 440px;
  width: 90%;
  text-align: center;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  animation: modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes modalPopIn {
  from { opacity: 0; transform: scale(0.94) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: var(--color-muted, #94a3b8);
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 150ms ease;
}

.modal-close-btn:hover:not(:disabled) {
  background: var(--color-surface-lighter, #f1f5f9);
  color: var(--color-text, #0f172a);
}

.confirm-icon-badge {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.confirm-icon--danger {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #ef4444;
}

.confirm-icon--warning {
  background: #fffbeb;
  border: 1px solid #fde68a;
  color: #d97706;
}

.confirm-icon--primary {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: var(--color-primary, #7B1113);
}

.confirm-icon--success {
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #059669;
}

.modal-confirm__title {
  font-size: 19px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  margin: 0 0 10px;
  letter-spacing: -0.2px;
}

.modal-confirm__body {
  font-size: 13.5px;
  color: var(--color-muted, #64748b);
  line-height: 1.55;
  margin: 0 0 24px;
}

.modal-confirm__body :deep(strong) {
  color: var(--color-text, #0f172a);
  font-weight: 700;
}

.modal-confirm__footer {
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
