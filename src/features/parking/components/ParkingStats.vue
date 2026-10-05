<script setup lang="ts">
import StatsCard from '@/features/dashboard/components/StatsCard.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'

const props = defineProps<{
  isLoading: boolean
  occupancyCount: number
  totalCapacity: number
  occupancyRate: number
  todaysEntriesCount: number
  overstayCount: number
}>()

const emit = defineEmits<{
  (e: 'clickToday'): void
  (e: 'clickOverstay'): void
}>()
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
    <template v-if="isLoading">
      <SkeletonLoader v-for="i in 3" :key="'skel-stat-'+i" variant="rect" height="148px" style="width: 100%; border-radius: 16px;" />
    </template>
    <template v-else>
      <!-- Card 1: Slot Occupancy Rate -->
      <StatsCard
        title="Slot Occupancy"
        :value="`${occupancyCount} / ${totalCapacity}`"
        :subtitle="`${totalCapacity - occupancyCount} slots available`"
        :trend="`${occupancyRate}% full`"
        :trend-up="occupancyRate < 85"
        accent-color="#059669"
        badge-bg="rgba(16, 185, 129, 0.12)"
        :progress-percent="occupancyRate"
      >
        <template #icon>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
          </svg>
        </template>
      </StatsCard>

      <!-- Card 2: Today's Entries -->
      <StatsCard
        title="Today's Entries"
        :value="String(todaysEntriesCount)"
        subtitle="Scanner check-ins"
        trend="Today Logged"
        :trend-up="true"
        accent-color="#2563eb"
        badge-bg="rgba(37, 99, 235, 0.12)"
        class="cursor-pointer"
        @click="emit('clickToday')"
      >
        <template #icon>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2v20M17 5l-5-5-5 5M17 19l-5 5-5-5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </template>
      </StatsCard>

      <!-- Card 3: Active Overstays -->
      <StatsCard
        title="Active Overstays"
        :value="String(overstayCount)"
        subtitle="Exceeded scheduled access time"
        :trend="overstayCount > 0 ? 'Exceeded Schedule' : 'Normal'"
        :trend-up="overstayCount === 0"
        accent-color="#7B1113"
        badge-bg="rgba(123, 17, 19, 0.12)"
        class="cursor-pointer"
        @click="emit('clickOverstay')"
      >
        <template #icon>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </template>
      </StatsCard>
    </template>
  </div>
</template>
