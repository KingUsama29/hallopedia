// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'id' },
      title: 'Hallopedia — Katalog & Pemesanan Layanan Periklanan Digital',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#0b0b0b' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Hallopedia' },
        {
          name: 'description',
          content:
            'Katalog harga transparan dan konfigurator pemesanan iklan digital jaringan media Hallopedia di Samarinda, Balikpapan, Kaltim, dan Kalimantan.',
        },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icons/icon-192.png' },
      ],
    },
  },
  postcss: {
    plugins: {
      'tailwindcss/nesting': false,
    },
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
})
