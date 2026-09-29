<script setup lang="ts">
import UiModal from '@/components/ui/UiModal.vue'

const props = defineProps<{
  imageUrl: string | null
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <UiModal
    :is-open="!!imageUrl"
    size="xl"
    @close="emit('close')"
  >
    <div class="flex items-center justify-center p-2 bg-slate-950 rounded-xl overflow-hidden min-h-[300px]">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        alt="Enlarged Document Preview"
        class="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
      />
    </div>
  </UiModal>
</template>
