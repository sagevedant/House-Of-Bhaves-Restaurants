import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const isSidebarOpen = ref(true)

  function toggleSidebar() {
    isSidebarOpen.value = !isSidebarOpen.value
  }

  return {
    isSidebarOpen,
    toggleSidebar,
  }
})
