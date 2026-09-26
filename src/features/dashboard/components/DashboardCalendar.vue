<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api/axios'

import { cachedReservations } from '../dashboardCache'

const router = useRouter()

// Current date state
const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth()) // 0-indexed
const selectedDate = ref<string>(formatDateToKey(today))

const isLoading = ref(false)
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

// Navigation between months
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

// Days calculation for calendar grid
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

  // Sunday = 0
  const startDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const days: CalendarDay[] = []

  // 1. Prev month padding days
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

  // 2. Current month days
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

  // 3. Next month padding days to complete grid (multiples of 7)
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

// Selected date reservations
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

// Fetch reservations from API with realistic mock fallback
onMounted(async () => {
  if (!cachedReservations.value || cachedReservations.value.length === 0) {
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
      populateMockReservations()
    }
  } catch (err) {
    populateMockReservations()
  } finally {
    isLoading.value = false
  }
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

function getInitials(name: string): string {
  const parts = name.replace(/^(Dr\.|Prof\.|Engr\.)\s+/i, '').split(' ')
  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase()
  }
  return (name.slice(0, 2) || 'PF').toUpperCase()
}

const avatarColors = [
  'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  'linear-gradient(135deg, #10b981, #059669)',
  'linear-gradient(135deg, #f59e0b, #d97706)',
  'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  'linear-gradient(135deg, #ec4899, #be185d)'
]

function getAvatarColor(idx: number): string {
  return avatarColors[idx % avatarColors.length] || 'linear-gradient(135deg, #D22730, #991b1b)'
}

function navigateToReservations() {
  router.push('/reservations')
}
</script>

<template>
  <div class="calendar-widget">
    <!-- Calendar Card Header -->
    <div class="calendar-widget__header">
      <div class="calendar-widget__title-wrap">
        <h3 class="calendar-widget__month">{{ currentMonthLabel }}</h3>
        <button
          v-if="selectedDate !== formatDateToKey(today)"
          class="calendar-widget__today-btn"
          @click="goToToday"
        >
          Today
        </button>
      </div>

      <div class="calendar-widget__nav-btns">
        <button
          class="calendar-widget__arrow-btn"
          aria-label="Previous month"
          @click="prevMonth"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          class="calendar-widget__arrow-btn"
          aria-label="Next month"
          @click="nextMonth"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Weekday Header Row -->
    <div class="calendar-widget__weekdays">
      <span class="calendar-widget__weekday">S</span>
      <span class="calendar-widget__weekday">M</span>
      <span class="calendar-widget__weekday">T</span>
      <span class="calendar-widget__weekday">W</span>
      <span class="calendar-widget__weekday">T</span>
      <span class="calendar-widget__weekday">F</span>
      <span class="calendar-widget__weekday">S</span>
    </div>

    <!-- Day Matrix Grid -->
    <div class="calendar-widget__grid">
      <button
        v-for="(day, idx) in calendarDays"
        :key="`day-${idx}-${day.dateKey}`"
        class="calendar-widget__day-cell"
        :class="{
          'calendar-widget__day-cell--outside': !day.isCurrentMonth,
          'calendar-widget__day-cell--today': day.isToday,
          'calendar-widget__day-cell--selected': day.isSelected
        }"
        @click="selectDay(day)"
      >
        <span class="calendar-widget__day-number">{{ day.dayNumber }}</span>

        <!-- Clean event bar indicator (no dots, no numbers on day cell) -->
        <span v-if="day.eventsCount > 0" class="calendar-widget__event-bar" />
      </button>
    </div>

    <!-- Divider -->
    <div class="calendar-widget__divider" />

    <!-- Interactive Reservations Section -->
    <div class="calendar-widget__upcoming-header">
      <div class="calendar-widget__upcoming-title-row">
        <h4 class="calendar-widget__upcoming-title">{{ reservationSectionTitle }}</h4>
        <span class="calendar-widget__selected-tag">{{ selectedDateLabel }}</span>
      </div>
      <button class="calendar-widget__see-all" @click="navigateToReservations">
        View all →
      </button>
    </div>

    <!-- Upcoming List -->
    <div class="calendar-widget__upcoming-list">
      <div
        v-if="upcomingReservations.length === 0"
        class="calendar-widget__empty"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
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
        class="calendar-widget__item"
        @click="navigateToReservations"
      >
        <div class="calendar-widget__item-avatar" :style="{ background: getAvatarColor(i) }">
          {{ getInitials(item.userName) }}
        </div>

        <div class="calendar-widget__item-details">
          <div class="calendar-widget__item-name-row">
            <span class="calendar-widget__item-name">{{ item.userName }}</span>
          </div>
          <span class="calendar-widget__item-role">{{ item.userRole }} • {{ item.plateNumber }}</span>
        </div>

        <div class="calendar-widget__item-time-pill">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{{ item.startTime }}–{{ item.endTime }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-widget {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-card);
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* Header */
.calendar-widget__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.calendar-widget__title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.calendar-widget__month {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.2px;
}

.calendar-widget__today-btn {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-light);
  border: 1px solid rgba(210, 39, 48, 0.2);
  padding: 2px 7px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.calendar-widget__today-btn:hover {
  background: var(--color-primary);
  color: #fff;
}

.calendar-widget__nav-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

.calendar-widget__arrow-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.calendar-widget__arrow-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
  border-color: var(--color-subtle);
}

/* Weekdays */
.calendar-widget__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
  background: var(--color-surface-lighter);
  border-radius: 10px;
  padding: 6px 2px;
}

.calendar-widget__weekday {
  text-align: center;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
}

/* Day grid */
.calendar-widget__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-widget__day-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 38px;
  border-radius: 10px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  transition: all var(--transition-fast);
  padding: 2px 0;
}

.calendar-widget__day-cell:hover:not(.calendar-widget__day-cell--selected) {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.calendar-widget__day-cell--outside {
  color: var(--color-subtle);
  opacity: 0.45;
}

.calendar-widget__day-cell--today:not(.calendar-widget__day-cell--selected) {
  font-weight: 700;
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.calendar-widget__day-cell--selected {
  background: var(--color-primary) !important;
  color: #ffffff !important;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(210, 39, 48, 0.35);
}

.calendar-widget__day-cell--selected .calendar-widget__event-bar {
  background: #ffffff !important;
}

.calendar-widget__day-number {
  line-height: 1;
}

/* Event Bar Indicator */
.calendar-widget__event-bar {
  position: absolute;
  bottom: 4px;
  width: 14px;
  height: 2.5px;
  border-radius: 2px;
  background: var(--color-primary, #D22730);
}

.calendar-widget__dot {
  width: 3.5px;
  height: 3.5px;
  border-radius: 50%;
  background: var(--color-primary);
}

/* Divider */
.calendar-widget__divider {
  height: 1px;
  background: var(--color-border);
  margin: 18px 0;
}

/* Upcoming Section */
.calendar-widget__upcoming-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.calendar-widget__upcoming-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.calendar-widget__upcoming-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.2px;
  white-space: nowrap;
}

.calendar-widget__selected-tag {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 1.5px 7px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.calendar-widget__see-all {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity var(--transition-fast);
}

.calendar-widget__see-all:hover {
  opacity: 0.8;
  text-decoration: underline;
}

/* Upcoming List Items */
.calendar-widget__upcoming-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calendar-widget__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 12px;
  color: var(--color-muted);
  font-size: 12.5px;
  text-align: center;
  background: var(--color-surface-lighter);
  border-radius: 12px;
}

.calendar-widget__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--color-surface-lighter);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.calendar-widget__item:hover {
  background: var(--color-surface);
  border-color: var(--color-border);
}

.calendar-widget__item-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.5px;
}

.calendar-widget__item-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.calendar-widget__item-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.calendar-widget__item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calendar-widget__item-role {
  font-size: 11px;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calendar-widget__item-time-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
</style>
