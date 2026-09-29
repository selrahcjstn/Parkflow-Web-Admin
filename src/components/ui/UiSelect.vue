<script setup lang="ts">
import { computed, useId } from 'vue'

export type SelectOption =
  | string
  | number
  | {
      label: string
      value: any
      disabled?: boolean
      icon?: string
    }

export interface SelectProps {
  modelValue?: any
  options?: SelectOption[]
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  id?: string
  name?: string
}

const props = withDefaults(defineProps<SelectProps>(), {
  modelValue: '',
  options: () => [],
  label: '',
  placeholder: 'Select an option',
  hint: '',
  error: '',
  disabled: false,
  required: false,
  size: 'md'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: any): void
  (e: 'change', value: any): void
}>()

const generatedId = useId ? useId() : `ui-select-${Math.random().toString(36).slice(2, 9)}`
const selectId = computed(() => props.id || generatedId)

const normalizedOptions = computed(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return {
        label: opt.label,
        value: opt.value,
        disabled: !!opt.disabled
      }
    }
    return {
      label: String(opt),
      value: opt,
      disabled: false
    }
  })
})

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
  emit('change', target.value)
}
</script>

<template>
  <div
    class="ui-form-group"
    :class="[
      `ui-select-size--${size}`,
      {
        'ui-form-group--disabled': disabled,
        'ui-form-group--error': !!error
      }
    ]"
  >
    <!-- Label -->
    <label v-if="label || $slots.label" :for="selectId" class="ui-label">
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="ui-label__required" aria-hidden="true">*</span>
    </label>

    <!-- Select Wrapper -->
    <div class="ui-select-wrapper" :class="{ 'has-prefix': $slots.prefix }">
      <!-- Prefix Slot -->
      <span v-if="$slots.prefix" class="ui-select-affix ui-select-prefix">
        <slot name="prefix" />
      </span>

      <!-- Native Select with Stylized Controls -->
      <select
        :id="selectId"
        :name="name"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        class="ui-select-field"
        :class="{ 'is-placeholder': modelValue === '' || modelValue === undefined || modelValue === null }"
        @change="handleChange"
      >
        <option v-if="placeholder" value="" disabled :selected="modelValue === '' || modelValue === undefined">
          {{ placeholder }}
        </option>
        <option
          v-for="opt in normalizedOptions"
          :key="String(opt.value)"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </select>

      <!-- Chevron Arrow Icon -->
      <span class="ui-select-chevron" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </span>
    </div>

    <!-- Error Message -->
    <div v-if="error || $slots.error" class="ui-form-feedback ui-form-feedback--error">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <span><slot name="error">{{ error }}</slot></span>
    </div>

    <!-- Hint / Helper Text -->
    <div v-else-if="hint || $slots.hint" class="ui-form-feedback ui-form-feedback--hint">
      <slot name="hint">{{ hint }}</slot>
    </div>
  </div>
</template>

<style scoped>
.ui-form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

.ui-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text, #1e293b);
  user-select: none;
}

.ui-label__required {
  color: #dc2626;
  font-weight: 700;
}

.ui-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: var(--radius-button, 8px);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.ui-select-wrapper:hover:not(.ui-form-group--disabled .ui-select-wrapper) {
  border-color: #94a3b8;
}

.ui-select-wrapper:focus-within {
  border-color: var(--color-primary, #D22730);
  box-shadow: 0 0 0 3px rgba(210, 39, 48, 0.15);
}

.ui-select-field {
  flex: 1;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--color-text, #1e293b);
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  padding: 0 36px 0 14px;
  height: 40px;
  appearance: none;
  cursor: pointer;
  box-sizing: border-box;
}

.ui-select-field.is-placeholder {
  color: var(--color-subtle, #94a3b8);
}

.ui-select-field option {
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #1e293b);
}

/* ── Sizes ── */
.ui-select-size--sm .ui-select-field {
  height: 32px;
  font-size: 12.5px;
  padding: 0 30px 0 10px;
}
.ui-select-size--sm .ui-label {
  font-size: 12px;
}
.ui-select-size--sm .ui-select-wrapper {
  border-radius: 6px;
}

.ui-select-size--md .ui-select-field {
  height: 40px;
  font-size: 13.5px;
  padding: 0 36px 0 14px;
}
.ui-select-size--md .ui-select-wrapper {
  border-radius: 8px;
}

.ui-select-size--lg .ui-select-field {
  height: 48px;
  font-size: 15px;
  padding: 0 40px 0 16px;
}
.ui-select-size--lg .ui-select-wrapper {
  border-radius: 10px;
}

/* ── Affix (Prefix) ── */
.ui-select-affix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted, #64748b);
  padding-left: 12px;
  flex-shrink: 0;
  user-select: none;
}

.ui-select-wrapper.has-prefix .ui-select-field {
  padding-left: 8px;
}

/* ── Chevron ── */
.ui-select-chevron {
  position: absolute;
  right: 12px;
  pointer-events: none;
  color: var(--color-muted, #64748b);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Error State ── */
.ui-form-group--error .ui-select-wrapper {
  border-color: #dc2626 !important;
}

.ui-form-group--error .ui-select-wrapper:focus-within {
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18) !important;
}

.ui-form-feedback {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  line-height: 1.3;
}

.ui-form-feedback--error {
  color: #dc2626;
  font-weight: 500;
}

.ui-form-feedback--hint {
  color: var(--color-muted, #64748b);
}

/* ── Disabled ── */
.ui-form-group--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ui-form-group--disabled .ui-select-wrapper {
  background: var(--color-surface-muted, #f8fafc);
  border-color: var(--color-border, #e2e8f0);
}

.ui-form-group--disabled .ui-select-field {
  cursor: not-allowed;
}
</style>
