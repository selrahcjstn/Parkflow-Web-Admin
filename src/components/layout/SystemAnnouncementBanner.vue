<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import api from '@/api/axios'

interface SystemAnnouncement {
  id: string
  title?: string
  message: string
  iconType: 'caution' | 'good_news' | 'info' | 'maintenance' | 'urgent'
  isActive: boolean
  updatedAt?: string
}

const announcement = ref<SystemAnnouncement | null>(null)
const isDismissed = ref(false)

const DISMISS_KEY = 'parkflow_dismissed_announcement_ts'

async function fetchActiveAnnouncement() {
  try {
    const res = await api.get('/system-announcement/active')
    if (res.data?.isSuccess && res.data?.data) {
      const data = res.data.data as SystemAnnouncement
      announcement.value = data
      
      const dismissedTs = sessionStorage.getItem(DISMISS_KEY)
      const currentTs = data.updatedAt || data.id
      if (dismissedTs === currentTs) {
        isDismissed.value = true
      } else {
        isDismissed.value = false
      }
    } else {
      announcement.value = null
    }
  } catch (err) {
    console.error('Failed to fetch system announcement:', err)
  }
}

function dismissBanner() {
  isDismissed.value = true
  if (announcement.value) {
    const currentTs = announcement.value.updatedAt || announcement.value.id
    sessionStorage.setItem(DISMISS_KEY, currentTs)
  }
}

function handleAnnouncementUpdate() {
  fetchActiveAnnouncement()
}

onMounted(() => {
  fetchActiveAnnouncement()
  window.addEventListener('system-announcement-updated', handleAnnouncementUpdate)
})

onBeforeUnmount(() => {
  window.removeEventListener('system-announcement-updated', handleAnnouncementUpdate)
})
</script>

<template>
  <Transition name="banner-slide">
    <div
      v-if="announcement && announcement.isActive && !isDismissed"
      class="announcement-banner"
      :class="`announcement-banner--${announcement.iconType}`"
    >
      <div class="banner-container">
        <div class="banner-left">
          <!-- Icon variants -->
          <div class="banner-icon-box">
            <!-- Caution (Amber) -->
            <svg v-if="announcement.iconType === 'caution'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>

            <!-- Good News (Emerald) -->
            <svg v-else-if="announcement.iconType === 'good_news'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              <polygon points="12 2 15 8 22 9 17 14 18 21 12 18 6 21 7 14 2 9 9 8 12 2"/>
            </svg>

            <!-- Info (Blue) -->
            <svg v-else-if="announcement.iconType === 'info'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>

            <!-- Maintenance (Purple) -->
            <svg v-else-if="announcement.iconType === 'maintenance'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
            </svg>

            <!-- Urgent (Rose) -->
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>

          <div class="banner-text-wrap">
            <strong v-if="announcement.title" class="banner-title">{{ announcement.title }}</strong>
            <span class="banner-text">{{ announcement.message }}</span>
          </div>
        </div>

        <button class="banner-close-btn" aria-label="Dismiss banner" @click="dismissBanner">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.announcement-banner {
  width: 100%;
  padding: 10px 24px;
  border-bottom: 1px solid transparent;
  transition: all 0.3s ease;
  position: relative;
  z-index: 20;
}

.banner-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 1400px;
  margin: 0 auto;
}

.banner-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.banner-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  flex-shrink: 0;
}

.banner-badge {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.8px;
  padding: 3px 8px;
  border-radius: 6px;
  flex-shrink: 0;
  text-transform: uppercase;
}

.banner-text-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
}

.banner-title {
  font-size: 13.5px;
  font-weight: 800;
  line-height: 1.3;
}

.banner-text {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.35;
  margin: 0;
  white-space: normal;
  word-break: break-word;
}

@media (max-width: 768px) {
  .banner-text-wrap {
    flex-direction: column;
    align-items: flex-start;
    gap: 1px;
  }
  .banner-text {
    white-space: normal;
  }
}

.banner-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  opacity: 0.8;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.banner-close-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.08);
}

/* ── COLOR THEMES ── */

/* 1. Caution (Amber) */
.announcement-banner--caution {
  background: linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%);
  border-color: #fde68a;
  color: #92400e;
}
.announcement-banner--caution .banner-icon-box {
  background: #fef3c7;
  color: #b45309;
}
.announcement-banner--caution .banner-badge {
  background: #fde68a;
  color: #78350f;
}

/* 2. Good News (Emerald) */
.announcement-banner--good_news {
  background: linear-gradient(90deg, #ecfdf5 0%, #d1fae5 100%);
  border-color: #a7f3d0;
  color: #065f46;
}
.announcement-banner--good_news .banner-icon-box {
  background: #d1fae5;
  color: #047857;
}
.announcement-banner--good_news .banner-badge {
  background: #a7f3d0;
  color: #064e3b;
}

/* 3. Info (Blue) */
.announcement-banner--info {
  background: linear-gradient(90deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #bfdbfe;
  color: #1e40af;
}
.announcement-banner--info .banner-icon-box {
  background: #dbeafe;
  color: #1d4ed8;
}
.announcement-banner--info .banner-badge {
  background: #bfdbfe;
  color: #1e3a8a;
}

/* 4. Maintenance (Purple) */
.announcement-banner--maintenance {
  background: linear-gradient(90deg, #faf5ff 0%, #f3e8ff 100%);
  border-color: #e9d5ff;
  color: #6b21a8;
}
.announcement-banner--maintenance .banner-icon-box {
  background: #f3e8ff;
  color: #7e22ce;
}
.announcement-banner--maintenance .banner-badge {
  background: #e9d5ff;
  color: #581c87;
}

/* 5. Urgent (Rose) */
.announcement-banner--urgent {
  background: linear-gradient(90deg, #fff1f2 0%, #ffe4e6 100%);
  border-color: #fecdd3;
  color: #9f1239;
}
.announcement-banner--urgent .banner-icon-box {
  background: #ffe4e6;
  color: #be123c;
}
.announcement-banner--urgent .banner-badge {
  background: #fecdd3;
  color: #881337;
}

/* Transition */
.banner-slide-enter-active,
.banner-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  max-height: 80px;
  opacity: 1;
}

.banner-slide-enter-from,
.banner-slide-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}
</style>
