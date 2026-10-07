<script setup lang="ts">
import UiInput from '@/components/ui/UiInput.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiSelect from '@/components/ui/UiSelect.vue'

const props = defineProps<{
  searchQuery: string
  selectedRole?: string
  totalCount: number
  pendingCount: number
  approvedCount: number
  rejectedCount: number
  isLoading: boolean
  showRoleFilter?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', val: string): void
  (e: 'update:selectedStatusTab', val: 'all' | 'pending' | 'approved' | 'rejected'): void
  (e: 'update:selectedRole', val: string): void
  (e: 'update:viewMode', val: 'grid' | 'table'): void
  (e: 'refresh'): void
}>()

const roleOptions = [
  { label: 'All Roles', value: 'all' },
  { label: 'Student', value: 'Student' },
  { label: 'Faculty', value: 'Faculty' },
  { label: 'Staff', value: 'Staff' },
  { label: 'Visitor', value: 'Visitor' },
]
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="flex-1 sm:max-w-md">
      <UiInput
        :model-value="searchQuery"
        label="Search"
        placeholder="Search name, email or plate number"
        clearable
        @update:model-value="emit('update:searchQuery', String($event))"
      />
    </div>
    <div class="flex flex-wrap items-end gap-3 sm:ml-auto">
      <UiSelect
        v-if="showRoleFilter"
        class="w-40"
        label="Role"
        :model-value="selectedRole || 'all'"
        :options="roleOptions"
        @update:model-value="emit('update:selectedRole', $event)"
      />
      <UiButton variant="secondary" :loading="isLoading" @click="emit('refresh')">
        <template #prefix
          ><svg
            class="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M20 7v5h-5M4 17v-5h5M5 8a8 8 0 0 1 13-3l2 2M4 17l2 2a8 8 0 0 0 13-3" /></svg
        ></template>
        Refresh
      </UiButton>
    </div>
  </div>
</template>
