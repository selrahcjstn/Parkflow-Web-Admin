<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'

export interface ModalProps {
  isOpen: boolean
  title?: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showClose?: boolean
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
}

const props = withDefaults(defineProps<ModalProps>(), {
  title: '',
  subtitle: '',
  size: 'md',
  showClose: true,
  closeOnBackdrop: true,
  closeOnEsc: true
})

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:isOpen', value: boolean): void
}>()

function closeModal() {
  emit('close')
  emit('update:isOpen', false)
}

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    closeModal()
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (props.isOpen && props.closeOnEsc && e.key === 'Escape') {
    closeModal()
  }
}

watch(
  () => props.isOpen,
  (val) => {
    if (typeof document !== 'undefined') {
      if (val) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-modal-fade">
      <div v-if="isOpen" class="ui-modal-backdrop" @click="handleBackdropClick">
        <div
          class="ui-modal-container"
          :class="`ui-modal--${size}`"
          role="dialog"
          aria-modal="true"
          @click.stop
        >
          <!-- Header -->
          <div v-if="title || $slots.header || showClose" class="ui-modal-header">
            <slot name="header">
              <div class="ui-modal-header__text">
                <h3 v-if="title" class="ui-modal-title">{{ title }}</h3>
                <p v-if="subtitle" class="ui-modal-subtitle">{{ subtitle }}</p>
              </div>
            </slot>

            <button
              v-if="showClose"
              type="button"
              class="ui-modal-close-btn"
              aria-label="Close dialog"
              @click="closeModal"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="ui-modal-body">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="ui-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ui-modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--color-overlay, rgba(15, 23, 42, 0.65));
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99990;
  padding: 16px;
  box-sizing: border-box;
}

.ui-modal-container {
  position: relative;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: var(--radius-card, 16px);
  width: 100%;
  max-height: calc(100vh - 40px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  box-sizing: border-box;
  animation: modalPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* ── Sizes ── */
.ui-modal--sm {
  max-width: 420px;
}

.ui-modal--md {
  max-width: 540px;
}

.ui-modal--lg {
  max-width: 720px;
}

.ui-modal--xl {
  max-width: 960px;
}

.ui-modal--full {
  max-width: calc(100vw - 48px);
  height: calc(100vh - 48px);
}

/* ── Header ── */
.ui-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface, #ffffff);
  flex-shrink: 0;
}

.ui-modal-header__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ui-modal-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text, #0f172a);
  letter-spacing: -0.2px;
}

.ui-modal-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--color-muted, #64748b);
}

.ui-modal-close-btn {
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
  margin-left: auto;
}

.ui-modal-close-btn:hover {
  background: var(--color-surface-lighter, #f1f5f9);
  color: var(--color-text, #0f172a);
}

/* ── Body ── */
.ui-modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

/* ── Footer ── */
.ui-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border, #e2e8f0);
  background: var(--color-surface-lighter, #f8fafc);
  flex-shrink: 0;
}

/* ── Animations ── */
@keyframes modalPopIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.ui-modal-fade-enter-active,
.ui-modal-fade-leave-active {
  transition: opacity 200ms ease;
}

.ui-modal-fade-enter-from,
.ui-modal-fade-leave-to {
  opacity: 0;
}
</style>
