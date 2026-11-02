
<script setup lang="ts">
</script>

<template>
  <main class="hero">

    <!-- NAVIGASI -->
    <nav class="navbar">
      <a href="#" class="logo">HALLOPEDIA<span>.</span></a>

      <p class="nav-description">
        JARINGAN MEDIA DIGITAL
      </p>

      <button class="menu-button">
        MENU <span>☰</span>
      </button>
    </nav>

    <!-- LABEL ATAS -->
    <div class="hero-label">
      <span class="red-dot"></span>
      MEDIA LOKAL · INFORMASI · PERIKLANAN
    </div>

    <!-- HEADLINE UTAMA -->
    <div class="headline">
      <h1 class="line-one">CERITA</h1>

      <div class="line-two">
        <h1>DAERAH.</h1>
        <span class="headline-note">
          INFORMASI DARI DEKAT,<br />
          MENJANGKAU LEBIH LUAS.
        </span>
      </div>

      <h1 class="line-three">JANGKAUAN</h1>

      <h1 class="line-four">
        <span>LEBIH</span> LUAS.
      </h1>
    </div>

    <!-- FOTO DOKUMENTASI -->
    <div class="photo photo-one">
      <img src="/images/news1.jpg" alt="Dokumentasi berita lokal" />
      <span>01 / INFORMASI</span>
    </div>

    <div class="photo photo-two">
      <img src="/images/news2.jpg" alt="Aktivitas masyarakat" />
      <span>02 / PERISTIWA</span>
    </div>

    <div class="photo photo-three">
      <img src="/images/news3.jpg" alt="Suasana daerah" />
      <span>03 / DAERAH</span>
    </div>

    <!-- BAGIAN BAWAH -->
    <div class="hero-bottom">
      <p>
        Mengabarkan berbagai cerita daerah.<br />
        Menghubungkan bisnis dengan lebih banyak audiens.
      </p>

      <div class="bottom-services">
        <span>JARINGAN MEDIA</span>
        <span>PERIKLANAN DIGITAL</span>
      </div>

      <div class="scroll-indicator">
        GULIR UNTUK MENJELAJAHI <span>↓</span>
      </div>
    </div>

  </main>
</template>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: #0b0b0b;
}

.hero {
  position: relative;
  min-height: 100svh;
  min-height: 650px;
  overflow: hidden;
  background: #0b0b0b;
  color: #fff;
  padding: 0 6%;
  font-family: Arial, Helvetica, sans-serif;
}

.navbar {
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #292929;
}

.logo {
  color: #fff;
  text-decoration: none;
  font-size: 25px;
  font-weight: 900;
  letter-spacing: -1.5px;
}

.logo span {
  color: #ed3541;
}

.nav-description {
  color: #888;
  font-size: 10px;
  letter-spacing: 2px;
}

.menu-button {
  background: transparent;
  border: 0;
  color: #fff;
  font-size: 11px;
  letter-spacing: 1px;
}

.menu-button span {
  margin-left: 12px;
}

.hero-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 38px;
  font-size: 10px;
  letter-spacing: 2px;
  color: #aaa;
}

.red-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ed3541;
}

.headline {
  position: relative;
  z-index: 2;
  width: 100%;
  margin-top: clamp(12px, 2.5vh, 25px);
  padding-bottom: 0;
}

.headline h1 {
  font-size: clamp(44px, 16.5vh, 112px);
  font-weight: 900;
  line-height: 0.82;
  letter-spacing: -0.085em;
  margin: 0;
}

.line-one {
  text-align: center;
}

.line-two {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
}

.line-two h1 {
  color: #ed3541;
}

.headline-note {
  font-size: 10px;
  line-height: 1.6;
  letter-spacing: 1.5px;
  color: #aaa;
  font-weight: 400;
}

.line-three {
  text-align: center;
}

.line-four {
  text-align: center;
}

.line-four span {
  color: #ed3541;
}

.photo {
  position: absolute;
  z-index: 3;
  width: 165px;
}

.photo img {
  display: block;
  width: 100%;
  height: 115px;
  object-fit: cover;
  filter: grayscale(25%);
}

.photo span {
  display: block;
  color: #aaa;
  font-size: 8px;
  letter-spacing: 1.5px;
  margin-top: 7px;
}

.photo-one {
  top: 28%;
  left: 7%;
  transform: rotate(-7deg);
}

.photo-two {
  top: 22%;
  right: 8%;
  transform: rotate(6deg);
}

.photo-three {
  bottom: 17%;
  right: 13%;
  transform: rotate(-5deg);
  z-index: 1;
}

.hero-bottom {
  position: absolute;
  z-index: 4;
  bottom: 25px;
  left: 6%;
  right: 6%;
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 20px;
}

.hero-bottom p {
  color: #aaa;
  font-size: 11px;
  line-height: 1.6;
  margin: 0;
}

.bottom-services {
  display: flex;
  gap: 20px;
  font-size: 9px;
  letter-spacing: 1px;
}

.bottom-services span:last-child {
  color: #ed3541;
}

.scroll-indicator {
  color: #aaa;
  font-size: 9px;
  letter-spacing: 1px;
}

.scroll-indicator span {
  color: #ed3541;
  margin-left: 8px;
}

@media (max-width: 700px) {
  .hero {
    min-height: 100svh;
    padding: 0 5%;  
  }

  .navbar {
    height: 68px;
  }

  .nav-description {
    display: none;
  }

  .hero-label {
    margin-top: 32px;
    font-size: 8px;
  }

  .headline {
    margin-top: 50px;
  }

  .headline h1 {
    font-size: clamp(43px, 11vw, 76px);
    letter-spacing: -0.07em;
  }

  .line-two {
    gap: 10px;
  }

  .headline-note {
    font-size: 7px;
    letter-spacing: 0;
  }

  .photo {
    width: 105px;
  }

  .photo img {
    height: 75px;
  }

  .photo-one {
    top: 24%;
    left: 5%;
  }

  .photo-two {
    top: 63%;
    right: 5%;
  }

  .photo-three {
    display: none;
  }

  .hero-bottom {
    bottom: 18px;
    flex-wrap: wrap;
  }

  .hero-bottom p {
    width: 100%;
    font-size: 10px;
  }

  .bottom-services {
    gap: 10px;
    font-size: 7px;
  }

  .scroll-indicator {
    font-size: 7px;
  }
}

</style>
