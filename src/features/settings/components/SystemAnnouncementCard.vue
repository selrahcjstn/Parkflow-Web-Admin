<script setup lang="ts">
import UiCard from '@/components/ui/UiCard.vue'
import UiInput from '@/components/ui/UiInput.vue'
import UiTextarea from '@/components/ui/UiTextarea.vue'
import UiButton from '@/components/ui/UiButton.vue'

interface SystemAnnouncement {
  id?: string
  title?: string
  message: string
  iconType: 'caution' | 'good_news' | 'info' | 'maintenance' | 'urgent'
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

const props = defineProps<{
  announcement: SystemAnnouncement
  isSaving: boolean
}>()

const emit = defineEmits<{
  (e: 'save'): void
  (e: 'deactivate'): void
}>()

const iconOptions: Array<{
  type: 'caution' | 'good_news' | 'info' | 'maintenance' | 'urgent'
  label: string
  color: string
}> = [
  { type: 'caution', label: 'Caution', color: 'bg-amber-500' },
  { type: 'good_news', label: 'Good News', color: 'bg-emerald-500' },
  { type: 'info', label: 'Info', color: 'bg-blue-500' },
  { type: 'maintenance', label: 'Maintenance', color: 'bg-purple-500' },
  { type: 'urgent', label: 'Urgent', color: 'bg-rose-500' }
]
</script>

<template>
  <UiCard custom-class="p-6 space-y-5">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      </div>
      <div>
        <h3 class="text-sm font-bold text-slate-900 dark:text-white">System Broadcast Announcement</h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Display a global banner on user mobile apps and web admin headers
        </p>
      </div>
    </div>

    <div class="space-y-4">
      <!-- Title -->
      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Announcement Title / Headline
        </label>
        <UiInput
          v-model="announcement.title"
          type="text"
          placeholder="e.g. Scheduled Campus Gate Maintenance"
          size="md"
          :maxlength="60"
        />
      </div>

      <!-- Icon / Type Selector -->
      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
          Banner Theme / Icon Category
        </label>
        <div class="flex items-center gap-2 flex-wrap">
          <button
            v-for="opt in iconOptions"
            :key="opt.type"
            type="button"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer"
            :class="[
              announcement.iconType === opt.type
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            ]"
            @click="announcement.iconType = opt.type"
          >
            <span class="w-2 h-2 rounded-full" :class="opt.color"></span>
            <span>{{ opt.label }}</span>
          </button>
        </div>
      </div>

      <!-- Message -->
      <div>
        <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
          Announcement Details
        </label>
        <UiTextarea
          v-model="announcement.message"
          placeholder="Enter the full announcement text visible across campus accounts..."
          :rows="3"
        />
      </div>

      <!-- Active Switch & Actions -->
      <div class="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
        <label class="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            v-model="announcement.isActive"
            type="checkbox"
            class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
          Broadcast Active to Clients
        </label>

        <div class="flex items-center gap-2">
          <UiButton
            v-if="announcement.isActive"
            variant="secondary"
            size="sm"
            :disabled="isSaving"
            @click="emit('deactivate')"
          >
            Deactivate
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :loading="isSaving"
            @click="emit('save')"
          >
            Publish Broadcast
          </UiButton>
        </div>
      </div>
    </div>
  </UiCard>
</template>
