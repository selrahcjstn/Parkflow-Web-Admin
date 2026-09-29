<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'

type AccountType = 'Guard' | 'Admin'

const props = defineProps<{
  isOpen: boolean
  registeredEmail: string
  accountType: AccountType
}>()

const emit = defineEmits<{
  (e: 'provisionAnother'): void
  (e: 'goToList'): void
}>()
</script>

<template>
  <UiModal
    :is-open="isOpen"
    size="sm"
    :show-close="false"
    :close-on-backdrop="false"
    :close-on-esc="false"
  >
    <div class="text-center space-y-4 py-2">
      <div class="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
        <svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>

      <div>
        <h3 class="text-xl font-bold text-slate-900 dark:text-white m-0">Staff Account Provisioned!</h3>
        <p class="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          The {{ accountType === 'Guard' ? 'Campus Security Guard' : 'System Administrator' }} account for <strong class="text-slate-900 dark:text-white font-semibold">{{ registeredEmail }}</strong> was successfully created. An email containing their initial password credentials has been dispatched to their inbox.
        </p>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-center gap-3 w-full">
        <UiButton
          type="button"
          variant="secondary"
          size="md"
          @click="emit('provisionAnother')"
        >
          Provision Another Account
        </UiButton>
        <UiButton
          type="button"
          variant="success"
          size="md"
          @click="emit('goToList')"
        >
          Go to Accounts List
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
