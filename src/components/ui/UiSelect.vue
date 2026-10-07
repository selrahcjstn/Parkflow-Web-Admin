<script setup lang="ts">
import { computed, useId } from 'vue'

export type SelectOption =
  | string
  | number
  | {
      label: string
      value: string | number
      disabled?: boolean
      icon?: string
    }

export interface SelectProps {
  modelValue?: string | number | null
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
  size: 'md',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const generatedId = useId ? useId() : `ui-select-${Math.random().toString(36).slice(2, 9)}`
const selectId = computed(() => props.id || generatedId)

const normalizedOptions = computed(() => {
  return props.options.map((opt) => {
    if (typeof opt === 'object' && opt !== null && 'value' in opt) {
      return {
        label: opt.label,
        value: opt.value,
        disabled: !!opt.disabled,
      }
    }
    return {
      label: String(opt),
      value: opt,
      disabled: false,
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
  <div class="flex min-w-0 flex-col gap-1.5">
    <label v-if="label || $slots.label" :for="selectId" class="text-sm font-medium text-text"
      ><slot name="label">{{ label }}</slot
      ><span v-if="required" class="ml-1 text-(--color-danger)">*</span></label
    >
    <div class="relative flex items-center">
      <span v-if="$slots.prefix" class="pointer-events-none absolute left-3 inline-flex text-muted"
        ><slot name="prefix"
      /></span>
      <select
        :id="selectId"
        :name="name"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :aria-invalid="!!error"
        class="w-full cursor-pointer appearance-none rounded-button border bg-surface pr-9 pl-3 text-sm text-text outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
        :class="[
          { sm: 'h-9', md: 'h-10', lg: 'h-12' }[size],
          error ? 'border-(--color-danger)' : 'border-border',
          { 'pl-9': $slots.prefix },
        ]"
        @change="handleChange"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="opt in normalizedOptions"
          :key="String(opt.value)"
          :value="opt.value"
          :disabled="opt.disabled"
        >
          {{ opt.label }}
        </option>
      </select>
      <svg
        class="pointer-events-none absolute right-3 size-4 text-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
    <p v-if="error || $slots.error" role="alert" class="text-xs text-(--color-danger)">
      <slot name="error">{{ error }}</slot>
    </p>
    <p v-else-if="hint || $slots.hint" class="text-xs text-muted">
      <slot name="hint">{{ hint }}</slot>
    </p>
  </div>
</template>
