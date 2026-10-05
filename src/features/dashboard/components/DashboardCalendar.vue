<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'
import SkeletonLoader from '@/components/ui/SkeletonLoader.vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiAvatar from '@/components/ui/UiAvatar.vue'
import { useAdminNotificationStore } from '@/stores/notification.store'
import { formatTimeRange12 } from '@/utils/formatTime'

import { cachedReservations } from '@/stores/appCache'

const router = useRouter()

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
const selectedDate = ref<string>(formatDateToKey(today))

const isLoading = ref(!cachedReservations.value)
const reservations = ref<Array<{
  id: string
  userName: string
  userRole: string
  plateNumber: string
  date: string
  startTime: string
  endTime: string
  status: string
  type: string
}>>(cachedReservations.value || [])

function formatDateToKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const currentMonthLabel = computed(() => {
  return `${monthNames[currentMonth.value]}, ${currentYear.value}`
})

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function goToToday() {
  const now = new Date()
  currentYear.value = now.getFullYear()
  currentMonth.value = now.getMonth()
  selectedDate.value = formatDateToKey(now)
}

interface CalendarDay {
  date: Date
  dateKey: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  eventsCount: number
}

const calendarDays = computed<CalendarDay[]>(() => {
  const year = currentYear.value
  const month = currentMonth.value

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)

  const startDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const days: CalendarDay[] = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i)
    const key = formatDateToKey(d)
    days.push({
      date: d,
      dateKey: key,
      dayNumber: d.getDate(),
      isCurrentMonth: false,
      isToday: key === formatDateToKey(today),
      isSelected: key === selectedDate.value,
      eventsCount: getEventsCountForDate(key)
    })
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day)
    const key = formatDateToKey(d)
    days.push({
      date: d,
      dateKey: key,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: key === formatDateToKey(today),
      isSelected: key === selectedDate.value,
      eventsCount: getEventsCountForDate(key)
    })
  }

  const remainingCells = (7 - (days.length % 7)) % 7
  for (let day = 1; day <= remainingCells; day++) {
    const d = new Date(year, month + 1, day)
    const key = formatDateToKey(d)
    days.push({
      date: d,
      dateKey: key,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: key === formatDateToKey(today),
      isSelected: key === selectedDate.value,
      eventsCount: getEventsCountForDate(key)
    })
  }

  return days
})

function getEventsCountForDate(key: string): number {
  return reservations.value.filter(r => r.date === key).length
}

function selectDay(day: CalendarDay) {
  selectedDate.value = day.dateKey
  if (!day.isCurrentMonth) {
    currentYear.value = day.date.getFullYear()
    currentMonth.value = day.date.getMonth()
  }
}

const selectedDateReservations = computed(() => {
  return reservations.value.filter(r => r.date === selectedDate.value)
})

const upcomingReservations = computed(() => {
  return selectedDateReservations.value
})

const selectedDateLabel = computed(() => {
  const [yStr, mStr, dStr] = selectedDate.value.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  const d = Number(dStr)
  if (!y || !m || !d) return 'Selected Date'
  const dateObj = new Date(y, m - 1, d)
  const isSelectedToday = selectedDate.value === formatDateToKey(today)
  if (isSelectedToday) return 'Today'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(dateObj)
})

const reservationSectionTitle = computed(() => {
  const [yStr, mStr, dStr] = selectedDate.value.split('-')
  const y = Number(yStr)
  const m = Number(mStr)
  const d = Number(dStr)
  if (!y || !m || !d) return 'Reservations'

  const selectedObj = new Date(y, m - 1, d)
  const todayObj = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (selectedObj.getTime() < todayObj.getTime()) {
    return 'Past Reservations'
  } else if (selectedObj.getTime() === todayObj.getTime()) {
    return "Today's Reservations"
  } else {
    return 'Upcoming Reservations'
  }
})

async function fetchReservationsData(silent = false) {
  if (!silent && (!cachedReservations.value || cachedReservations.value.length === 0)) {
    isLoading.value = true
  }
  try {
    const res = await api.get('/parking-reservations/admin/all')
    if (res.data && res.data.isSuccess && Array.isArray(res.data.data)) {
      const mapped = res.data.data.map((item: any) => ({
        id: item.id || String(Math.random()),
        userName: item.userFullName || 'Authorized User',
        userRole: item.role || (item.type === 1 || item.type === 'Special' ? 'VIP / Event' : 'Faculty / Staff'),
        plateNumber: item.plateNumber || 'TBA',
        date: item.reservationDate ? item.reservationDate.split('T')[0] : formatDateToKey(today),
        startTime: item.startTime ? item.startTime.slice(0, 5) : '08:00',
        endTime: item.endTime ? item.endTime.slice(0, 5) : '17:00',
        status: String(item.status || 'Approved'),
        type: item.type === 1 || item.type === 'Special' ? 'Special' : 'Regular'
      }))
      reservations.value = mapped
      cachedReservations.value = mapped
    } else {
      if (!silent) populateMockReservations()
    }
  } catch (err) {
    if (!silent && reservations.value.length === 0) populateMockReservations()
  } finally {
    if (!silent) isLoading.value = false
  }
}

let unsubscribeRes: (() => void) | null = null
let unsubscribeApp: (() => void) | null = null

onMounted(async () => {
  const notifStore = useAdminNotificationStore()
  notifStore.initSignalRConnection()

  const handleUpdate = () => {
    fetchReservationsData(true)
  }
  unsubscribeRes = notifStore.onReservationUpdate(handleUpdate)
  unsubscribeApp = notifStore.onApprovalUpdate(handleUpdate)

  await fetchReservationsData()
})

onUnmounted(() => {
  if (unsubscribeRes) unsubscribeRes()
  if (unsubscribeApp) unsubscribeApp()
})

function populateMockReservations() {
  const todayKey = formatDateToKey(today)
  const d1 = new Date(today)
  d1.setDate(d1.getDate() + 1)
  const d1Key = formatDateToKey(d1)

  const d2 = new Date(today)
  d2.setDate(d2.getDate() + 3)
  const d2Key = formatDateToKey(d2)

  const d3 = new Date(today)
  d3.setDate(d3.getDate() + 6)
  const d3Key = formatDateToKey(d3)

  reservations.value = [
    {
      id: 'res-1',
      userName: 'Dr. Simmons Perez',
      userRole: 'College Dean / Faculty',
      plateNumber: 'ABC-1029',
      date: todayKey,
      startTime: '10:00',
      endTime: '12:45',
      status: 'Approved',
      type: 'Special'
    },
    {
      id: 'res-2',
      userName: 'Jenny Wilson',
      userRole: 'Administrative Staff',
      plateNumber: 'NBT-8921',
      date: todayKey,
      startTime: '13:00',
      endTime: '16:30',
      status: 'Approved',
      type: 'Regular'
    },
    {
      id: 'res-3',
      userName: 'Devon Lane',
      userRole: 'Campus Guest Speaker',
      plateNumber: 'XYZ-4590',
      date: d1Key,
      startTime: '09:00',
      endTime: '14:00',
      status: 'Pending',
      type: 'Special'
    },
    {
      id: 'res-4',
      userName: 'Engr. Ronald Cruz',
      userRole: 'Physical Plant Staff',
      plateNumber: 'PUQ-7782',
      date: d2Key,
      startTime: '08:30',
      endTime: '17:00',
      status: 'Approved',
      type: 'Regular'
    },
    {
      id: 'res-5',
      userName: 'Prof. Alicia Gomez',
      userRole: 'Faculty / Professor',
      plateNumber: 'CAL-2341',
      date: d3Key,
      startTime: '11:00',
      endTime: '15:30',
      status: 'Approved',
      type: 'Regular'
    }
  ]
}

const avatarGradients = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #ec4899, #be185d)'
]

function getAvatarColor(idx: number): string {
  return avatarGradients[idx % avatarGradients.length] || 'linear-gradient(135deg, #7B1113, #991b1b)'
}

function navigateToReservations() {
  router.push('/reservations')
}
</script>

<template>
  <UiCard custom-class="flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2.5">
        <h3 class="text-base font-bold text-slate-900 dark:text-white tracking-tight m-0">
          {{ currentMonthLabel }}
        </h3>
        <button
          v-if="selectedDate !== formatDateToKey(today)"
          type="button"
          @click="goToToday"
          class="text-[11px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md cursor-pointer transition-all"
        >
          Today
        </button>
      </div>

      <div class="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="Previous month"
          @click="prevMonth"
          class="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label="Next month"
          @click="nextMonth"
          class="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Weekday Header Row -->
    <div class="grid grid-cols-7 gap-1 mb-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-1.5">
      <span v-for="w in ['S', 'M', 'T', 'W', 'T', 'F', 'S']" :key="w" class="text-center text-[11.5px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
        {{ w }}
      </span>
    </div>

    <!-- Day Grid -->
    <div v-if="isLoading" class="grid grid-cols-7 gap-1">
      <SkeletonLoader v-for="i in 35" :key="`skel-grid-${i}`" variant="rect" height="38px" style="border-radius: 10px;" />
    </div>
    <div v-else class="grid grid-cols-7 gap-1">
      <button
        v-for="(day, idx) in calendarDays"
        :key="`day-${idx}-${day.dateKey}`"
        type="button"
        @click="selectDay(day)"
        :class="[
          'relative flex flex-col items-center justify-center h-9 rounded-xl border-none cursor-pointer text-xs font-medium transition-all p-0.5',
          !day.isCurrentMonth ? 'text-slate-400 opacity-45 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200',
          day.isToday && !day.isSelected ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold' : '',
          day.isSelected ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-600/30 dark:bg-rose-600 dark:text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
        ]"
      >
        <span class="leading-none">{{ day.dayNumber }}</span>
        <span v-if="day.eventsCount > 0" :class="['absolute bottom-1 w-3.5 h-[2.5px] rounded-full', day.isSelected ? 'bg-white' : 'bg-rose-600']" />
      </button>
    </div>

    <!-- Divider -->
    <div class="h-px bg-slate-100 dark:bg-slate-800 my-4" />

    <!-- Interactive Reservations Header -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <h4 class="text-sm font-bold text-slate-900 dark:text-white m-0 tracking-tight truncate">
          {{ reservationSectionTitle }}
        </h4>
        <span class="text-[10.5px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400 px-1.5 py-0.5 rounded-md flex-shrink-0">
          {{ selectedDateLabel }}
        </span>
      </div>
      <button
        type="button"
        @click="navigateToReservations"
        class="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline cursor-pointer bg-transparent border-none p-0 flex-shrink-0"
      >
        View all →
      </button>
    </div>

    <!-- Upcoming List -->
    <div class="flex flex-col gap-2">
      <template v-if="isLoading">
        <SkeletonLoader v-for="i in 2" :key="`skel-res-${i}`" variant="rect" height="54px" style="border-radius: 12px;" />
      </template>
      <div
        v-else-if="upcomingReservations.length === 0"
        class="flex flex-col items-center justify-center gap-1.5 p-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="text-slate-400">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>No reservations for this date</span>
      </div>

      <div
        v-else
        v-for="(item, i) in upcomingReservations"
        :key="item.id"
        @click="navigateToReservations"
        class="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer hover:bg-indigo-50/40 hover:border-indigo-300 dark:hover:bg-slate-800 transition-all shadow-2xs"
      >
        <UiAvatar :name="item.userName" :bg-gradient="getAvatarColor(i)" size="sm" />

        <div class="flex flex-col flex-1 min-w-0">
          <span class="text-xs font-semibold text-slate-900 dark:text-white truncate leading-snug">
            {{ item.userName }}
          </span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {{ item.userRole }} • {{ item.plateNumber }}
          </span>
        </div>

        <div class="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 rounded-full text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{{ formatTimeRange12(item.startTime, item.endTime, ' – ') }}</span>
        </div>
      </div>
    </div>
  </UiCard>
</template>
