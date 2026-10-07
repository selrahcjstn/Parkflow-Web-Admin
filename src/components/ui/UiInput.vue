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
  autofocus: false,
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
  const value =
    props.type === 'number' ? (target.value === '' ? '' : Number(target.value)) : target.value
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
  inputRef,
})
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <label v-if="label || $slots.label" :for="inputId" class="text-sm font-medium text-text">
      <slot name="label">{{ label }}</slot
      ><span v-if="required" class="ml-1 text-(--color-danger)">*</span>
    </label>
    <div
      class="relative flex items-center rounded-button border bg-surface text-text focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15"
      :class="[error ? 'border-(--color-danger)' : 'border-border', { 'opacity-60': disabled }]"
    >
      <span v-if="$slots.prefix" class="pointer-events-none ml-3 inline-flex shrink-0 text-muted"
        ><slot name="prefix"
      /></span>
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
        :aria-invalid="!!error"
        :aria-describedby="error || hint ? inputId + '-feedback' : undefined"
        class="min-w-0 flex-1 rounded-button bg-transparent px-3 text-sm outline-none placeholder:text-muted disabled:cursor-not-allowed"
        :class="{ sm: 'h-9', md: 'h-10', lg: 'h-12' }[size]"
        @input="handleInput"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
        @keydown="handleKeydown"
        @keyup="emit('keyup', $event)"
      />
      <button
        v-if="clearable && hasValue && !disabled && !readonly"
        type="button"
        aria-label="Clear input"
        class="mr-2 flex size-8 shrink-0 items-center justify-center rounded-button text-muted focus-visible:outline-2 focus-visible:outline-primary"
        @click="handleClear"
      >
        ×
      </button>
      <span v-if="$slots.suffix" class="mr-1 inline-flex shrink-0"><slot name="suffix" /></span>
    </div>
    <p
      v-if="error || $slots.error"
      :id="inputId + '-feedback'"
      role="alert"
      class="text-xs text-(--color-danger)"
    >
      <slot name="error">{{ error }}</slot>
    </p>
    <p v-else-if="hint || $slots.hint" :id="inputId + '-feedback'" class="text-xs text-muted">
      <slot name="hint">{{ hint }}</slot>
    </p>
  </div>
</template>
