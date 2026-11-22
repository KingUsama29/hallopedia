<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useOrderPortal } from '~/composables/useOrderPortal'
import { usePwaStatus } from '~/composables/usePwaStatus'

const { totalUnreadMessages } = useOrderPortal()
const {
  swReady,
  isStandalone,
  canInstallPrompt,
  supportsBadgeApi,
  notificationPermission,
  refreshNotificationPermission,
  promptInstall,
  requestNotificationPermission,
  sendPreviewBrowserNotification,
} = usePwaStatus()

const feedbackText = ref('')
const isWorking = ref(false)

onMounted(() => {
  refreshNotificationPermission()
})

async function handleEnableNotifications() {
  isWorking.value = true
  feedbackText.value = ''
  const result = await requestNotificationPermission()
  isWorking.value = false
  if (result === 'granted') {
    feedbackText.value = 'Notifikasi browser diaktifkan untuk pembaruan pesanan.'
  } else if (result === 'denied') {
    feedbackText.value = 'Izin notifikasi ditolak browser. Anda tetap menerima pembaruan lewat ikon lonceng.'
  }
}

async function handleSendPreviewNotification() {
  isWorking.value = true
  feedbackText.value = ''
  const sent = await sendPreviewBrowserNotification({
    title: 'Hallopedia — Pembaruan Pesanan',
    body:
      totalUnreadMessages.value > 0
        ? `Anda memiliki ${totalUnreadMessages.value} pesan Admin yang belum dibaca.`
        : 'Notifikasi perangkat dan lencana pesanan siap menerima balasan Admin.',
    unreadCount: totalUnreadMessages.value,
  })
  isWorking.value = false
  feedbackText.value = sent
    ? 'Pratinjau notifikasi dikirim ke perangkat ini.'
    : 'Izin notifikasi belum aktif di browser ini.'
}

async function handleInstallApp() {
  isWorking.value = true
  feedbackText.value = ''
  const outcome = await promptInstall()
  isWorking.value = false
  if (outcome === 'accepted') {
    feedbackText.value = 'Aplikasi Hallopedia sedang dipasang di perangkat Anda.'
  }
}
</script>

<template>
  <section
    aria-label="Status Aplikasi PWA dan Notifikasi Browser"
    class="no-print mt-6 border border-black/15 bg-[#0b0b0b] px-5 py-4 text-white"
  >
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2 text-[9px] font-bold tracking-[1.6px] text-[#a3a3a3] uppercase">
          <span class="h-[6px] w-[6px] rounded-full bg-[#ed3541]" aria-hidden="true"></span>
          <span>APLIKASI WEB (PWA) &amp; NOTIFIKASI</span>
          <span v-if="swReady" class="border border-[#292929] bg-[#141414] px-2 py-0.5 text-white">
            SERVICE WORKER SIAP
          </span>
          <span v-if="isStandalone" class="bg-[#ed3541] px-2 py-0.5 text-white">
            MODE APLIKASI AKTIF
          </span>
          <span v-else-if="supportsBadgeApi" class="border border-[#292929] bg-[#141414] px-2 py-0.5 text-[#ccc]">
            LENCANA IKON DIDUKUNG
          </span>
        </div>

        <p class="mt-2 mb-0 text-[12px] leading-[1.55] text-[#ccc]">
          <template v-if="notificationPermission === 'granted'">
            Notifikasi browser aktif. Balasan Admin dan konfirmasi jadwal dapat muncul langsung di perangkat Anda.
          </template>
          <template v-else-if="notificationPermission === 'denied'">
            Izin notifikasi saat ini diblokir di pengaturan browser. Anda tetap dapat memantau pesan Admin melalui ikon lonceng di atas.
          </template>
          <template v-else-if="notificationPermission === 'unsupported'">
            Browser ini tidak mendukung Web Notification. Gunakan ikon lonceng notifikasi di bagian atas halaman untuk memantau balasan Admin.
          </template>
          <template v-else>
            Aktifkan notifikasi browser secara sukarela agar balasan Admin dan status pelunasan DP segera terlihat di perangkat Anda.
          </template>
        </p>

        <p v-if="feedbackText" role="status" class="mt-1.5 mb-0 text-[11px] font-semibold text-[#ed3541]">
          {{ feedbackText }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2.5">
        <button
          v-if="notificationPermission === 'default'"
          type="button"
          :disabled="isWorking"
          class="min-h-[44px] cursor-pointer bg-[#ed3541] px-4 py-2 text-[10px] font-bold tracking-[1.3px] text-white uppercase transition-colors hover:bg-[#ff4754] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          @click="handleEnableNotifications"
        >
          AKTIFKAN NOTIFIKASI BROWSER
        </button>

        <button
          v-else-if="notificationPermission === 'granted'"
          type="button"
          :disabled="isWorking"
          class="min-h-[44px] cursor-pointer border border-[#292929] bg-[#141414] px-4 py-2 text-[10px] font-bold tracking-[1.3px] text-white uppercase transition-colors hover:border-[#ed3541] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed3541] disabled:opacity-60"
          @click="handleSendPreviewNotification"
        >
          KIRIM PRATINJAU NOTIFIKASI
        </button>

        <button
          v-if="canInstallPrompt"
          type="button"
          :disabled="isWorking"
          class="min-h-[44px] cursor-pointer border border-white/30 bg-white px-4 py-2 text-[10px] font-extrabold tracking-[1.3px] text-[#0b0b0b] uppercase transition-colors hover:bg-[#ed3541] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
          @click="handleInstallApp"
        >
          PASANG APLIKASI →
        </button>
      </div>
    </div>
  </section>
</template>

