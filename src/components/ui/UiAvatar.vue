<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name?: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  bgGradient?: string
}>()

const initials = computed(() => {
  if (!props.name) return 'U'
  const parts = props.name.trim().replace(/^(Dr\.|Prof\.|Engr\.)\s+/i, '').split(' ')
  const p0 = parts[0]
  const p1 = parts[1]
  if (parts.length >= 2 && p0 && p1 && p0[0] && p1[0]) {
    return (p0[0] + p1[0]).toUpperCase()
  }
  return props.name.slice(0, 2).toUpperCase()
})

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm'
}
</script>

<template>
  <div
    :class="[
      'inline-flex items-center justify-center font-bold text-white rounded-full flex-shrink-0 select-none shadow-xs tracking-wider',
      sizeClasses[size || 'md'],
      !bgGradient && !src ? 'bg-indigo-600' : ''
    ]"
    :style="bgGradient ? { background: bgGradient } : {}"
  >
    <img v-if="src" :src="src" :alt="name" class="w-full h-full rounded-full object-cover" />
    <span v-else>{{ initials }}</span>
  </div>
</template>
