<template>
  <teleport to="body">
    <!-- Backdrop Overlay (120ms fade transition) -->
    <transition
      enter-active-class="transition-opacity duration-120 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-120 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 bg-[#000000]/75 flex items-center justify-center p-4 backdrop-blur-none"
        @click.self="handleCancel"
      >
        <!-- Modal Card: feature-card-dark chrome (surface-indigo #1e2353, rounded.lg 16px, ~360px max width, elevated shadow) -->
        <transition
          enter-active-class="transition-all duration-120 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-120 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="isOpen"
            class="w-full max-w-[380px] rounded-[16px] bg-[#1e2353] border border-[#23272a] shadow-[0_3px_68px_rgba(0,0,0,0.7)] overflow-hidden font-sans"
          >
            <!-- Header & Icon -->
            <div class="p-5 pb-3 flex items-start justify-between gap-3">
              <div class="flex items-center gap-3">
                <!-- Warning icon for revoke/rotate -->
                <div
                  v-if="type !== 'delete'"
                  class="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0"
                >
                  <TriangleAlert :size="18" :stroke-width="2" />
                </div>
                <!-- Trash danger icon for delete -->
                <div
                  v-else
                  class="w-9 h-9 rounded-full bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0"
                >
                  <Trash2 :size="18" :stroke-width="2" />
                </div>

                <div>
                  <h3 class="text-[18px] font-[700] text-[#ffffff] font-display leading-[1.2]">
                    {{ title }}
                  </h3>
                </div>
              </div>

              <button
                @click="handleCancel"
                class="w-7 h-7 rounded-full hover:bg-[#23272a] text-[#ffffff]/60 hover:text-[#ffffff] flex items-center justify-center transition-colors duration-120 cursor-pointer"
                aria-label="Close dialog"
              >
                <X :size="16" :stroke-width="1.75" />
              </button>
            </div>

            <!-- Body / Consequence Text -->
            <div class="px-5 py-2 space-y-3.5 text-[14px] text-[#ffffff]/80 leading-[1.5]">
              <p>{{ description }}</p>

              <!-- Confirmation Input for Delete Action -->
              <div v-if="type === 'delete'" class="space-y-1.5 pt-1">
                <label class="block text-[12px] font-[600] uppercase tracking-wider text-[#ffffff]/50 font-display">
                  Type <span class="text-[#ffffff] font-mono select-all bg-[#0a0d3a] px-1.5 py-0.5 rounded-[4px] border border-[#23272a]">{{ confirmSlug }}</span> to confirm
                </label>
                <input
                  v-model="inputSlug"
                  type="text"
                  placeholder="Enter slug..."
                  class="w-full rounded-[12px] bg-[#0a0d3a] border border-[#23272a] px-3.5 py-2 text-[14px] font-mono text-[#ffffff] placeholder-[#ffffff]/40 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/80 transition-colors duration-120"
                />
              </div>
            </div>

            <!-- Footer Buttons -->
            <div class="p-4 px-5 bg-[#0a0d3a]/60 border-t border-[#23272a] flex items-center justify-end gap-2.5 mt-3">
              <!-- Cancel (button-ghost) -->
              <button
                type="button"
                @click="handleCancel"
                class="px-4 py-2 rounded-[12px] bg-[#1e2353] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer"
              >
                Cancel
              </button>

              <!-- Confirm Button (button-green for revoke/rotate, danger button-primary for delete) -->
              <button
                type="button"
                :disabled="isConfirmDisabled"
                @click="handleConfirm"
                :class="[
                  'px-4 py-2 rounded-[12px] text-[14px] font-[700] leading-[1.4] transition-colors duration-120 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  type === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-[#ffffff] focus:ring-2 focus:ring-rose-500'
                    : 'bg-[#35ed7e] hover:bg-[#2ed66f] active:bg-[#26b85e] text-[#000000] focus:ring-2 focus:ring-[#35ed7e]'
                ]"
              >
                {{ confirmLabel }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { TriangleAlert, Trash2, X } from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Confirm Action'
  },
  description: {
    type: String,
    default: 'Are you sure you want to proceed with this operation?'
  },
  type: {
    type: String,
    default: 'warning' // 'warning' | 'delete' | 'rotate'
  },
  confirmLabel: {
    type: String,
    default: 'Confirm'
  },
  confirmSlug: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'confirm'])

const inputSlug = ref('')

watch(
  () => props.isOpen,
  (val) => {
    if (val) {
      inputSlug.value = ''
    }
  }
)

const isConfirmDisabled = computed(() => {
  if (props.type === 'delete') {
    return inputSlug.value.trim() !== props.confirmSlug.trim()
  }
  return false
})

function handleCancel() {
  emit('close')
}

function handleConfirm() {
  emit('confirm')
  emit('close')
}
</script>
