<script setup lang="ts">
import { computed } from 'vue'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  rounded?: boolean
  iconOnly?: boolean
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  loading: false,
  disabled: false,
  block: false,
  rounded: false,
  iconOnly: false
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const isDisabled = computed(() => props.disabled || props.loading)

function handleClick(event: MouseEvent) {
  if (isDisabled.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  emit('click', event)
}
</script>

<template>
  <button
    :type="type"
    :disabled="isDisabled"
    class="ui-btn"
    :class="[
      `ui-btn--${variant}`,
      `ui-btn--${size}`,
      {
        'ui-btn--loading': loading,
        'ui-btn--disabled': isDisabled,
        'ui-btn--block': block,
        'ui-btn--rounded': rounded,
        'ui-btn--icon-only': iconOnly
      }
    ]"
    @click="handleClick"
  >
    <!-- Loading Spinner -->
    <svg
      v-if="loading"
      class="ui-btn__spinner"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="3.5"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>

    <!-- Leading Icon -->
    <span v-if="($slots.icon || $slots.prefix) && !loading" class="ui-btn__icon ui-btn__icon--prefix">
      <slot name="icon"><slot name="prefix" /></slot>
    </span>

    <!-- Button Text / Default Content -->
    <span v-if="$slots.default" class="ui-btn__content" :class="{ 'ui-btn__content--loading': loading }">
      <slot />
    </span>

    <!-- Trailing Icon -->
    <span v-if="$slots.suffix && !loading" class="ui-btn__icon ui-btn__icon--suffix">
      <slot name="suffix" />
    </span>
  </button>
</template>

<style scoped>
.ui-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-weight: 600;
  line-height: 1.25;
  border-radius: var(--radius-button, 8px);
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  text-decoration: none;
  white-space: nowrap;
  gap: 8px;
  position: relative;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.ui-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--ring-color, rgba(79, 70, 229, 0.35));
}

/* ── Sizes ── */
.ui-btn--xs {
  height: 28px;
  padding: 0 10px;
  font-size: 11.5px;
  border-radius: 6px;
  gap: 5px;
}

.ui-btn--sm {
  height: 34px;
  padding: 0 14px;
  font-size: 12.5px;
  border-radius: 7px;
  gap: 6px;
}

.ui-btn--md {
  height: 40px;
  padding: 0 18px;
  font-size: 13.5px;
  border-radius: 8px;
  gap: 8px;
}

.ui-btn--lg {
  height: 46px;
  padding: 0 24px;
  font-size: 15px;
  border-radius: 10px;
  gap: 10px;
}

/* Icon-only sizes */
.ui-btn--icon-only.ui-btn--xs { width: 28px; padding: 0; }
.ui-btn--icon-only.ui-btn--sm { width: 34px; padding: 0; }
.ui-btn--icon-only.ui-btn--md { width: 40px; padding: 0; }
.ui-btn--icon-only.ui-btn--lg { width: 46px; padding: 0; }

.ui-btn--rounded {
  border-radius: 9999px;
}

.ui-btn--block {
  display: flex;
  width: 100%;
}

/* ── Variants ── */
/* Primary (BulSU Red Theme) */
.ui-btn--primary {
  background: var(--btn-primary-bg, #D22730);
  color: var(--btn-primary-text, #ffffff);
  border-color: var(--btn-primary-bg, #D22730);
  --ring-color: rgba(210, 39, 48, 0.35);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(210, 39, 48, 0.15);
}
.ui-btn--primary:hover:not(:disabled) {
  background: var(--btn-primary-hover, #B81E26);
  border-color: var(--btn-primary-hover, #B81E26);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(210, 39, 48, 0.25);
}
.ui-btn--primary:active:not(:disabled) {
  background: #9E1B22;
  border-color: #9E1B22;
  transform: translateY(0);
}

/* Secondary / Surface */
.ui-btn--secondary {
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #1e293b);
  border-color: var(--color-border, #e2e8f0);
  --ring-color: rgba(100, 116, 139, 0.2);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.ui-btn--secondary:hover:not(:disabled) {
  background: var(--color-surface-lighter, #f8fafc);
  border-color: #cbd5e1;
  color: var(--color-text, #0f172a);
}
.ui-btn--secondary:active:not(:disabled) {
  background: #f1f5f9;
}

/* Success (Emerald) */
.ui-btn--success {
  background: #059669;
  color: #ffffff;
  border-color: #059669;
  --ring-color: rgba(5, 150, 105, 0.35);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(5, 150, 105, 0.15);
}
.ui-btn--success:hover:not(:disabled) {
  background: #047857;
  border-color: #047857;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
}
.ui-btn--success:active:not(:disabled) {
  background: #065f46;
  transform: translateY(0);
}

/* Danger (Rose/Red) */
.ui-btn--danger {
  background: #dc2626;
  color: #ffffff;
  border-color: #dc2626;
  --ring-color: rgba(220, 38, 38, 0.35);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), 0 2px 4px rgba(220, 38, 38, 0.15);
}
.ui-btn--danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
}
.ui-btn--danger:active:not(:disabled) {
  background: #991b1b;
  transform: translateY(0);
}

/* Warning (Amber) */
.ui-btn--warning {
  background: #d97706;
  color: #ffffff;
  border-color: #d97706;
  --ring-color: rgba(217, 119, 6, 0.35);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.ui-btn--warning:hover:not(:disabled) {
  background: #b45309;
  border-color: #b45309;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
}
.ui-btn--warning:active:not(:disabled) {
  background: #92400e;
  transform: translateY(0);
}

/* Ghost */
.ui-btn--ghost {
  background: transparent;
  color: var(--color-muted, #64748b);
  border-color: transparent;
  --ring-color: rgba(100, 116, 139, 0.2);
}
.ui-btn--ghost:hover:not(:disabled) {
  background: var(--color-surface-lighter, #f1f5f9);
  color: var(--color-text, #1e293b);
}
.ui-btn--ghost:active:not(:disabled) {
  background: #e2e8f0;
}

/* Outline */
.ui-btn--outline {
  background: transparent;
  color: var(--color-primary, #D22730);
  border-color: #fca5a5;
  --ring-color: rgba(210, 39, 48, 0.25);
}
.ui-btn--outline:hover:not(:disabled) {
  background: rgba(210, 39, 48, 0.06);
  border-color: #ef4444;
}
.ui-btn--outline:active:not(:disabled) {
  background: rgba(210, 39, 48, 0.12);
}

/* ── Disabled & Loading States ── */
.ui-btn--disabled,
.ui-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.ui-btn--loading {
  cursor: wait;
}

.ui-btn__spinner {
  width: 1.15em;
  height: 1.15em;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.ui-btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ui-btn__content {
  display: inline-flex;
  align-items: center;
  gap: inherit;
}
</style>
