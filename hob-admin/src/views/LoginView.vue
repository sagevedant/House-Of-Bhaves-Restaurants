<template>
  <div class="relative min-h-screen w-full bg-[#0a0d3a] flex items-center justify-center p-4 overflow-hidden selection:bg-[#ec48bd]/30 selection:text-[#ffffff]">
    <!-- Atmospheric Blurple-to-magenta subtle radial gradient mesh -->
    <div
      class="pointer-events-none absolute inset-0 z-0 opacity-40"
      style="background: radial-gradient(circle at 50% 40%, rgba(88, 101, 242, 0.45) 0%, rgba(236, 72, 189, 0.25) 45%, rgba(10, 13, 58, 0) 75%);"
    />

    <div
      class="pointer-events-none absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
      style="background: radial-gradient(circle, rgba(236, 72, 189, 0.6) 0%, rgba(10, 13, 58, 0) 70%);"
    />

    <!-- Login Centered Card: feature-card-dark (surface-indigo, rounded.xl 40px, diffuse Blurple glow) -->
    <div class="relative z-10 w-full max-w-md rounded-[40px] bg-[#1e2353] border border-[#23272a] p-8 sm:p-10 shadow-[0_3px_68px_rgba(88,101,242,0.18)]">
      <!-- Wordmark Title inside card -->
      <div class="mb-8 text-center space-y-2">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#5865f2] text-[#ffffff] mb-2 shadow-[0_3px_24px_rgba(88,101,242,0.4)]">
          <Layers :size="24" :stroke-width="2" />
        </div>
        <h1 class="text-[32px] sm:text-[40px] font-[800] leading-[1.05] tracking-tight uppercase font-display text-[#ffffff]">
          HOB ADMIN
        </h1>
        <p class="text-[14px] text-[#ffffff]/60 font-sans">
          Internal platform console
        </p>
      </div>

      <!-- Auth Form -->
      <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="space-y-2">
          <label for="token-input" class="block text-[14px] font-[500] text-[#ffffff]">
            Access token
          </label>
          <div class="relative">
            <input
              id="token-input"
              v-model="token"
              :type="showToken ? 'text' : 'password'"
              placeholder="Enter operator token..."
              autocomplete="current-password"
              :disabled="isLoading"
              :class="[
                'w-full rounded-[12px] bg-[#0a0d3a] border px-4 py-3 text-[16px] text-[#ffffff] placeholder-[#ffffff]/40 transition-colors duration-120 focus:outline-none',
                errorMessage
                  ? 'border-rose-500 ring-1 ring-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/80'
                  : 'border-[#23272a] focus:border-[#5865f2] focus:ring-2 focus:ring-[#5865f2]'
              ]"
            />
            <button
              type="button"
              @click="showToken = !showToken"
              class="absolute right-3.5 top-3.5 text-[#ffffff]/50 hover:text-[#ffffff] transition-colors duration-120 cursor-pointer"
              tabindex="-1"
            >
              <EyeOff v-if="showToken" :size="18" :stroke-width="1.75" />
              <Eye v-else :size="18" :stroke-width="1.75" />
            </button>
          </div>

          <!-- Inline Red Error Text -->
          <div v-if="errorMessage" class="flex items-center gap-1.5 text-rose-400 text-[13px] pt-1 font-sans">
            <AlertCircle :size="15" :stroke-width="1.75" class="shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>
        </div>

        <!-- Submit Action Button: button-green chrome (highest-intent action) -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-[12px] bg-[#35ed7e] hover:bg-[#2ed66f] active:bg-[#26b85e] text-[#000000] text-[18px] font-[700] leading-[1.4] transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#35ed7e] focus:ring-offset-2 focus:ring-offset-[#1e2353] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Loader2 v-if="isLoading" :size="20" :stroke-width="2.5" class="animate-spin" />
          <span v-if="!isLoading">Sign In</span>
          <span v-else>Authenticating...</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/api/auth'
import { Layers, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-vue-next'

const router = useRouter()

const token = ref('')
const showToken = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  errorMessage.value = ''

  if (!token.value.trim()) {
    errorMessage.value = 'Access token is required to authenticate.'
    return
  }

  isLoading.value = true

  try {
    await login(token.value.trim())
    router.push('/clients')
  } catch (err) {
    errorMessage.value = err.response?.data?.message || 'Invalid access token or authentication service unavailable.'
  } finally {
    isLoading.value = false
  }
}
</script>
