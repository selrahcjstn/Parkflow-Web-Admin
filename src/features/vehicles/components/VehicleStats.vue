<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const props = defineProps<{
  isLoading: boolean
  totalCount: number
  carsCount: number
  motoCount: number
  ebikesCount: number
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <template v-if="isLoading">
      <SkeletonLoader v-for="i in 4" :key="'veh-skel-' + i" variant="rect" height="96px" style="border-radius: 16px;" />
    </template>
    <template v-else>
      <!-- Total Vehicles -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-slate-900 dark:text-white leading-none block">
            {{ totalCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Total Vehicles
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
          </svg>
        </div>
      </UiCard>

      <!-- Cars Registered -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none block">
            {{ carsCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Cars Registered
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="11" width="18" height="6" rx="2" />
            <path d="M5 17h14" />
            <circle cx="7" cy="17" r="2" />
            <circle cx="17" cy="17" r="2" />
            <path d="M6 11l1.5-4.5h9L18 11" />
          </svg>
        </div>
      </UiCard>

      <!-- Motorcycles -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-amber-600 dark:text-amber-400 leading-none block">
            {{ motoCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            Motorcycles
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="5" cy="18" r="3" />
            <circle cx="19" cy="18" r="3" />
            <path d="M12 18V8h4" />
            <path d="M5 18h14" opacity="0.3" />
          </svg>
        </div>
      </UiCard>

      <!-- E-Bikes -->
      <UiCard custom-class="p-4 flex items-center justify-between">
        <div>
          <span class="text-xl font-extrabold text-rose-600 dark:text-rose-400 leading-none block">
            {{ ebikesCount }}
          </span>
          <span class="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-1 block">
            E-Bikes / Light
          </span>
        </div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="6" cy="19" r="3" />
            <circle cx="17" cy="19" r="3" />
            <path d="M17 19h-7V10h4" />
            <path d="M12 10L9 7h4" />
          </svg>
        </div>
      </UiCard>
    </template>
  </div>
</template>
