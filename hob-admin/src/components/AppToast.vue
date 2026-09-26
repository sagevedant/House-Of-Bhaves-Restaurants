<template>
  <div class="fixed bottom-6 right-6 z-50 pointer-events-none max-w-sm w-full">
    <transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="currentToast"
        :key="currentToast.id"
        class="pointer-events-auto rounded-[16px] bg-[#0a0d3a] border p-4 flex items-start gap-3 shadow-[0_3px_24px_rgba(0,0,0,0.5)] font-sans"
        :class="[
          currentToast.type === 'success'
            ? 'border-[#35ed7e]/40 shadow-[0_3px_24px_rgba(53,237,126,0.15)]'
            : currentToast.type === 'error'
            ? 'border-rose-800/60 shadow-[0_3px_24px_rgba(244,63,94,0.15)]'
            : currentToast.type === 'warning'
            ? 'border-amber-500/50 shadow-[0_3px_24px_rgba(245,158,11,0.15)]'
            : 'border-[#00b0f4]/40 shadow-[0_3px_24px_rgba(0,176,244,0.15)]'
        ]"
      >
        <!-- Plain Status Icon (CheckCircle / AlertTriangle / XCircle) -->
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          :class="[
            currentToast.type === 'success'
              ? 'bg-[#35ed7e]/20 border border-[#35ed7e]/50 text-[#35ed7e]'
              : currentToast.type === 'error'
              ? 'bg-rose-950/60 border border-rose-800/60 text-rose-400'
              : currentToast.type === 'warning'
              ? 'bg-amber-950/60 border border-amber-500/50 text-amber-400'
              : 'bg-[#00b0f4]/20 border border-[#00b0f4]/50 text-[#00b0f4]'
          ]"
        >
          <CheckCircle v-if="currentToast.type === 'success'" :size="16" :stroke-width="2" />
          <XCircle v-else-if="currentToast.type === 'error'" :size="16" :stroke-width="2" />
          <AlertTriangle v-else-if="currentToast.type === 'warning'" :size="16" :stroke-width="2" />
          <Info v-else :size="16" :stroke-width="2" />
        </div>

        <!-- Body -->
        <div class="flex-1 min-w-0">
          <div class="text-[14px] font-[700] text-[#ffffff] font-display">
            {{ currentToast.title }}
          </div>
          <p class="text-[12px] text-[#ffffff]/70 mt-0.5 leading-[1.4]">
            {{ currentToast.message }}
          </p>
        </div>

        <!-- Dismiss button -->
        <button
          @click="dismissCurrent"
          class="text-[#ffffff]/50 hover:text-[#ffffff] transition-colors duration-120 cursor-pointer p-0.5"
          aria-label="Dismiss toast"
        >
          <X :size="15" :stroke-width="1.75" />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

const currentToast = ref(null)
const queue = ref([])
let timer = null

function showToast({ title, message, type = 'success', duration = 4000 }) {
  // 1. Dedupe check: If current toast has identical title+message, reset its dismiss timer
  if (
    currentToast.value &&
    currentToast.value.title === title &&
    currentToast.value.message === message
  ) {
    resetTimer(duration)
    return
  }

  // 2. Dedupe check in queue
  const existingInQueue = queue.value.find(
    (t) => t.title === title && t.message === message
  )
  if (existingInQueue) {
    return
  }

  const toastItem = {
    id: Date.now() + Math.random(),
    title,
    message,
    type,
    duration
  }

  // If no toast is currently active, show immediately
  if (!currentToast.value) {
    displayToast(toastItem)
  } else {
    // Max 1 visible at a time: enqueue
    queue.value.push(toastItem)
  }
}

function displayToast(toastItem) {
  currentToast.value = toastItem
  resetTimer(toastItem.duration)
}

function resetTimer(duration = 4000) {
  if (timer) clearTimeout(timer)
  if (duration > 0) {
    timer = setTimeout(() => {
      dismissCurrent()
    }, duration)
  }
}

function dismissCurrent() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  currentToast.value = null

  // Show next toast from queue if available after short transition gap
  if (queue.value.length > 0) {
    setTimeout(() => {
      const next = queue.value.shift()
      if (next) {
        displayToast(next)
      }
    }, 180)
  }
}

defineExpose({
  showToast,
  dismissCurrent
})
</script>
