<template>
  <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full">
    <transition-group
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-4 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto rounded-[16px] bg-[#0a0d3a] border p-4 flex items-start gap-3 shadow-[0_3px_24px_rgba(0,0,0,0.4)] font-sans"
        :class="[
          toast.type === 'success'
            ? 'border-[#35ed7e]/40 shadow-[0_3px_24px_rgba(53,237,126,0.15)]'
            : toast.type === 'error'
            ? 'border-rose-800/60 shadow-[0_3px_24px_rgba(244,63,94,0.15)]'
            : 'border-[#ec48bd]/40 shadow-[0_3px_24px_rgba(236,72,189,0.15)]'
        ]"
      >
        <!-- Icon -->
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          :class="[
            toast.type === 'success'
              ? 'bg-[#35ed7e]/20 border border-[#35ed7e]/50 text-[#35ed7e]'
              : toast.type === 'error'
              ? 'bg-rose-950/60 border border-rose-800/60 text-rose-400'
              : 'bg-[#ec48bd]/20 border border-[#ec48bd]/50 text-[#ec48bd]'
          ]"
        >
          <Check v-if="toast.type === 'success'" :size="15" :stroke-width="2" />
          <AlertCircle v-else-if="toast.type === 'error'" :size="15" :stroke-width="2" />
          <Sparkles v-else :size="15" :stroke-width="2" />
        </div>

        <!-- Body -->
        <div class="flex-1 min-w-0">
          <div class="text-[14px] font-[700] text-[#ffffff] font-display">
            {{ toast.title }}
          </div>
          <p class="text-[12px] text-[#ffffff]/70 mt-0.5 leading-[1.4]">
            {{ toast.message }}
          </p>
        </div>

        <!-- Dismiss button -->
        <button
          @click="removeToast(toast.id)"
          class="text-[#ffffff]/50 hover:text-[#ffffff] transition-colors duration-120 cursor-pointer p-0.5"
          aria-label="Dismiss toast"
        >
          <X :size="15" :stroke-width="1.75" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Check, AlertCircle, Sparkles, X } from 'lucide-vue-next'

const toasts = ref([])

function showToast({ title, message, type = 'success', duration = 4000 }) {
  const id = Date.now() + Math.random()
  toasts.value.push({ id, title, message, type })

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
}

function removeToast(id) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

defineExpose({
  showToast
})
</script>
