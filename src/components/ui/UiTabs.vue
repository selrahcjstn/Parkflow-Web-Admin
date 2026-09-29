<script setup lang="ts">
export interface TabItem {
  key: string
  label: string
  count?: number
}

defineProps<{
  tabs: TabItem[]
  modelValue: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="flex items-center p-1 bg-[#e2e8f0] dark:bg-slate-800/90 border border-[#cbd5e1] dark:border-slate-700 rounded-[10px] gap-1 overflow-x-auto no-scrollbar">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      @click="$emit('update:modelValue', tab.key)"
      :class="[
        'flex items-center gap-2 px-3.5 py-1.5 rounded-[7px] text-xs transition-all cursor-pointer border-none whitespace-nowrap',
        modelValue === tab.key
          ? 'bg-[#D22730] text-white shadow-md shadow-[#D22730]/25 font-bold'
          : 'text-[#475569] dark:text-slate-300 hover:text-[#1e293b] dark:hover:text-white bg-transparent font-semibold'
      ]"
    >
      <span>{{ tab.label }}</span>
      <span
        v-if="tab.count !== undefined"
        :class="[
          'px-1.5 py-0.5 rounded-full text-[10.5px] font-extrabold leading-none',
          modelValue === tab.key
            ? 'bg-white/25 text-white'
            : 'bg-slate-300/70 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
        ]"
      >
        {{ tab.count }}
      </span>
    </button>
  </div>
</template>
