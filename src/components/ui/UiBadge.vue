<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'xs' | 'sm' | 'md'
  dot?: boolean
}>()

const textClasses = {
  primary: 'text-primary font-semibold',
  success: 'text-success font-semibold',
  warning: 'text-warning font-semibold',
  danger: 'text-danger font-semibold',
  info: 'text-info font-semibold',
  neutral: 'text-muted font-medium',
}

const dotClasses = {
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-subtle',
}

const sizeClasses = {
  xs: 'text-[11px] gap-1.5',
  sm: 'text-xs gap-1.5',
  md: 'text-sm gap-2',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center leading-none select-none font-semibold bg-transparent border-0 p-0',
      textClasses[variant || 'neutral'],
      sizeClasses[size || 'sm'],
    ]"
  >
    <span
      v-if="dot !== false"
      :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', dotClasses[variant || 'neutral']]"
    />
    <slot name="icon" />
    <slot />
  </span>
</template>
