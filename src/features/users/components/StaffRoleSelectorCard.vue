<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'

type AccountType = 'Guard' | 'Admin'

const props = defineProps<{
  modelValue: AccountType
  isSuperAdmin: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', role: AccountType): void
  (e: 'restricted'): void
}>()

function selectRole(role: AccountType) {
  if (role === 'Admin' && !props.isSuperAdmin) {
    emit('restricted')
    return
  }
  emit('update:modelValue', role)
}
</script>

<template>
  <UiCard class="p-6 space-y-6">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-[#D22730] flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">1. Staff Role & Privileges</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Select staff account type for system permissions and operational clearance</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Campus Guard Option -->
      <div
        class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
        :class="modelValue === 'Guard' ? 'border-[#D22730] bg-red-50/40 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
        @click="selectRole('Guard')"
      >
        <div class="flex items-center justify-between">
          <div class="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/40 text-[#D22730] flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
            :class="modelValue === 'Guard' ? 'border-[#D22730] bg-[#D22730]' : 'border-slate-300 dark:border-slate-600'"
          >
            <div v-if="modelValue === 'Guard'" class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-slate-900 dark:text-white text-sm">Campus Security Guard</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Enables gate scanning, QR verification, and manual entry logging</p>
        </div>
      </div>

      <!-- System Administrator Option -->
      <div
        class="relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3"
        :class="[
          modelValue === 'Admin' ? 'border-purple-600 bg-purple-50/40 dark:bg-purple-950/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50',
          !isSuperAdmin ? 'opacity-60 cursor-not-allowed' : ''
        ]"
        @click="selectRole('Admin')"
      >
        <div class="flex items-center justify-between">
          <div class="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors"
            :class="modelValue === 'Admin' ? 'border-purple-600 bg-purple-600' : 'border-slate-300 dark:border-slate-600'"
          >
            <div v-if="modelValue === 'Admin'" class="w-2 h-2 rounded-full bg-white"></div>
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h4 class="font-semibold text-slate-900 dark:text-white text-sm">System Administrator</h4>
            <span v-if="!isSuperAdmin" class="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/20">SuperAdmin Only</span>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Full Web Admin management, user verification, and system settings</p>
        </div>
      </div>
    </div>
  </UiCard>
</template>
