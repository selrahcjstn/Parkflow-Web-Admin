<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import StatsCard from '../components/StatsCard.vue'
import ParkingChart from '../components/ParkingChart.vue'
import RecentActivity from '../components/RecentActivity.vue'
import PendingRegistrations from '../components/PendingRegistrations.vue'
import DashboardCalendar from '../components/DashboardCalendar.vue'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import api from '@/api/axios'

const isLoading = ref(true)

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

const stats = computed(() => {
  const occPercent = statsData.value.maxCapacity > 0
    ? Math.round((statsData.value.activeParking / statsData.value.maxCapacity) * 100)
    : 0

  return [
    {
      title: 'Registered Clients',
      value: statsData.value.totalUsers.toLocaleString(),
      subtitle: 'Permits & driver accounts',
      trend: '+12.5%',
      trendUp: true,
      accentColor: '#2563eb',
      badgeBg: 'rgba(37, 99, 235, 0.12)'
    },
    {
      title: 'Slot Occupancy',
      value: `${statsData.value.activeParking} / ${statsData.value.maxCapacity}`,
      subtitle: `${statsData.value.maxCapacity - statsData.value.activeParking} slots available`,
      trend: `${occPercent}% full`,
      trendUp: occPercent < 85,
      accentColor: '#059669',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      progressPercent: occPercent
    },
    {
      title: 'Daily Revenue',
      value: `₱${statsData.value.todayRevenue.toLocaleString()}`,
      subtitle: "Today's logged collections",
      trend: '+8.1%',
      trendUp: true,
      accentColor: '#d97706',
      badgeBg: 'rgba(245, 158, 11, 0.12)'
    },
    {
      title: 'Pending Citations',
      value: `${statsData.value.violations} Citations`,
      subtitle: 'Unsettled parking fines',
      trend: '-3.4%',
      trendUp: false,
      accentColor: '#D22730',
      badgeBg: 'rgba(210, 39, 48, 0.12)'
    }
  ]
})

const activityData = ref<{ day: string; checkIns: number; checkOuts: number }[]>([])

onMounted(async () => {
  isLoading.value = true
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
    statsData.value = {
      totalUsers: 142,
      activeParking: 38,
      todayRevenue: 2450,
      violations: 5,
      maxCapacity: 150
    }
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="dashboard">
    <!-- Welcome Header -->
    <div class="dashboard__welcome">
      <h1 class="dashboard__welcome-title">Welcome back, Admin</h1>
      <p class="dashboard__welcome-date">{{ formattedDate }}</p>
    </div>

    <!-- Stats Grid (Full Width Top Baseline) -->
    <div class="dashboard__stats-grid">
      <template v-if="isLoading">
        <SkeletonLoader v-for="i in 4" :key="`skel-stat-${i}`" variant="rect" height="148px" />
      </template>
      <template v-else>
        <StatsCard
          v-for="(stat, i) in stats"
          :key="i"
          :title="stat.title"
          :value="stat.value"
          :subtitle="stat.subtitle"
          :trend="stat.trend"
          :trend-up="stat.trendUp"
          :accent-color="stat.accentColor"
          :badge-bg="stat.badgeBg"
          :progress-percent="stat.progressPercent"
        >
          <template #icon>
            <!-- Registered Clients Icon -->
            <svg v-if="i === 0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <!-- Slot Occupancy Icon (Parking Stall Bay) -->
            <svg v-else-if="i === 1" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="4" />
              <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
              <circle cx="16" cy="15" r="1.5" fill="currentColor" />
            </svg>
            <!-- Daily Revenue Icon (Card & Payment Receipt) -->
            <svg v-else-if="i === 2" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3" />
              <line x1="2" y1="10" x2="22" y2="10" />
              <path d="M6 15h2" />
              <circle cx="16" cy="15" r="1.5" fill="currentColor" />
            </svg>
            <!-- Pending Citations Icon (Security Shield Alert) -->
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
          </template>
        </StatsCard>
      </template>
    </div>

    <!-- Main Content Area: Chart & Tables on Left, Calendar on Right -->
    <div class="dashboard__content-layout">
      <!-- Left Main Column -->
      <div class="dashboard__left-col">
        <!-- Parking Chart -->
        <div class="dashboard__chart-wrap">
          <template v-if="isLoading">
            <SkeletonLoader variant="rect" height="300px" />
          </template>
          <template v-else>
            <ParkingChart :activity-data="activityData" />
          </template>
        </div>

        <!-- Recent Activity Table -->
        <RecentActivity />

        <!-- Pending Registrations -->
        <PendingRegistrations />
      </div>

      <!-- Right Column: Grounded Calendar & Upcoming Reservations -->
      <div class="dashboard__right-col">
        <DashboardCalendar />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 0;
}

/* Welcome Header */
.dashboard__welcome {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dashboard__welcome-title {
  font-size: 26px;
  font-weight: 800;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.3px;
}

.dashboard__welcome-date {
  font-size: 14px;
  color: var(--color-muted);
  margin: 0;
}

/* Stats Grid - Solid top 4-card row */
.dashboard__stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.dashboard__stats-grid > *:nth-child(1) { animation: fadeSlideUp 0.4s ease 0.05s both; }
.dashboard__stats-grid > *:nth-child(2) { animation: fadeSlideUp 0.4s ease 0.1s both; }
.dashboard__stats-grid > *:nth-child(3) { animation: fadeSlideUp 0.4s ease 0.15s both; }
.dashboard__stats-grid > *:nth-child(4) { animation: fadeSlideUp 0.4s ease 0.2s both; }

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Main Content Layout - Grounded, no floating/sticky */
.dashboard__content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
}

/* Left column containing chart and tables */
.dashboard__left-col {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.dashboard__chart-wrap {
  width: 100%;
}

/* Right column containing calendar - completely grounded */
.dashboard__right-col {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Responsive adjustments */
@media (max-width: 1280px) {
  .dashboard__content-layout {
    grid-template-columns: minmax(0, 1fr) 340px;
    gap: 20px;
  }

  .dashboard__stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .dashboard__content-layout {
    grid-template-columns: 1fr;
  }

  .dashboard__stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .dashboard__stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
