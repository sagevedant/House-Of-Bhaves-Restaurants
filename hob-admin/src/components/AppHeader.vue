<template>
  <header class="h-16 border-b border-[#23272a] bg-[#1e2353] px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
    <!-- Left: Hamburger (Mobile) + Page Title -->
    <div class="flex items-center gap-3">
      <!-- Mobile hamburger trigger -->
      <button
        type="button"
        class="md:hidden w-9 h-9 rounded-[6px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] flex items-center justify-center border border-[#23272a] transition-colors duration-120 cursor-pointer"
        @click="$emit('toggle-sidebar')"
        aria-label="Open sidebar"
      >
        <Menu :size="18" :stroke-width="1.75" />
      </button>

      <!-- Page Title -->
      <div>
        <h1 class="text-[24px] font-[700] leading-[1.2] text-[#ffffff] font-display uppercase tracking-tight">
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-[12px] text-[#ffffff]/60 hidden sm:block">
          {{ subtitle }}
        </p>
      </div>
    </div>

    <!-- Right: Action Button Slot / Default Actions -->
    <div class="flex items-center gap-3">
      <slot name="actions">
        <!-- Default Primary Button slot if none provided -->
        <button
          v-if="actionLabel"
          @click="$emit('action')"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#5865f2] hover:bg-[#4752c4] active:bg-[#3c45a5] text-[#ffffff] text-[16px] font-[500] leading-[1.4] transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer"
        >
          <Plus :size="18" :stroke-width="1.75" />
          <span>{{ actionLabel }}</span>
        </button>
      </slot>
    </div>
  </header>
</template>

<script setup>
import { Menu, Plus } from 'lucide-vue-next'

defineProps({
  title: {
    type: String,
    default: 'Dashboard'
  },
  subtitle: {
    type: String,
    default: ''
  },
  actionLabel: {
    type: String,
    default: ''
  }
})

defineEmits(['toggle-sidebar', 'action'])
</script>
