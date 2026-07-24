<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import StatsCard from '../components/StatsCard.vue'
import ParkingChart from '../components/ParkingChart.vue'
import RecentActivity from '../components/RecentActivity.vue'
import api from '@/api/axios'

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
)

const statsData = ref({
  totalUsers: 0,
  activeParking: 0,
  todayRevenue: 0,
  violations: 0,
  maxCapacity: 150
})

const stats = computed(() => [
  { title: 'Total Users', value: statsData.value.totalUsers.toLocaleString(), trend: '+12.5%', trendUp: true, iconBg: 'linear-gradient(135deg, #6366f1, #818cf8)' },
  { title: 'Active Parking', value: `${statsData.value.activeParking}/${statsData.value.maxCapacity}`, trend: '+5.2%', trendUp: true, iconBg: 'linear-gradient(135deg, #10b981, #34d399)' },
  { title: "Today's Revenue", value: `₱${statsData.value.todayRevenue.toLocaleString()}`, trend: '+8.1%', trendUp: true, iconBg: 'linear-gradient(135deg, #f59e0b, #fbbf24)' },
  { title: 'Collections', value: statsData.value.violations.toString(), trend: '-3.4%', trendUp: false, iconBg: 'linear-gradient(135deg, #ef4444, #f87171)' },
])

const activityData = ref<{ day: string; checkIns: number; checkOuts: number }[]>([])

onMounted(async () => {
  try {
    const response = await api.get('/dashboard/summary?parkingCapacity=150')
    if (response.data?.isSuccess && response.data?.data) {
      const data = response.data.data
      statsData.value.totalUsers = data.totalUsers
      statsData.value.activeParking = data.activeParking
      statsData.value.maxCapacity = data.maxCapacity
      statsData.value.todayRevenue = data.todayRevenue
      statsData.value.violations = data.violationsCount
      
      if (Array.isArray(data.activityOverLast7Days)) {
        activityData.value = data.activityOverLast7Days
      }
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error)
  }
})
</script>

<template>
  <div class="dashboard">
    <!-- Welcome -->
    <div class="dashboard__welcome">
      <div>
        <h1 class="dashboard__welcome-title">Welcome back, Admin</h1>
        <p class="dashboard__welcome-date">{{ formattedDate }}</p>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="dashboard__stats-grid">
      <StatsCard
        v-for="(stat, i) in stats"
        :key="i"
        :title="stat.title"
        :value="stat.value"
        :trend="stat.trend"
        :trend-up="stat.trendUp"
        :icon-bg="stat.iconBg"
      >
        <template #icon>
          <!-- Users icon -->
          <svg v-if="i === 0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <!-- Parking icon -->
          <svg v-else-if="i === 1" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
          </svg>
          <!-- Revenue icon -->
          <svg v-else-if="i === 2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1v22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <!-- Warning icon -->
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </template>
      </StatsCard>
    </div>

    <!-- Chart -->
    <div class="dashboard__chart">
      <ParkingChart :activity-data="activityData" />
    </div>

    <!-- Bottom Grid -->
    <div class="dashboard__bottom-grid">
      <RecentActivity />
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 0;
}

.dashboard__welcome {
  margin-bottom: 24px;
}

.dashboard__welcome-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.dashboard__welcome-date {
  font-size: 14px;
  color: var(--color-muted);
  margin: 4px 0 0;
}

/* Stats Grid */
.dashboard__stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.dashboard__stats-grid > *:nth-child(1) { animation: fadeSlideUp 0.5s ease 0.05s both; }
.dashboard__stats-grid > *:nth-child(2) { animation: fadeSlideUp 0.5s ease 0.1s both; }
.dashboard__stats-grid > *:nth-child(3) { animation: fadeSlideUp 0.5s ease 0.15s both; }
.dashboard__stats-grid > *:nth-child(4) { animation: fadeSlideUp 0.5s ease 0.2s both; }

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Chart */
.dashboard__chart {
  margin-top: 20px;
}

/* Bottom Grid */
.dashboard__bottom-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 20px;
}

/* Responsive */
@media (max-width: 1200px) {
  .dashboard__bottom-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 1024px) {
  .dashboard__stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .dashboard__stats-grid {
    grid-template-columns: repeat(1, 1fr);
  }
}
</style>
