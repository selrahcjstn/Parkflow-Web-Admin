<script setup lang="ts">
import { computed, ref, useId } from 'vue'

export interface InputProps {
  modelValue?: string | number | null
  type?: string
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  clearable?: boolean
  autocomplete?: string
  maxlength?: number
  min?: number | string
  max?: number | string
  step?: number | string
  id?: string
  name?: string
  autofocus?: boolean
}

const props = withDefaults(defineProps<InputProps>(), {
  modelValue: '',
  type: 'text',
  label: '',
  placeholder: '',
  hint: '',
  error: '',
  disabled: false,
  readonly: false,
  required: false,
  size: 'md',
  clearable: false,
  autocomplete: 'off',
  autofocus: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'clear'): void
  (e: 'keydown', event: KeyboardEvent): void
  (e: 'keyup', event: KeyboardEvent): void
  (e: 'enter', event: KeyboardEvent): void
}>()

const inputRef = ref<HTMLInputElement | null>(null)
const generatedId = useId ? useId() : `ui-input-${Math.random().toString(36).slice(2, 9)}`
const inputId = computed(() => props.id || generatedId)

const hasValue = computed(() => {
  return props.modelValue !== undefined && props.modelValue !== null && props.modelValue !== ''
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  const value = props.type === 'number' ? (target.value === '' ? '' : Number(target.value)) : target.value
  emit('update:modelValue', value)
}

function handleClear() {
  emit('update:modelValue', '')
  emit('clear')
  inputRef.value?.focus()
}

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event)
  if (event.key === 'Enter') {
    emit('enter', event)
  }
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  select: () => inputRef.value?.select(),
  inputRef
})
</script>

<template>
  <div
    class="ui-form-group"
    :class="[
      `ui-input-size--${size}`,
      {
        'ui-form-group--disabled': disabled,
        'ui-form-group--error': !!error,
        'ui-form-group--readonly': readonly
      }
    ]"
  >
    <!-- Label -->
    <label v-if="label || $slots.label" :for="inputId" class="ui-label">
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="ui-label__required" aria-hidden="true">*</span>
    </label>

    <!-- Input Wrapper -->
    <div
      class="ui-input-wrapper"
      :class="{
        'has-prefix': $slots.prefix,
        'has-suffix': $slots.suffix || (clearable && hasValue && !disabled && !readonly)
      }"
    >
      <!-- Prefix Slot -->
      <span v-if="$slots.prefix" class="ui-input-affix ui-input-prefix">
        <slot name="prefix" />
      </span>

      <!-- Native Input -->
      <input
        :id="inputId"
        ref="inputRef"
        :name="name"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :min="min"
        :max="max"
        :step="step"
        :autofocus="autofocus"
        class="ui-input-field"
        @input="handleInput"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
        @keydown="handleKeydown"
        @keyup="emit('keyup', $event)"
      />

      <!-- Clear Button or Suffix Slot -->
      <div class="ui-input-suffix-group">
        <button
          v-if="clearable && hasValue && !disabled && !readonly"
          type="button"
          class="ui-input-clear-btn"
          aria-label="Clear input"
          @click="handleClear"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <span v-if="$slots.suffix" class="ui-input-affix ui-input-suffix">
          <slot name="suffix" />
        </span>
      </div>
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

/* ── Label ── */
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

/* ── Input Wrapper ── */
.ui-input-wrapper {
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

.ui-input-wrapper:hover:not(.ui-form-group--disabled .ui-input-wrapper) {
  border-color: #94a3b8;
}

.ui-input-wrapper:focus-within {
  border-color: var(--color-primary, #D22730);
  box-shadow: 0 0 0 3px rgba(210, 39, 48, 0.15);
}

/* ── Native Input Field ── */
.ui-input-field {
  flex: 1;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--color-text, #1e293b);
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  padding: 0 14px;
  height: 40px;
  line-height: normal;
  box-sizing: border-box;
}

.ui-input-field::placeholder {
  color: var(--color-subtle, #94a3b8);
  opacity: 1;
}

/* ── Sizes ── */
.ui-input-size--sm .ui-input-field {
  height: 32px;
  font-size: 12.5px;
  padding: 0 10px;
}
.ui-input-size--sm .ui-label {
  font-size: 12px;
}
.ui-input-size--sm .ui-input-wrapper {
  border-radius: 6px;
}

.ui-input-size--md .ui-input-field {
  height: 40px;
  font-size: 13.5px;
  padding: 0 14px;
}
.ui-input-size--md .ui-input-wrapper {
  border-radius: 8px;
}

.ui-input-size--lg .ui-input-field {
  height: 48px;
  font-size: 15px;
  padding: 0 16px;
}
.ui-input-size--lg .ui-input-wrapper {
  border-radius: 10px;
}

/* ── Affixes (Prefix / Suffix) ── */
.ui-input-affix {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-muted, #64748b);
  flex-shrink: 0;
  user-select: none;
}

.ui-input-prefix {
  padding-left: 12px;
}
.ui-input-wrapper.has-prefix .ui-input-field {
  padding-left: 8px;
}

.ui-input-suffix-group {
  display: inline-flex;
  align-items: center;
  padding-right: 10px;
  gap: 6px;
}

.ui-input-suffix {
  padding-right: 2px;
}

/* ── Clear button ── */
.ui-input-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: var(--color-surface-muted, #f1f5f9);
  color: var(--color-muted, #64748b);
  cursor: pointer;
  transition: all 120ms ease;
  padding: 0;
}

.ui-input-clear-btn:hover {
  background: #e2e8f0;
  color: var(--color-text, #0f172a);
}

/* ── Error State ── */
.ui-form-group--error .ui-input-wrapper {
  border-color: #dc2626 !important;
}

.ui-form-group--error .ui-input-wrapper:focus-within {
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

/* ── Disabled & Readonly ── */
.ui-form-group--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ui-form-group--disabled .ui-input-wrapper {
  background: var(--color-surface-muted, #f8fafc);
  border-color: var(--color-border, #e2e8f0);
}

.ui-form-group--disabled .ui-input-field {
  cursor: not-allowed;
}

.ui-form-group--readonly .ui-input-wrapper {
  background: var(--color-surface-muted, #f8fafc);
}
</style>
