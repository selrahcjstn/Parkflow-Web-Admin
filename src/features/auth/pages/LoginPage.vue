<script setup lang="ts">
import LoginForm from '../components/LoginForm.vue'
</script>

<template>
  <div class="min-h-screen w-full lg:grid lg:grid-cols-12 bg-slate-50 dark:bg-slate-950 font-sans selection:bg-[#7B1113] selection:text-white">
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- LEFT PANEL: BulSU Institutional Showcase (Desktop lg:col-span-5)  -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <aside class="relative hidden lg:flex lg:col-span-5 xl:col-span-5 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#3d0608] via-[#7B1113] to-[#240405] text-white p-8 lg:p-12 xl:p-14 border-r border-[#8C1316]/40 shadow-2xl">
      <!-- Ambient Background Glows & Patterns -->
      <div class="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#FDB813]/15 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#7B1113]/40 blur-3xl" />
      
      <!-- Subtle Decorative Grid Lines -->
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.06]"
        style="background-image: radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px); background-size: 24px 24px;"
      />

      <!-- Top Branding Header -->
      <div class="relative z-10">
        <!-- BulSU University Pill Badge -->
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/15 text-[11px] font-extrabold tracking-widest text-[#FDB813] uppercase shadow-inner">
          <span class="w-2 h-2 rounded-full bg-[#FDB813] shadow-[0_0_8px_#FDB813] animate-pulse" />
          <span>Bulacan State University</span>
        </div>

        <!-- ParkFlow Brand Mark -->
        <div class="flex items-center gap-4 mt-6">
          <div class="w-13 h-13 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2.5 flex items-center justify-center shadow-lg shadow-black/20">
            <img src="/parkflow.png" alt="ParkFlow Logo" class="w-full h-full object-contain filter drop-shadow" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h1 class="text-2xl xl:text-3xl font-black tracking-tight text-white leading-none">
                ParkFlow
              </h1>
              <span class="px-2 py-0.5 rounded-md bg-[#FDB813] text-[#5F0D0E] text-[10px] font-black uppercase tracking-wider shadow-xs">
                ADMIN
              </span>
            </div>
            <p class="text-xs font-semibold text-white/70 tracking-wide mt-1">
              Campus Mobility & Parking Intelligence
            </p>
          </div>
        </div>
      </div>

      <!-- Center Showcase Content -->
      <div class="relative z-10 my-auto py-8">
        <div class="max-w-md">
          <h2 class="text-2xl xl:text-3xl font-black text-white/95 leading-tight tracking-tight">
            Centralized Gate Automation & Real-Time Capacity Control
          </h2>
          <p class="text-xs xl:text-sm text-white/75 leading-relaxed mt-3">
            Integrated administrative console for BulSU campus security officers, gate marshals, and administrative staff to enforce parking schedules, inspect permits, and audit vehicle flows.
          </p>
        </div>

        <!-- Glassmorphism Feature Highlights -->
        <div class="grid gap-3 mt-8">
          <!-- Item 1 -->
          <div class="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/8 backdrop-blur-md border border-white/10 transition-all hover:bg-white/12">
            <div class="w-9 h-9 rounded-xl bg-[#FDB813]/20 border border-[#FDB813]/30 text-[#FDB813] flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <div>
              <h3 class="text-xs font-bold text-white tracking-wide">Automated QR Gate Passes</h3>
              <p class="text-[11px] text-white/70 mt-0.5 leading-snug">
                Sub-second dynamic QR code verification with automated entry and exit cycle tracking.
              </p>
            </div>
          </div>

          <!-- Item 2 -->
          <div class="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/8 backdrop-blur-md border border-white/10 transition-all hover:bg-white/12">
            <div class="w-9 h-9 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h3 class="text-xs font-bold text-white tracking-wide">Dynamic Capacity & Overstay Audit</h3>
              <p class="text-[11px] text-white/70 mt-0.5 leading-snug">
                Real-time zone utilization heatmaps with overstay and non-registered vehicle alerts.
              </p>
            </div>
          </div>

          <!-- Item 3 -->
          <div class="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/8 backdrop-blur-md border border-white/10 transition-all hover:bg-white/12">
            <div class="w-9 h-9 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 class="text-xs font-bold text-white tracking-wide">COR Schedule Synchronization</h3>
              <p class="text-[11px] text-white/70 mt-0.5 leading-snug">
                Automated document approvals paired with enrolled student schedule validation.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Platform Metadata -->
      <div class="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-[11px] text-white/60 font-medium">
        <div class="flex items-center gap-2">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Server Cluster: <strong class="text-white font-semibold">Online</strong></span>
        </div>
        <span>BulSU ParkFlow v1.8.0</span>
      </div>
    </aside>

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- RIGHT PANEL: Authentication Form (Desktop lg:col-span-7)           -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <main class="lg:col-span-7 xl:col-span-7 flex flex-col justify-between p-4 sm:p-8 lg:p-12 xl:p-16 min-h-screen relative">
      <!-- Background Micro Dot Texture -->
      <div 
        class="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.15]"
        style="background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 20px 20px;"
      />

      <!-- Top Mobile Banner (Only visible on screens < lg) -->
      <div class="lg:hidden w-full max-w-md mx-auto mb-6 text-center">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7B1113]/10 dark:bg-[#7B1113]/25 border border-[#7B1113]/20 text-[10px] font-extrabold tracking-widest text-[#7B1113] dark:text-[#FDB813] uppercase mb-3">
          <span class="w-1.5 h-1.5 rounded-full bg-[#7B1113] dark:bg-[#FDB813] animate-pulse" />
          Bulacan State University
        </div>
        <div class="flex items-center justify-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 shadow-md">
            <img src="/parkflow.png" alt="ParkFlow Logo" class="w-full h-full object-contain" />
          </div>
          <div class="text-left">
            <h1 class="text-xl font-black text-slate-900 dark:text-white leading-none flex items-center gap-1.5">
              ParkFlow <span class="text-[9px] px-1.5 py-0.5 rounded bg-[#7B1113] text-white font-extrabold">ADMIN</span>
            </h1>
            <p class="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Parking Management System</p>
          </div>
        </div>
      </div>

      <!-- Main Login Card Container -->
      <div class="w-full max-w-md mx-auto my-auto relative z-10">
        <!-- Floating Card -->
        <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl shadow-slate-900/5 dark:shadow-black/40 p-7 sm:p-9 relative overflow-hidden backdrop-blur-xl">
          <!-- Top Accent Gradient Stripe (BulSU Maroon to BulSU Gold) -->
          <div class="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7B1113] via-[#9e1619] to-[#FDB813]" />

          <!-- Form Header -->
          <div class="mb-6">
            <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#7B1113]/10 dark:bg-[#7B1113]/20 text-[#7B1113] dark:text-[#E25C65] text-[10px] font-black tracking-wider uppercase mb-3">
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Restricted Access</span>
            </div>

            <h2 class="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Administrator Sign In
            </h2>
            <p class="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              Authenticate with your authorized BulSU administrative account to access operations.
            </p>
          </div>

          <!-- The Interactive Login Form -->
          <LoginForm />
        </div>

        <!-- Institutional Security Badge & Help -->
        <div class="mt-6 flex flex-col items-center gap-2 text-center">
          <div class="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
            <svg class="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            <span>Secured with 256-bit TLS encryption & Role-Based Access Control</span>
          </div>
          <p class="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            Need credentials or security clearance? Contact 
            <span class="text-slate-600 dark:text-slate-300 font-semibold">BulSU MIS / ICTO Office</span>.
          </p>
        </div>
      </div>

      <!-- Institutional Footer -->
      <footer class="w-full max-w-md mx-auto text-center pt-6 text-[11px] text-slate-400 dark:text-slate-600 font-medium">
        © 2026 Bulacan State University • ParkFlow Portal
      </footer>
    </main>
  </div>
</template>
