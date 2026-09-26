<template>
  <div class="min-h-screen bg-[#0a0d3a] text-[#ffffff] flex flex-col antialiased">
    <!-- Sidebar -->
    <AppSidebar
      :is-open="isMobileSidebarOpen"
      @close="isMobileSidebarOpen = false"
    />

    <!-- Main Content Wrapper (shifted right for sidebar on md+) -->
    <div class="md:pl-64 flex flex-col flex-1 min-w-0">
      <!-- Top Bar Header -->
      <AppHeader
        :title="title"
        :subtitle="subtitle"
        :action-label="actionLabel"
        @toggle-sidebar="isMobileSidebarOpen = !isMobileSidebarOpen"
        @action="$emit('action')"
      >
        <template #actions>
          <slot name="header-actions" />
        </template>
      </AppHeader>

      <!-- Main Canvas Viewport -->
      <main class="flex-1 p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

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

defineEmits(['action'])

const isMobileSidebarOpen = ref(false)
</script>
