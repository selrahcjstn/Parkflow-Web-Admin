<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ApprovalItem } from '../pages/RegistrationsPage.vue'
import ScheduleEditor, { type ScheduleItem } from './ScheduleEditor.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import UiBadge from '@/components/ui/UiBadge.vue'
import { isPdfDoc, getDocDownloadUrl } from '@/utils/documentUrl'

const props = defineProps<{
  item: ApprovalItem | null
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'approve', item: ApprovalItem): void
  (e: 'reject', item: ApprovalItem): void
  (e: 'saveSchedule', item: ApprovalItem, schedules: ScheduleItem[]): void
  (e: 'zoomImage', url: string): void
}>()

const activeDocType = ref<'schedule' | 'cor' | 'orcr' | 'motorPic'>('cor')

const defaultCorPdf = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
const defaultOrcrImage = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80'
const defaultMotorImage = 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80'

watch(
  () => props.item,
  (newItem) => {
    if (newItem) {
      if (newItem.category === 'Schedule') {
        activeDocType.value = 'schedule'
      } else if (newItem.category === 'Vehicle') {
        activeDocType.value = 'orcr'
      } else {
        activeDocType.value = 'cor'
      }
    }
  },
  { immediate: true }
)

function getStatusBadgeVariant(status?: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

function handleImageError(event: Event, fallback: string) {
  const target = event.target as HTMLImageElement
  if (target && target.src !== fallback) {
    target.src = fallback
  }
}
</script>

<template>
  <UiModal
    :is-open="isOpen && !!item"
    size="xl"
    @close="emit('close')"
  >
    <template #header>
      <div v-if="item" class="flex items-center justify-between w-full pr-6">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm flex-shrink-0">
            {{ item.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base font-bold text-slate-900 dark:text-white m-0">{{ item.fullName }}</h3>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                {{ item.category }}
              </span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400 m-0">{{ item.email }} • Applied {{ item.dateApplied }}</p>
          </div>
        </div>

        <UiBadge :variant="getStatusBadgeVariant(item.status)" size="sm">
          {{ item.status.charAt(0).toUpperCase() + item.status.slice(1) }}
        </UiBadge>
      </div>
    </template>

    <div v-if="item" class="space-y-5">
      <!-- Top Overview Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 text-xs">
        <div>
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Role</span>
          <span class="font-semibold text-slate-900 dark:text-white">{{ item.role }}</span>
        </div>
        <div>
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Academic Term</span>
          <span class="font-semibold text-slate-900 dark:text-white">{{ item.academicTerm || 'AY 2026-2027' }}</span>
        </div>
        <div>
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Vehicle Plate</span>
          <span class="font-mono font-bold text-slate-900 dark:text-white">{{ item.vehiclePlate || '—' }}</span>
        </div>
        <div>
          <span class="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Vehicle Type</span>
          <span class="font-semibold text-slate-900 dark:text-white">{{ item.vehicleType || '—' }}</span>
        </div>
      </div>

      <!-- Document Tabs Switcher -->
      <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <template v-if="item.category === 'Registration'">
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
            :class="activeDocType === 'cor' ? 'bg-[#D22730] text-white border-[#D22730]' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'"
            @click="activeDocType = 'cor'"
          >
            Certificate of Registration (COR)
          </button>
        </template>

        <template v-else-if="item.category === 'Schedule'">
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
            :class="activeDocType === 'schedule' ? 'bg-[#D22730] text-white border-[#D22730]' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'"
            @click="activeDocType = 'schedule'"
          >
            Class Access Schedule
          </button>
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
            :class="activeDocType === 'cor' ? 'bg-[#D22730] text-white border-[#D22730]' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'"
            @click="activeDocType = 'cor'"
          >
            COR Document
          </button>
        </template>

        <template v-else-if="item.category === 'Vehicle'">
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
            :class="activeDocType === 'orcr' ? 'bg-[#D22730] text-white border-[#D22730]' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'"
            @click="activeDocType = 'orcr'"
          >
            OR/CR Document
          </button>
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border"
            :class="activeDocType === 'motorPic' ? 'bg-[#D22730] text-white border-[#D22730]' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'"
            @click="activeDocType = 'motorPic'"
          >
            Vehicle Photo
          </button>
        </template>
      </div>

      <!-- Preview Display Box -->
      <div class="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 min-h-[340px]">
        <!-- 1. Schedule editor -->
        <ScheduleEditor
          v-if="activeDocType === 'schedule'"
          :schedules="item.schedules"
          @save="emit('saveSchedule', item, $event)"
        />

        <!-- 2. COR or PDF Document Preview -->
        <div v-else-if="activeDocType === 'cor' || (activeDocType === 'orcr' && isPdfDoc(item.orcrUrl))" class="space-y-3">
          <iframe
            :src="(activeDocType === 'cor' ? item.corUrl : item.orcrUrl) || defaultCorPdf"
            class="w-full h-[400px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            title="Verification PDF Document"
          ></iframe>
          <div class="flex items-center justify-end gap-2">
            <a
              :href="(activeDocType === 'cor' ? item.corUrl : item.orcrUrl) || '#'"
              target="_blank"
              rel="noopener noreferrer"
              class="px-3 py-1.5 rounded-lg bg-[#D22730] hover:bg-[#B81E26] text-white text-xs font-semibold transition-colors no-underline"
            >
              Open in New Tab
            </a>
            <a
              :href="getDocDownloadUrl(activeDocType === 'cor' ? item.corUrl : item.orcrUrl)"
              download
              class="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors no-underline"
            >
              Download PDF
            </a>
          </div>
        </div>

        <!-- 3. Image preview (OR/CR or Motorcycle Photo) -->
        <div v-else class="flex flex-col items-center justify-center p-4">
          <img
            :src="(activeDocType === 'orcr' ? item.orcrUrl : item.motorPicUrl) || (activeDocType === 'orcr' ? defaultOrcrImage : defaultMotorImage)"
            :alt="activeDocType === 'orcr' ? 'OR/CR Receipt' : 'Vehicle Photo'"
            class="max-h-[380px] max-w-full object-contain rounded-xl shadow-md cursor-pointer hover:opacity-95 transition-opacity"
            @error="handleImageError($event, activeDocType === 'orcr' ? defaultOrcrImage : defaultMotorImage)"
            @click="emit('zoomImage', (activeDocType === 'orcr' ? item.orcrUrl : item.motorPicUrl) || '')"
          />
          <p class="text-xs text-slate-400 mt-2">Click image to view full resolution</p>
        </div>
      </div>
    </div>

    <template #footer>
      <div v-if="item" class="flex items-center justify-between w-full">
        <UiButton
          type="button"
          variant="secondary"
          size="md"
          @click="emit('close')"
        >
          Close
        </UiButton>

        <div class="flex items-center gap-2">
          <UiButton
            type="button"
            variant="danger"
            size="md"
            @click="emit('reject', item)"
          >
            Reject Request
          </UiButton>
          <UiButton
            type="button"
            variant="success"
            size="md"
            @click="emit('approve', item)"
          >
            Approve & Verify
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>
