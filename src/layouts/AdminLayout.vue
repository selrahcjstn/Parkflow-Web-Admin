<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Header from '@/components/layout/Header.vue'
import SystemAnnouncementBanner from '@/components/layout/SystemAnnouncementBanner.vue'
import { useAppStore } from '@/stores/app.store'

const appStore = useAppStore()
const isMobile = ref(false)

function checkMobile() {
  isMobile.value = window.innerWidth < 1024
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkMobile)
})

const mainContentStyle = computed(() => ({
  marginLeft: isMobile.value ? '0' : appStore.sidebarCollapsed ? '72px' : '260px'
}))
</script>

<template>
  <div class="admin-layout">
    <Sidebar />
    <div class="main-content" :style="mainContentStyle">
      <Header />
      <SystemAnnouncementBanner />
      <main class="page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  height: 100vh;
  max-height: 100vh;
  background: var(--color-background);
  overflow: hidden;
  max-width: 100vw;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  min-width: 0;
  max-width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  transition: margin-left 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

.page-content {
  flex: 1;
  padding: 24px;
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

@media (min-width: 1024px) {
  .page-content {
    padding: 32px;
  }
}
</style>
