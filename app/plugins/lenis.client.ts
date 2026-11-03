import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export default defineNuxtPlugin((nuxtApp) => {
  gsap.registerPlugin(ScrollTrigger)

  const lenis = new Lenis({
    autoRaf: false,
    anchors: true,
    lerp: 0.045,
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.015,
    wheelMultiplier: 0.9,
  })

  const updateLenis = (time: number) => {
    lenis.raf(time * 1000)
  }

  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(updateLenis)
  gsap.ticker.lagSmoothing(0)

  nuxtApp.vueApp.onUnmount(() => {
    gsap.ticker.remove(updateLenis)
    lenis.destroy()
  })

  return {
    provide: {
      lenis,
    },
  }
})
