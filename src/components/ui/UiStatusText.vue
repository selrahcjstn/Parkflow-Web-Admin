<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  size?: 'xs' | 'sm' | 'md'
  dot?: boolean
  label?: string
}>()

const textClasses = {
  primary: 'text-indigo-600 dark:text-indigo-400 font-semibold',
  success: 'text-emerald-600 dark:text-emerald-400 font-semibold',
  warning: 'text-amber-600 dark:text-amber-400 font-semibold',
  danger: 'text-rose-600 dark:text-rose-400 font-semibold',
  info: 'text-sky-600 dark:text-sky-400 font-semibold',
  neutral: 'text-slate-500 dark:text-slate-400 font-medium'
}

const dotClasses = {
  primary: 'bg-indigo-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  neutral: 'bg-slate-400'
}

const sizeClasses = {
  xs: 'text-[11px] gap-1.5',
  sm: 'text-xs gap-1.5',
  md: 'text-sm gap-2'
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center leading-none select-none',
      textClasses[variant || 'neutral'],
      sizeClasses[size || 'sm']
    ]"
  >
    <span
      v-if="dot !== false"
      :class="['w-1.5 h-1.5 rounded-full flex-shrink-0', dotClasses[variant || 'neutral']]"
    />
    <slot>{{ label }}</slot>
  </span>
</template>
