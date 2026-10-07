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
  <button :type="type" :disabled="isDisabled" :aria-busy="loading"
    class="inline-flex shrink-0 items-center justify-center gap-2 rounded-button border font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      { xs: 'h-7 px-2.5 text-xs', sm: 'h-9 px-3 text-xs', md: 'h-10 px-4 text-sm', lg: 'min-h-12 px-5 text-sm' }[size],
      { primary: 'border-primary bg-primary text-(--color-text-inverse) hover:bg-(--color-primary-hover)',
        secondary: 'border-border bg-surface text-text hover:bg-(--color-surface-lighter)',
        success: 'border-(--color-success) bg-(--color-success) text-(--color-text-inverse)',
        danger: 'border-(--color-danger) bg-(--color-danger) text-(--color-text-inverse)',
        warning: 'border-(--color-warning) bg-(--color-warning) text-text',
        ghost: 'border-transparent bg-transparent text-muted hover:bg-(--color-surface-muted)',
        outline: 'border-primary bg-transparent text-primary hover:bg-(--color-primary-light)' }[variant],
      { 'w-full': block, 'rounded-full': rounded, 'aspect-square px-0': iconOnly }
    ]" @click="handleClick">
    <svg v-if="loading" class="size-4 shrink-0 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" class="opacity-25" />
      <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
    </svg>
    <span v-else-if="$slots.icon || $slots.prefix" class="inline-flex shrink-0 items-center"><slot name="icon"><slot name="prefix" /></slot></span>
    <span v-if="$slots.default" class="inline-flex items-center gap-2"><slot /></span>
    <span v-if="$slots.suffix && !loading" class="inline-flex items-center"><slot name="suffix" /></span>
  </button>
</template>
