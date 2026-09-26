<template>
  <div class="p-6">
    <div class="border border-neutral-800 rounded-lg p-6 bg-neutral-900/50 max-w-xl">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
          <Layers :size="18" />
        </div>
        <div>
          <h1 class="text-base font-semibold text-neutral-100">HOB Admin</h1>
          <p class="text-xs text-neutral-400">WhatsApp Multi-Tenant Booking Engine Console</p>
        </div>
      </div>
      <div class="text-xs text-neutral-400 space-y-2 border-t border-neutral-800/80 pt-4">
        <div class="flex justify-between items-center py-1">
          <span>Theme</span>
          <span class="text-neutral-300 font-mono">Dark / Amber-Gold (#D97706)</span>
        </div>
        <div class="flex justify-between items-center py-1">
          <span>API Base URL</span>
          <span class="text-neutral-300 font-mono">{{ apiBaseUrl }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Layers } from 'lucide-vue-next'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/admin'
</script>
