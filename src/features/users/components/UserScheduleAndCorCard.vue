<script setup lang="ts">
import { ref, computed } from 'vue'
import UiCard from '@/components/ui/UiCard.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import type { UserScheduleItem } from '../types'
import { formatDocUrl, isPdfDoc, getDocDownloadUrl } from '@/utils/documentUrl'

const props = defineProps<{
  corUrl?: string | null
  academicTerm?: string | null
  corStatus?: string
  schedules?: UserScheduleItem[]
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

function formatTimeSpan(timeStr?: string): string {
  if (!timeStr) return '—'
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  let hours = parseInt(parts[0] || '0', 10)
  const minutes = parts[1] || '00'
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${ampm}`
}

const activeDaysCount = computed(() => {
  if (!props.schedules) return 0
  return props.schedules.length
})

// Zoom Modal State for Image CORs
const isZoomed = ref(false)

function getCorBadgeVariant(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = (status || '').toLowerCase()
  if (s === 'verified' || s === 'approved') return 'success'
  if (s === 'pending') return 'warning'
  if (s === 'rejected') return 'danger'
  return 'neutral'
}

function getCorBadgeLabel(status?: string): string {
  const s = (status || '').toLowerCase()
  if (s === 'verified' || s === 'approved') return 'Approved'
  if (s === 'pending') return 'Pending'
  if (s === 'rejected') return 'Rejected'
  return 'Not Submitted'
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <!-- 1. Certificate of Registration (COR) Document Card -->
    <UiCard class="p-6 space-y-5 flex flex-col justify-between">
      <div>
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[#D22730] flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Certificate of Registration (COR)</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Official academic enrollment proof &amp; verification document</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <UiBadge :variant="getCorBadgeVariant(corStatus)" size="xs">
              {{ getCorBadgeLabel(corStatus) }}
            </UiBadge>
          </div>
        </div>

        <!-- Meta strip -->
        <div class="flex items-center justify-between py-2.5 px-3.5 my-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
          <span class="text-slate-500 dark:text-slate-400 font-medium">Academic Term:</span>
          <span class="font-bold text-slate-900 dark:text-white">{{ academicTerm || 'AY 2026-2027' }}</span>
        </div>

        <!-- Document Preview Body -->
        <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-3 min-h-[260px] flex items-center justify-center">
          <template v-if="corUrl">
            <!-- PDF Document Frame -->
            <div v-if="isPdfDoc(corUrl)" class="w-full flex flex-col items-center gap-3">
              <iframe
                :src="formatDocUrl(corUrl)"
                class="w-full h-[280px] rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
                title="COR Document PDF"
              ></iframe>
            </div>

            <!-- Image Document Preview -->
            <div
              v-else
              class="relative group cursor-pointer w-full h-[280px] rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
              @click="isZoomed = true"
              title="Click to enlarge"
            >
              <img
                :src="formatDocUrl(corUrl)"
                alt="Certificate of Registration"
                class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <div class="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/>
                  <line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
                <span>Click to Zoom</span>
              </div>
            </div>
          </template>

          <!-- No Document State -->
          <div v-else class="flex flex-col items-center justify-center text-center p-8 text-slate-400 dark:text-slate-500">
            <svg class="w-10 h-10 mb-2.5 opacity-40 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span class="text-xs font-bold text-slate-700 dark:text-slate-300">No COR Document Uploaded</span>
            <p class="text-[11px] text-slate-400 mt-1 max-w-xs">This client has not uploaded an enrollment certificate or Certificate of Registration.</p>
          </div>
        </div>
      </div>

      <!-- Action Buttons Footer -->
      <div v-if="corUrl" class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
        <a
          :href="formatDocUrl(corUrl)"
          target="_blank"
          rel="noopener noreferrer"
          class="px-3 py-1.5 rounded-lg bg-[#D22730] hover:bg-[#B81E26] text-white text-xs font-semibold transition-colors no-underline inline-flex items-center gap-1.5"
        >
          <span>Open Full View</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
        <a
          :href="getDocDownloadUrl(corUrl)"
          download
          class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors no-underline inline-flex items-center gap-1.5"
        >
          <span>Download</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
      </div>
    </UiCard>

    <!-- 2. Approved Parking Timetable Schedule Card -->
    <UiCard class="p-6 space-y-5 flex flex-col justify-between">
      <div>
        <!-- Header -->
        <div class="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Approved Parking Schedule</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Weekly campus entrance &amp; departure time allocations</p>
            </div>
          </div>

          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            {{ activeDaysCount }} Active {{ activeDaysCount === 1 ? 'Day' : 'Days' }}
          </span>
        </div>

        <!-- Weekly Schedule Table -->
        <div class="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-xs text-left">
            <thead class="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
              <tr>
                <th class="py-2.5 px-3.5">Day</th>
                <th class="py-2.5 px-3">Entry Time</th>
                <th class="py-2.5 px-3">Exit Time</th>
                <th class="py-2.5 px-3 text-right">Access</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr v-for="d in weeklyDays" :key="`sched-${d}`" class="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                <td class="py-2.5 px-3.5 font-semibold text-slate-900 dark:text-white">{{ dayNames[d] }}</td>
                <template v-if="schedules?.find(s => s.dayOfWeek === d)">
                  <td class="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono font-medium">{{ formatTimeSpan(schedules.find(s => s.dayOfWeek === d)?.startTime) }}</td>
                  <td class="py-2.5 px-3 text-slate-700 dark:text-slate-300 font-mono font-medium">{{ formatTimeSpan(schedules.find(s => s.dayOfWeek === d)?.endTime) }}</td>
                  <td class="py-2.5 px-3 text-right">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Allowed
                    </span>
                  </td>
                </template>
                <template v-else>
                  <td class="py-2.5 px-3 text-slate-400">—</td>
                  <td class="py-2.5 px-3 text-slate-400">—</td>
                  <td class="py-2.5 px-3 text-right">
                    <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-400">
                      Off
                    </span>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
        <svg class="w-4 h-4 text-indigo-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>Gate scanner strictly enforces entry within approved time windows plus campus grace periods.</span>
      </div>
    </UiCard>

    <!-- Zoom Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isZoomed && corUrl" class="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" @click="isZoomed = false">
          <div class="relative max-w-4xl w-full max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-800" @click.stop>
            <div class="flex items-center justify-between px-5 py-3.5 bg-slate-800/80 border-b border-slate-700/60 text-white">
              <span class="text-sm font-bold">Certificate of Registration (COR)</span>
              <button
                type="button"
                class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer border-none bg-transparent"
                @click="isZoomed = false"
              >
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div class="p-4 flex items-center justify-center overflow-auto max-h-[calc(90vh-60px)] bg-slate-950">
              <img
                :src="formatDocUrl(corUrl)"
                alt="Certificate of Registration"
                class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
