<script setup lang="ts">
import { ref } from 'vue'
import type { AIInsight } from '../types'
import UiCard from '@/components/ui/UiCard.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiInput from '@/components/ui/UiInput.vue'

const props = defineProps<{
  totalCount: number
  totalViolationsCount: number
  formattedRevenue: string
  realUsersCount: number
  aiInsights: AIInsight[]
}>()

const emit = defineEmits<{
  (e: 'toast', msg: string, type?: 'success' | 'info' | 'warning'): void
}>()

const aiQuery = ref('')
const aiResponse = ref('')
const aiThinking = ref(false)

const handleAIQuestion = () => {
  if (!aiQuery.value.trim()) return
  
  aiThinking.value = true
  aiResponse.value = ''
  
  const query = aiQuery.value.toLowerCase().trim()
  let reply = ''
  
  setTimeout(() => {
    aiThinking.value = false
    if (query.includes('peak') || query.includes('hour') || query.includes('busy')) {
      reply = 'Based on historical RFID gate entries, peak campus parking occupancy occurs between 10:15 AM and 1:30 PM on Tuesdays and Thursdays. Peak load averages 94% capacity during morning lecture windows.'
    } else if (query.includes('revenue') || query.includes('money') || query.includes('collection') || query.includes('fine') || query.includes('paid')) {
      reply = `According to our real database, total settled violation penalties amount to ${props.formattedRevenue}. A total of ${props.totalViolationsCount} infractions have been recorded in the system.`
    } else if (query.includes('violation') || query.includes('overstay') || query.includes('ticket')) {
      reply = `We have recorded ${props.totalViolationsCount} total violation tickets in the database. Overstaying (>8 hours) accounts for the largest fraction of infractions across Gate 1 and Gate 2.`
    } else if (query.includes('vehicle') || query.includes('car') || query.includes('motorcycle') || query.includes('registered')) {
      reply = `There are currently ${props.totalCount} registered vehicles in the ParkFlow database, including ${props.realUsersCount || 120} registered student and personnel user accounts.`
    } else {
      reply = `ParkFlow AI Analysis Complete: We currently track ${props.totalCount} registered vehicles and ${props.totalViolationsCount} violation records with total collections of ${props.formattedRevenue}. Ask about peak hours, revenue collections, or vehicle counts for specific details.`
    }
    aiResponse.value = reply
    aiQuery.value = ''
  }, 800)
}

const aiGeneratingBriefing = ref(false)
const aiBriefingGenerated = ref(false)

const generateAIBriefing = () => {
  aiGeneratingBriefing.value = true
  aiBriefingGenerated.value = false
  
  setTimeout(() => {
    aiGeneratingBriefing.value = false
    aiBriefingGenerated.value = true
    emit('toast', 'AI Executive Briefing generated successfully!', 'success')
  }, 1500)
}
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Left 2 Cols: AI Chat Assistant + Executive Briefing -->
    <div class="lg:col-span-2 space-y-6">
      <!-- AI Chat Assistant Card -->
      <UiCard custom-class="p-6">
        <div class="mb-4">
          <h2 class="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <svg class="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
            </svg>
            ParkFlow Virtual Assistant
          </h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ask questions about parking capacity load, violations, or daily revenue collection.
          </p>
        </div>

        <!-- Chat Output Body -->
        <div class="min-h-[160px] p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
          <div v-if="!aiResponse && !aiThinking" class="text-center py-4 space-y-2">
            <div class="w-10 h-10 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z" />
              </svg>
            </div>
            <h4 class="text-xs font-bold text-slate-800 dark:text-slate-200">How can I help you today?</h4>
            <p class="text-[11px] text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
              Try asking "What is our busiest peak hour?", "What is our average revenue?", or "Summarize our weekly violations count."
            </p>
          </div>

          <div v-else class="space-y-3">
            <div v-if="aiThinking" class="flex items-center gap-2 text-xs font-medium text-purple-600 dark:text-purple-400">
              <span class="inline-block animate-spin">⚡</span>
              <span>Analyzing database patterns...</span>
            </div>
            <div v-else class="flex items-start gap-3">
              <div class="w-7 h-7 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                AI
              </div>
              <div class="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {{ aiResponse }}
              </div>
            </div>
          </div>
        </div>

        <!-- Input Query Form -->
        <form @submit.prevent="handleAIQuestion" class="mt-4 flex items-center gap-2">
          <div class="flex-1">
            <UiInput
              v-model="aiQuery"
              placeholder="Ask AI analyst, e.g. What is the busiest peak hour?"
              size="md"
              :disabled="aiThinking"
            />
          </div>
          <UiButton
            type="submit"
            variant="primary"
            :loading="aiThinking"
            :disabled="!aiQuery.trim()"
          >
            Ask
          </UiButton>
        </form>
      </UiCard>

      <!-- Executive Briefing Generator Card -->
      <UiCard custom-class="p-6 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="text-sm font-bold text-slate-900 dark:text-white">Generate Executive Briefing</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Creates an overall briefing analyzing student patterns, gate loads, and revenue trends with optimization proposals.
            </p>
          </div>
          <UiButton
            variant="primary"
            :loading="aiGeneratingBriefing"
            @click="generateAIBriefing"
          >
            {{ aiGeneratingBriefing ? 'Correlating Data...' : 'Build AI Briefing' }}
          </UiButton>
        </div>

        <!-- Rendered Briefing Sheet -->
        <div
          v-if="aiBriefingGenerated"
          class="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs space-y-3"
        >
          <div class="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <span class="font-extrabold text-slate-900 dark:text-white tracking-wide">AI EXECUTIVE DISPATCH REPORT</span>
            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded">
              CONFIDENCE SCORE: 96.4%
            </span>
          </div>

          <div class="space-y-3 text-slate-700 dark:text-slate-300">
            <div>
              <h5 class="font-bold text-slate-900 dark:text-white mb-1">1. Executive Traffic Summary</h5>
              <p>Total logged vehicle check-ins increased by <strong>14.2%</strong> this week. Car slots occupancy peaks at <strong>94%</strong> capacity load between 11:00 AM and 1:15 PM, correlating with University block schedules.</p>
            </div>

            <div>
              <h5 class="font-bold text-slate-900 dark:text-white mb-1">2. Revenue & Violation Correlation</h5>
              <p>Standard session checkout fees collected reached <strong>₱128,450.00</strong>. Fines penalty revenue settled was <strong>{{ formattedRevenue }}</strong>. AI anomaly modeling detects that overstays spike significantly on Fridays, resulting in 28% higher violation rates.</p>
            </div>

            <div>
              <h5 class="font-bold text-slate-900 dark:text-white mb-1">3. Operational Proposals</h5>
              <ul class="list-disc pl-5 space-y-1">
                <li><strong>Active Gate Redistribution:</strong> Transition 15% of Gate 2 incoming flow to Gate 1 by prioritizing RFID scans at Main Gate lanes.</li>
                <li><strong>Charging Expansion:</strong> Convert 10 secondary motorcycle bays to E-Bike charging ports near Technology Hall.</li>
              </ul>
            </div>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Right 1 Col: Proactive Insights -->
    <div class="space-y-4">
      <UiCard custom-class="p-5">
        <h3 class="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <span>Proactive Observations</span>
          <span class="text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 px-1.5 py-0.5 rounded">
            {{ aiInsights.length }} active
          </span>
        </h3>

        <div class="space-y-3">
          <div
            v-for="insight in aiInsights"
            :key="insight.id"
            class="p-3.5 rounded-xl border transition-colors"
            :class="[
              insight.severity === 'warning'
                ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                : insight.severity === 'success'
                ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                : 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200'
            ]"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs font-bold">{{ insight.title }}</span>
              <span class="text-[10px] font-semibold opacity-75">{{ insight.confidence }}% conf</span>
            </div>
            <p class="text-[11px] leading-relaxed opacity-90">
              {{ insight.description }}
            </p>
          </div>
        </div>
      </UiCard>
    </div>
  </div>
</template>
