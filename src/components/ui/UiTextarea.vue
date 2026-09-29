<script setup lang="ts">
import { computed, ref, useId } from 'vue'

export interface TextareaProps {
  modelValue?: string | null
  label?: string
  placeholder?: string
  hint?: string
  error?: string
  disabled?: boolean
  readonly?: boolean
  required?: boolean
  rows?: number
  maxlength?: number
  showCount?: boolean
  id?: string
  name?: string
  autofocus?: boolean
}

const props = withDefaults(defineProps<TextareaProps>(), {
  modelValue: '',
  label: '',
  placeholder: '',
  hint: '',
  error: '',
  disabled: false,
  readonly: false,
  required: false,
  rows: 4,
  showCount: false,
  autofocus: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const generatedId = useId ? useId() : `ui-textarea-${Math.random().toString(36).slice(2, 9)}`
const textareaId = computed(() => props.id || generatedId)

const charCount = computed(() => (props.modelValue ? String(props.modelValue).length : 0))

function handleInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

defineExpose({
  focus: () => textareaRef.value?.focus(),
  blur: () => textareaRef.value?.blur(),
  textareaRef
})
</script>

<template>
  <div
    class="ui-form-group"
    :class="{
      'ui-form-group--disabled': disabled,
      'ui-form-group--error': !!error,
      'ui-form-group--readonly': readonly
    }"
  >
    <!-- Label -->
    <label v-if="label || $slots.label" :for="textareaId" class="ui-label">
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="ui-label__required" aria-hidden="true">*</span>
    </label>

    <!-- Textarea Wrapper -->
    <div class="ui-textarea-wrapper">
      <textarea
        :id="textareaId"
        ref="textareaRef"
        :name="name"
        :value="modelValue ?? ''"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :rows="rows"
        :maxlength="maxlength"
        :autofocus="autofocus"
        class="ui-textarea-field"
        @input="handleInput"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />
    </div>

    <!-- Bottom info / Error / Character count -->
    <div class="ui-form-group__footer">
      <!-- Error message -->
      <div v-if="error || $slots.error" class="ui-form-feedback ui-form-feedback--error">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span><slot name="error">{{ error }}</slot></span>
      </div>

      <!-- Hint message -->
      <div v-else-if="hint || $slots.hint" class="ui-form-feedback ui-form-feedback--hint">
        <slot name="hint">{{ hint }}</slot>
      </div>

      <div v-else class="spacer"></div>

      <!-- Character Count -->
      <span v-if="showCount && maxlength" class="ui-char-count">
        {{ charCount }}/{{ maxlength }}
      </span>
      <span v-else-if="showCount" class="ui-char-count">
        {{ charCount }} chars
      </span>
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

.ui-textarea-wrapper {
  position: relative;
  width: 100%;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #cbd5e1);
  border-radius: var(--radius-button, 8px);
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.ui-textarea-wrapper:hover:not(.ui-form-group--disabled .ui-textarea-wrapper) {
  border-color: #94a3b8;
}

.ui-textarea-wrapper:focus-within {
  border-color: var(--color-primary, #D22730);
  box-shadow: 0 0 0 3px rgba(210, 39, 48, 0.15);
}

.ui-textarea-field {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--color-text, #1e293b);
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  padding: 10px 14px;
  resize: vertical;
  min-height: 70px;
  box-sizing: border-box;
  line-height: 1.5;
}

.ui-textarea-field::placeholder {
  color: var(--color-subtle, #94a3b8);
  opacity: 1;
}

.ui-form-group__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.spacer {
  flex: 1;
}

.ui-char-count {
  font-size: 11.5px;
  color: var(--color-muted, #64748b);
  margin-left: auto;
}

.ui-form-group--error .ui-textarea-wrapper {
  border-color: #dc2626 !important;
}

.ui-form-group--error .ui-textarea-wrapper:focus-within {
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

.ui-form-group--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ui-form-group--disabled .ui-textarea-wrapper {
  background: var(--color-surface-muted, #f8fafc);
  border-color: var(--color-border, #e2e8f0);
}

.ui-form-group--disabled .ui-textarea-field {
  cursor: not-allowed;
}

.ui-form-group--readonly .ui-textarea-wrapper {
  background: var(--color-surface-muted, #f8fafc);
}
</style>
