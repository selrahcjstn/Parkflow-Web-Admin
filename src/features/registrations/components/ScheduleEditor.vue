<script setup lang="ts">
import { ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'

export interface ScheduleItem {
  dayOfWeek: number
  startTime: string
  endTime: string
}

const props = defineProps<{
  schedules?: ScheduleItem[]
}>()

const emit = defineEmits<{
  (e: 'save', schedules: ScheduleItem[]): void
}>()

const dayNames: Record<number, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday'
}
const weeklyDays = [1, 2, 3, 4, 5, 6, 0]

const isEditingSchedule = ref(false)

function createDefaultEditForm(): Record<number, { active: boolean; startTime: string; endTime: string }> {
  const form: Record<number, { active: boolean; startTime: string; endTime: string }> = {}
  weeklyDays.forEach((day) => {
    form[day] = { active: false, startTime: '07:00', endTime: '19:00' }
  })
  return form
}

const scheduleEditForm = ref<Record<number, { active: boolean; startTime: string; endTime: string }>>(createDefaultEditForm())

function extractTimeString(timeStr?: string, defaultTime = '07:00'): string {
  if (!timeStr) return defaultTime
  const trimmed = timeStr.trim()
  if (trimmed.includes('T')) {
    const afterT = trimmed.split('T')[1]
    return afterT ? afterT.slice(0, 5) : defaultTime
  }
  const parts = trimmed.split(':')
  if (parts.length >= 2) {
    const h = (parts[0] || '07').padStart(2, '0')
    const m = (parts[1] || '00').padStart(2, '0')
    return `${h}:${m}`
  }
  return defaultTime
}

function populateFormFromSchedules(schedList?: ScheduleItem[]) {
  const form = createDefaultEditForm()
  if (schedList && schedList.length > 0) {
    schedList.forEach((s) => {
      const dayNum = typeof s.dayOfWeek === 'number' ? s.dayOfWeek : Number(s.dayOfWeek)
      const existing = form[dayNum]
      if (existing) {
        existing.active = true
        existing.startTime = extractTimeString(s.startTime, '07:00')
        existing.endTime = extractTimeString(s.endTime, '19:00')
      }
    })
  }
  return form
}

function startEditing() {
  scheduleEditForm.value = populateFormFromSchedules(props.schedules)
  isEditingSchedule.value = true
}

function saveSchedule() {
  const updatedSchedules: ScheduleItem[] = []
  weeklyDays.forEach((day) => {
    const item = scheduleEditForm.value[day]
    if (item && item.active) {
      const start = extractTimeString(item.startTime, '07:00')
      const end = extractTimeString(item.endTime, '19:00')
      updatedSchedules.push({
        dayOfWeek: day,
        startTime: `${start}:00`,
        endTime: `${end}:00`
      })
    }
  })
  isEditingSchedule.value = false
  emit('save', updatedSchedules)
}

function applyStandardHours() {
  weeklyDays.forEach((d) => {
    if (d >= 1 && d <= 5) {
      scheduleEditForm.value[d] = { active: true, startTime: '07:00', endTime: '19:00' }
    } else {
      scheduleEditForm.value[d] = { active: false, startTime: '07:00', endTime: '19:00' }
    }
  })
}

function applyFullWeekAccess() {
  weeklyDays.forEach((d) => {
    scheduleEditForm.value[d] = { active: true, startTime: '07:00', endTime: '21:00' }
  })
}

function clearAllDays() {
  weeklyDays.forEach((d) => {
    if (scheduleEditForm.value[d]) {
      scheduleEditForm.value[d].active = false
    }
  })
}

function formatTimeSpan(timeStr?: string): string {
  if (!timeStr) return '—'
  const clean = extractTimeString(timeStr, '')
  if (!clean) return timeStr
  const parts = clean.split(':')
  if (parts.length < 2) return timeStr
  let hours = parseInt(parts[0] || '0', 10)
  const minutes = parts[1] || '00'
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm}`
}

function getScheduleForDay(day: number): ScheduleItem | undefined {
  if (!props.schedules) return undefined
  return props.schedules.find((s) => Number(s.dayOfWeek) === day)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
      <h4 class="text-sm font-bold text-slate-900 dark:text-white m-0">Weekly Campus Access Hours</h4>
      <div class="flex items-center gap-2">
        <UiButton
          v-if="!isEditingSchedule"
          type="button"
          variant="secondary"
          size="xs"
          @click="startEditing"
        >
          Edit Hours
        </UiButton>
        <UiButton
          v-else
          type="button"
          variant="success"
          size="xs"
          @click="saveSchedule"
        >
          Save Schedule
        </UiButton>
      </div>
    </div>

    <!-- Presets (when editing) -->
    <div v-if="isEditingSchedule" class="flex items-center gap-2 flex-wrap pb-2">
      <button
        type="button"
        class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
        @click="applyStandardHours"
      >
        Standard 7AM-7PM (Mon-Fri)
      </button>
      <button
        type="button"
        class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
        @click="applyFullWeekAccess"
      >
        Full Week (Mon-Sun)
      </button>
      <button
        type="button"
        class="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
        @click="clearAllDays"
      >
        Clear All
      </button>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table class="w-full text-xs text-left">
        <thead class="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
          <tr>
            <th class="py-2.5 px-3">Day</th>
            <th class="py-2.5 px-3">Entry Time</th>
            <th class="py-2.5 px-3">Exit Time</th>
            <th class="py-2.5 px-3 text-right">Access Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          <template v-if="!isEditingSchedule">
            <tr v-for="d in weeklyDays" :key="`view-${d}`" class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
              <td class="py-2 px-3 font-semibold text-slate-900 dark:text-white">{{ dayNames[d] }}</td>
              <template v-if="getScheduleForDay(d)">
                <td class="py-2 px-3 text-slate-700 dark:text-slate-300 font-mono">{{ formatTimeSpan(getScheduleForDay(d)?.startTime) }}</td>
                <td class="py-2 px-3 text-slate-700 dark:text-slate-300 font-mono">{{ formatTimeSpan(getScheduleForDay(d)?.endTime) }}</td>
                <td class="py-2 px-3 text-right">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Allowed
                  </span>
                </td>
              </template>
              <template v-else>
                <td class="py-2 px-3 text-slate-400">—</td>
                <td class="py-2 px-3 text-slate-400">—</td>
                <td class="py-2 px-3 text-right">
                  <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    No Access
                  </span>
                </td>
              </template>
            </tr>
          </template>

          <template v-else>
            <tr v-for="d in weeklyDays" :key="`edit-${d}`" class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
              <td class="py-2 px-3">
                <label class="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-900 dark:text-white" v-if="scheduleEditForm[d]">
                  <input type="checkbox" v-model="scheduleEditForm[d].active" class="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
                  <span>{{ dayNames[d] }}</span>
                </label>
              </td>
              <td class="py-2 px-3">
                <input
                  v-if="scheduleEditForm[d]"
                  type="time"
                  v-model="scheduleEditForm[d].startTime"
                  :disabled="!scheduleEditForm[d].active"
                  class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs disabled:opacity-40"
                />
              </td>
              <td class="py-2 px-3">
                <input
                  v-if="scheduleEditForm[d]"
                  type="time"
                  v-model="scheduleEditForm[d].endTime"
                  :disabled="!scheduleEditForm[d].active"
                  class="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs disabled:opacity-40"
                />
              </td>
              <td class="py-2 px-3 text-right">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold"
                  :class="scheduleEditForm[d]?.active ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'"
                >
                  {{ scheduleEditForm[d]?.active ? 'Active' : 'Off' }}
                </span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
