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
        {
          name: 'description',
          content:
            'Katalog harga transparan dan konfigurator pemesanan iklan digital jaringan media Hallopedia di Samarinda, Balikpapan, Kaltim, dan Kalimantan.',
        },
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
