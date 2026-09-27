<script setup lang="ts">
import SkeletonLoader from './SkeletonLoader.vue'

export interface TableColumn<T = any> {
  key: string
  label?: string
  align?: 'left' | 'center' | 'right'
  width?: string
  headerClass?: string
  cellClass?: string
}

const props = defineProps<{
  columns: TableColumn[]
  data: any[]
  isLoading?: boolean
  loadingRows?: number
  emptyText?: string
  rowKey?: string | ((item: any) => string | number)
  hover?: boolean
}>()

const emit = defineEmits<{
  (e: 'row-click', item: any, event: MouseEvent): void
}>()

const getRowKey = (item: any, index: number): string | number => {
  if (!props.rowKey) return item.id ?? index
  if (typeof props.rowKey === 'function') return props.rowKey(item)
  return item[props.rowKey] ?? index
}

const getNestedValue = (obj: any, path: string) => {
  if (!obj || !path) return undefined
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj)
}

const handleRowClick = (item: any, event: MouseEvent) => {
  emit('row-click', item, event)
}
</script>

<template>
  <div class="w-full overflow-x-auto no-scrollbar">
    <table class="w-full border-collapse text-left whitespace-nowrap">
      <thead>
        <tr class="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          <th
            v-for="col in columns"
            :key="col.key"
            :style="{ width: col.width }"
            :class="[
              'py-3 px-3.5 sm:px-4 select-none',
              col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
              col.headerClass || ''
            ]"
          >
            <slot :name="`header-${col.key}`" :column="col">
              {{ col.label }}
            </slot>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
        <template v-if="isLoading">
          <tr v-for="i in (loadingRows || 5)" :key="'skel-' + i">
            <td :colspan="columns.length" class="p-4">
              <SkeletonLoader variant="table-row" :columns="columns.length" />
            </td>
          </tr>
        </template>
        <template v-else-if="!data || data.length === 0">
          <tr>
            <td :colspan="columns.length" class="py-12 text-center text-slate-500 dark:text-slate-400 font-medium text-xs">
              <slot name="empty">
                {{ emptyText || 'No records found.' }}
              </slot>
            </td>
          </tr>
        </template>
        <template v-else>
          <tr
            v-for="(item, index) in data"
            :key="getRowKey(item, index)"
            :class="[
              'transition-colors',
              hover !== false ? 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30' : ''
            ]"
            @click="(e) => handleRowClick(item, e)"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                'py-3 px-3.5 sm:px-4 text-slate-700 dark:text-slate-300 font-medium',
                col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                col.cellClass || ''
              ]"
            >
              <slot
                :name="`cell-${col.key}`"
                :item="item"
                :row="item"
                :index="index"
                :value="getNestedValue(item, col.key)"
              >
                {{ getNestedValue(item, col.key) ?? '-' }}
              </slot>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
