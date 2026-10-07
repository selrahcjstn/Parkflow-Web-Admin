<script setup lang="ts">
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'
import SystemAnnouncementBanner from '@/components/layout/SystemAnnouncementBanner.vue'
import { useAppStore } from '@/stores/app.store'
const appStore = useAppStore()
</script>

<template>
  <div class="flex h-dvh max-w-full overflow-hidden bg-background">
    <Sidebar />
    <div
      class="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto transition-[margin-left] motion-reduce:transition-none"
      :class="appStore.sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'"
    >
      <Header />
      <SystemAnnouncementBanner />
      <main class="w-full min-w-0 flex-1 p-5 lg:p-8"><router-view /></main>
    </div>
  </div>
</template>
