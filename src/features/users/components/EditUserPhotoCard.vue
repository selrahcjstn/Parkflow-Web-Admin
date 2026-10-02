<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'

defineProps<{
  photoUrl: string
  status: 'Active' | 'Suspended' | 'PendingVerification' | string
  initials: string
}>()

const emit = defineEmits<{
  (e: 'selectPhoto'): void
  (e: 'removePhoto'): void
}>()
</script>

<template>
  <UiCard class="p-6 space-y-5">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
      <div class="w-10 h-10 rounded-xl bg-red-50 dark:bg-rose-950/50 text-bulsu-red dark:text-rose-400 flex items-center justify-center flex-shrink-0">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <div>
        <h3 class="text-base font-semibold text-slate-900 dark:text-white">1. User Photo & Profile Image</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400">Upload or update official identification avatar image</p>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row items-center sm:items-start gap-6">
      <!-- Avatar Preview -->
      <div class="relative w-24 h-24 flex-shrink-0">
        <img
          v-if="photoUrl"
          :src="photoUrl"
          alt="User Avatar"
          class="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-800 shadow-md"
        />
        <div
          v-else
          class="w-24 h-24 rounded-full bg-bulsu-red text-white text-2xl font-bold flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-md tracking-wider"
        >
          {{ initials }}
        </div>

        <span
          class="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold border-2 border-white dark:border-slate-900 capitalize shadow-sm"
          :class="[
            status === 'Active'
              ? 'bg-emerald-500 text-white'
              : status === 'Suspended'
                ? 'bg-rose-500 text-white'
                : 'bg-amber-500 text-white'
          ]"
        >
          {{ status === 'PendingVerification' ? 'Pending' : status }}
        </span>
      </div>

      <!-- Controls -->
      <div class="flex-1 space-y-3 text-center sm:text-left">
        <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
          <button
            type="button"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-bulsu-red text-white hover:bg-bulsu-hover transition-colors shadow-sm cursor-pointer"
            @click="emit('selectPhoto')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Upload New Photo
          </button>

          <button
            v-if="photoUrl"
            type="button"
            class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
            @click="emit('removePhoto')"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Remove Photo
          </button>
        </div>

        <p class="text-[11.5px] text-slate-500 dark:text-slate-400">
          Supported file formats: JPEG, PNG, WEBP. Maximum file size: 5MB.
        </p>
      </div>
    </div>
  </UiCard>
</template>
