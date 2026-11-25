# 🍳 Dapur Ember — Warung Masak Kilat

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/kinu2932/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/c/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/kinu2932/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/c/best-cooking-game-20261125-0137)

**Dapur Ember** adalah game masak orisinal: kamu satu-satunya koki di sebuah
warung kecil yang panas. Pesanan masuk lewat papan order, kamu berlari
mengambil bahan dari rak, memanggang patty sampai SIAP (jangan gosong!),
mencincang tomat dan selada di talenan, merakit burger di piring, lalu
menyajikannya di jendela sebelum pelanggan pergi. Tip besar kalau cepat,
kombo naik kalau tak pernah gagal — dan jam sibuk datang di tengah hari.

## Cara main

- **WASD / panah** — bergerak (atau klik lantai untuk berjalan ke sana)
- **E** — ambil / taruh / sajikan (di dekat rak, panggangan, penggoreng, talenan, meja rakitan, jendela saji)
- **Tahan SPASI** — mencincang di talenan
- **Q** — buang yang dipegang · **M** — suara · **R** — hari baru

Lima resep: Ember Klasik, Keju Lava, Sayur Segar, Komplit Ember, Kentang Ember.
Patty matang dalam 6 detik dan gosong setelah 12 detik; kentang matang 8 detik,
gosong setelah 15 detik. Pesanan hangus kalau kesabarannya habis.

## Main lokal

```sh
node serve.ts   # lalu buka http://localhost:8080
```

Game ini file statis di bawah `game/` tanpa build step dan tanpa network
request — semua gambar digambar dengan canvas 2D, semua suara disintesis
dengan WebAudio. Screenshot di `screenshots/` adalah render asli dari kode
game ini di browser.

## Entri make.fun

- Kompetisi: **Make the best cooking game** (`best-cooking-game-20261125-0137`)
- `main.ts` di root menyalin `game/` + `screenshots/` ke `/output` dan menulis
  `/output/dossier.json` dengan `buildDossier` dari `vendor/makefun-game.ts`.
- Lisensi: MIT.
