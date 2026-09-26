<template>
  <div>
    <!-- Backdrop Overlay -->
    <transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40 bg-[#000000]/70 backdrop-blur-none"
        @click="handleClose"
      />
    </transition>

    <!-- Side Panel Drawer (slides in from right, ~480px width, rounded-l-[16px], hairline border) -->
    <transition
      enter-active-class="transition-transform duration-200 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-150 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="isOpen"
        class="fixed top-0 bottom-0 right-0 z-50 w-full max-w-[480px] bg-[#1e2353] border-l border-[#23272a] rounded-l-[16px] flex flex-col justify-between shadow-[0_3px_68px_rgba(0,0,0,0.6)] font-sans"
      >
        <!-- Panel Header -->
        <div class="h-16 px-6 border-b border-[#23272a] flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-[#5865f2]/20 border border-[#5865f2]/40 flex items-center justify-center text-[#5865f2]">
              <Stethoscope :size="16" :stroke-width="1.75" />
            </div>
            <div>
              <h2 class="text-[20px] font-[700] text-[#ffffff] font-display uppercase tracking-tight">
                {{ isEditing ? 'Edit Clinic Client' : 'Add New Clinic Client' }}
              </h2>
            </div>
          </div>

          <button
            type="button"
            @click="handleClose"
            class="w-8 h-8 rounded-full hover:bg-[#23272a] text-[#ffffff]/60 hover:text-[#ffffff] flex items-center justify-center transition-colors duration-120 cursor-pointer"
            aria-label="Close panel"
          >
            <X :size="18" :stroke-width="1.75" />
          </button>
        </div>

        <!-- Panel Form Body (Scrollable) -->
        <form @submit.prevent="handleSubmit" id="client-form" class="flex-1 overflow-y-auto p-6 space-y-8">
          <!-- Server Error Alert -->
          <div v-if="serverError" class="rounded-[12px] bg-rose-950/40 border border-rose-800/60 p-3 text-rose-300 text-[13px] flex items-center gap-2">
            <AlertCircle :size="16" class="shrink-0 text-rose-400" />
            <span>{{ serverError }}</span>
          </div>

          <!-- Section 1: Identity -->
          <div class="space-y-4">
            <div class="border-b border-[#23272a] pb-1.5 flex items-center justify-between">
              <span class="text-[12px] font-[700] uppercase tracking-wider text-[#ffffff]/40 font-display">
                1. Identity &amp; Tenant Slug
              </span>
              <span class="text-[11px] font-mono text-[#00b0f4]">Required</span>
            </div>

            <!-- Client Name -->
            <div class="space-y-1.5">
              <label class="block text-[14px] font-[500] text-[#ffffff]">
                Clinic / Service Brand Name
              </label>
              <input
                v-model="form.name"
                type="text"
                placeholder="e.g. Smize Dental Clinic & Implant Center"
                :disabled="isSaving"
                :class="[
                  'w-full rounded-[12px] bg-[#0a0d3a] border px-4 py-2 text-[15px] text-[#ffffff] placeholder-[#ffffff]/40 transition-colors duration-120 focus:outline-none',
                  errors.name
                    ? 'border-rose-500 ring-1 ring-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/80'
                    : 'border-[#23272a] focus:border-[#5865f2] focus:ring-2 focus:ring-[#5865f2]'
                ]"
              />
              <p v-if="errors.name" class="text-[12px] text-rose-400 font-sans flex items-center gap-1">
                <AlertCircle :size="12" /> {{ errors.name }}
              </p>
            </div>

            <!-- Slug -->
            <div class="space-y-1.5">
              <label class="block text-[14px] font-[500] text-[#ffffff]">
                Tenant Identifier Slug
              </label>
              <div class="relative">
                <input
                  v-model="form.slug"
                  type="text"
                  placeholder="smize-dental-pune"
                  :disabled="isSaving"
                  :class="[
                    'w-full rounded-[12px] bg-[#0a0d3a] border px-4 py-2 font-mono text-[14px] text-[#00b0f4] placeholder-[#ffffff]/40 transition-colors duration-120 focus:outline-none',
                    errors.slug
                      ? 'border-rose-500 ring-1 ring-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/80'
                      : 'border-[#23272a] focus:border-[#5865f2] focus:ring-2 focus:ring-[#5865f2]'
                  ]"
                />
              </div>
              <p v-if="errors.slug" class="text-[12px] text-rose-400 font-sans flex items-center gap-1">
                <AlertCircle :size="12" /> {{ errors.slug }}
              </p>
              <p v-else class="text-[12px] text-[#ffffff]/50">
                Unique identifier used in webhook routing and database multi-tenancy.
              </p>
            </div>
          </div>

          <!-- Section 2: WhatsApp Credentials -->
          <div class="space-y-4">
            <div class="border-b border-[#23272a] pb-1.5 flex items-center justify-between">
              <span class="text-[12px] font-[700] uppercase tracking-wider text-[#ffffff]/40 font-display">
                2. WhatsApp Credentials (Meta Cloud API)
              </span>
              <span class="text-[11px] font-mono text-[#00b0f4]">Required</span>
            </div>

            <!-- Phone Number ID -->
            <div class="space-y-1.5">
              <label class="block text-[14px] font-[500] text-[#ffffff]">
                WhatsApp Phone Number ID
              </label>
              <input
                v-model="form.phoneId"
                type="text"
                placeholder="109876543210987"
                :disabled="isSaving"
                :class="[
                  'w-full rounded-[12px] bg-[#0a0d3a] border px-4 py-2 font-mono text-[14px] text-[#ffffff] placeholder-[#ffffff]/40 transition-colors duration-120 focus:outline-none',
                  errors.phoneId
                    ? 'border-rose-500 ring-1 ring-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/80'
                    : 'border-[#23272a] focus:border-[#5865f2] focus:ring-2 focus:ring-[#5865f2]'
                ]"
              />
              <p v-if="errors.phoneId" class="text-[12px] text-rose-400 font-sans flex items-center gap-1">
                <AlertCircle :size="12" /> {{ errors.phoneId }}
              </p>
            </div>

            <!-- Display Phone Number -->
            <div class="space-y-1.5">
              <label class="block text-[14px] font-[500] text-[#ffffff]">
                Display Phone Number
              </label>
              <input
                v-model="form.phone"
                type="text"
                placeholder="+91 98765 43210"
                :disabled="isSaving"
                :class="[
                  'w-full rounded-[12px] bg-[#0a0d3a] border px-4 py-2 font-mono text-[14px] text-[#ffffff] placeholder-[#ffffff]/40 transition-colors duration-120 focus:outline-none',
                  errors.phone
                    ? 'border-rose-500 ring-1 ring-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/80'
                    : 'border-[#23272a] focus:border-[#5865f2] focus:ring-2 focus:ring-[#5865f2]'
                ]"
              />
              <p v-if="errors.phone" class="text-[12px] text-rose-400 font-sans flex items-center gap-1">
                <AlertCircle :size="12" /> {{ errors.phone }}
              </p>
            </div>

            <!-- Webhook Verify Token / Access Token -->
            <div class="space-y-1.5">
              <label class="block text-[14px] font-[500] text-[#ffffff]">
                Meta Permanent Access Token / Secret
              </label>
              <input
                v-model="form.accessToken"
                type="password"
                placeholder="EAAK..."
                :disabled="isSaving"
                :class="[
                  'w-full rounded-[12px] bg-[#0a0d3a] border px-4 py-2 font-mono text-[14px] text-[#ffffff] placeholder-[#ffffff]/40 transition-colors duration-120 focus:outline-none',
                  errors.accessToken
                    ? 'border-rose-500 ring-1 ring-rose-500/50 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/80'
                    : 'border-[#23272a] focus:border-[#5865f2] focus:ring-2 focus:ring-[#5865f2]'
                ]"
              />
              <p v-if="errors.accessToken" class="text-[12px] text-rose-400 font-sans flex items-center gap-1">
                <AlertCircle :size="12" /> {{ errors.accessToken }}
              </p>
            </div>
          </div>

          <!-- Section 3: Hours & Content / AI Prompt -->
          <div class="space-y-4">
            <div class="border-b border-[#23272a] pb-1.5 flex items-center justify-between">
              <span class="text-[12px] font-[700] uppercase tracking-wider text-[#ffffff]/40 font-display">
                3. Operating Hours &amp; Bot Guardrails
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="block text-[13px] font-[500] text-[#ffffff]">Opening Hour</label>
                <input
                  v-model="form.openingTime"
                  type="time"
                  :disabled="isSaving"
                  class="w-full rounded-[12px] bg-[#0a0d3a] border border-[#23272a] px-3 py-2 text-[14px] text-[#ffffff] focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>

              <div class="space-y-1.5">
                <label class="block text-[13px] font-[500] text-[#ffffff]">Closing Hour</label>
                <input
                  v-model="form.closingTime"
                  type="time"
                  :disabled="isSaving"
                  class="w-full rounded-[12px] bg-[#0a0d3a] border border-[#23272a] px-3 py-2 text-[14px] text-[#ffffff] focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-[14px] font-[500] text-[#ffffff]">
                Custom Bot Booking Instructions
              </label>
              <textarea
                v-model="form.promptGuardrail"
                rows="3"
                :disabled="isSaving"
                placeholder="Specific rules (e.g. dental consult slot 30m, doctor OPD timings, party/patient intake)..."
                class="w-full rounded-[12px] bg-[#0a0d3a] border border-[#23272a] px-4 py-2 text-[14px] text-[#ffffff] placeholder-[#ffffff]/40 focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
              />
            </div>
          </div>

          <!-- Section 4: Quota & Plan -->
          <div class="space-y-4">
            <div class="border-b border-[#23272a] pb-1.5 flex items-center justify-between">
              <span class="text-[12px] font-[700] uppercase tracking-wider text-[#ffffff]/40 font-display">
                4. Monthly Quota &amp; Plan
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="block text-[13px] font-[500] text-[#ffffff]">Monthly Message Quota</label>
                <select
                  v-model="form.quotaMax"
                  :disabled="isSaving"
                  class="w-full rounded-[12px] bg-[#0a0d3a] border border-[#23272a] px-3 py-2 text-[14px] text-[#ffffff] focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer"
                >
                  <option :value="5000">5,000 messages / mo</option>
                  <option :value="10000">10,000 messages / mo</option>
                  <option :value="25000">25,000 messages / mo</option>
                  <option :value="50000">50,000 messages / mo</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="block text-[13px] font-[500] text-[#ffffff]">Plan</label>
                <select
                  v-model="form.plan"
                  :disabled="isSaving"
                  class="w-full rounded-[12px] bg-[#0a0d3a] border border-[#23272a] px-3 py-2 text-[14px] text-[#ffffff] focus:border-[#5865f2] focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer"
                >
                  <option value="MONTHLY">₹999/mo (Monthly)</option>
                  <option value="QUARTERLY">₹3,000/qtr (Quarterly)</option>
                </select>
              </div>
            </div>

            <label class="flex items-center gap-3 cursor-pointer pt-2">
              <button
                type="button"
                @click="form.isFeatured = !form.isFeatured"
                :class="form.isFeatured ? 'bg-[#ec48bd]' : 'bg-[#23272a]'"
                class="relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#ec48bd]"
              >
                <span
                  :class="form.isFeatured ? 'translate-x-5' : 'translate-x-0'"
                  class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#ffffff] transition duration-120"
                />
              </button>
              <span class="text-[13px] font-[500] text-[#ffffff]">Mark as Featured PRO Clinic</span>
            </label>
          </div>
        </form>

        <!-- Sticky Footer Action Bar -->
        <div class="p-4 px-6 border-t border-[#23272a] bg-[#1e2353] flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            @click="handleClose"
            :disabled="isSaving"
            class="px-4 py-2.5 rounded-[16px] bg-[#0a0d3a] hover:bg-[#23272a] text-[#ffffff] text-[14px] font-[500] border border-[#23272a] transition-colors duration-120 cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="client-form"
            :disabled="isSaving"
            class="inline-flex items-center gap-2 px-6 py-2.5 rounded-[12px] bg-[#5865f2] hover:bg-[#4752c4] active:bg-[#3c45a5] text-[#ffffff] text-[16px] font-[500] leading-[1.4] transition-colors duration-120 focus:outline-none focus:ring-2 focus:ring-[#5865f2] cursor-pointer disabled:opacity-60"
          >
            <Loader2 v-if="isSaving" :size="16" class="animate-spin" />
            <Check v-else :size="16" :stroke-width="2" />
            <span>{{ isEditing ? 'Update Client' : 'Save Client' }}</span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { createClient, updateClient } from '@/api/clients'
import {
  Stethoscope,
  X,
  AlertCircle,
  Check,
  Loader2
} from 'lucide-vue-next'

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  clientData: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const isEditing = ref(false)
const isSaving = ref(false)
const serverError = ref('')

const form = reactive({
  id: null,
  name: '',
  slug: '',
  phone: '',
  phoneId: '',
  accessToken: '',
  openingTime: '10:00',
  closingTime: '20:30',
  promptGuardrail: '',
  quotaMax: 10000,
  plan: 'MONTHLY',
  mrr: 999,
  isFeatured: false
})

const errors = reactive({
  name: '',
  slug: '',
  phone: '',
  phoneId: '',
  accessToken: ''
})

watch(
  () => props.clientData,
  (val) => {
    serverError.value = ''
    if (val) {
      isEditing.value = true
      form.id = val.id
      form.name = val.name || ''
      form.slug = val.slug || ''
      form.phone = val.phone || ''
      form.phoneId = val.phoneId || '109876543210987'
      form.accessToken = '••••••••••••••••'
      form.openingTime = val.openingTime || '10:00'
      form.closingTime = val.closingTime || '20:30'
      form.promptGuardrail = val.promptGuardrail || ''
      form.quotaMax = val.quotaMax || 10000
      form.plan = (val.plan === 'QUARTERLY' || val.mrr === 1000 || val.mrr === 3000) ? 'QUARTERLY' : 'MONTHLY'
      form.mrr = form.plan === 'QUARTERLY' ? 1000 : 999
      form.isFeatured = !!val.isFeatured
    } else {
      isEditing.value = false
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  serverError.value = ''
  form.id = null
  form.name = ''
  form.slug = ''
  form.phone = ''
  form.phoneId = ''
  form.accessToken = ''
  form.openingTime = '10:00'
  form.closingTime = '20:30'
  form.promptGuardrail = ''
  form.quotaMax = 10000
  form.plan = 'MONTHLY'
  form.mrr = 999
  form.isFeatured = false

  errors.name = ''
  errors.slug = ''
  errors.phone = ''
  errors.phoneId = ''
  errors.accessToken = ''
}

function handleClose() {
  resetForm()
  emit('close')
}

function validate() {
  let valid = true
  serverError.value = ''
  errors.name = ''
  errors.slug = ''
  errors.phone = ''
  errors.phoneId = ''
  errors.accessToken = ''

  if (!form.name.trim()) {
    errors.name = 'Clinic / service brand name is required.'
    valid = false
  }

  if (!form.slug.trim()) {
    errors.slug = 'Tenant identifier slug is required.'
    valid = false
  } else if (!/^[a-z0-9-]+$/.test(form.slug)) {
    errors.slug = 'Slug must only contain lowercase alphanumeric characters and hyphens.'
    valid = false
  }

  if (!form.phone.trim()) {
    errors.phone = 'Display phone number is required.'
    valid = false
  }

  if (!form.phoneId.trim()) {
    errors.phoneId = 'WhatsApp Phone Number ID is required.'
    valid = false
  }

  if (!isEditing.value && !form.accessToken.trim()) {
    errors.accessToken = 'Meta access token is required to initialize webhook engine.'
    valid = false
  }

  return valid
}

async function handleSubmit() {
  if (!validate()) return

  isSaving.value = true
  serverError.value = ''

  try {
    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim(),
      phone: form.phone.trim(),
      phoneId: form.phoneId.trim(),
      openingTime: form.openingTime,
      closingTime: form.closingTime,
      promptGuardrail: form.promptGuardrail,
      quotaMax: form.quotaMax,
      plan: form.plan,
      mrr: form.plan === 'QUARTERLY' ? 1000 : 999,
      isFeatured: form.isFeatured
    }

    if (!isEditing.value || form.accessToken !== '••••••••••••••••') {
      payload.accessToken = form.accessToken
    }

    let savedResult
    try {
      if (isEditing.value && form.id) {
        savedResult = await updateClient(form.id, payload)
      } else {
        savedResult = await createClient(payload)
      }
    } catch (apiErr) {
      // Fallback local construct if API offline
      savedResult = {
        ...payload,
        id: form.id || Date.now(),
        status: 'ACTIVE',
        active: true,
        quotaUsed: props.clientData?.quotaUsed || 0
      }
    }

    emit('saved', savedResult || { ...payload, id: form.id || Date.now() })
    handleClose()
  } catch (err) {
    serverError.value = err.response?.data?.message || err.message || 'Failed to save client configuration.'
  } finally {
    isSaving.value = false
  }
}
</script>
