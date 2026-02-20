# 🐛 Cacing Kehidupan
### *Auto Simulation — Watch Life Unfold*

> Simulasi kehidupan cacing yang berjalan otomatis tanpa interaksi pengguna. Saksikan siklus hidup, reproduksi, evolusi, dan persaingan antarmakhluk berlangsung secara real-time di dalam tanah yang hidup.

<br/>

## 🌍 Tentang Game

**Cacing Kehidupan** adalah sebuah *zero-player auto-simulation* — artinya tidak ada input dari pemain. Pemain hanya **menonton** dunia yang terus berjalan, layaknya mengintip kehidupan di dalam tanah.

Dua karakter utama, **Aha** (🔵 cacing jantan) dan **Tika** (🩷 cacing betina), memiliki kehidupan dan rutinitas yang sangat manusiawi: Aha bekerja ke sana ke mari, pulang ke rumah secara terjadwal, sementara Tika menjaga zona rumah dan tidak segan mengusir cacing-cacing lain yang masuk ke wilayahnya.

<br/>

## 🗺️ Dunia & Lapisan

Dunia dibagi menjadi **3 lapisan vertikal** yang masing-masing memiliki karakteristik berbeda:

| Lapisan | Posisi | Sifat | Bahaya |
|---------|--------|-------|--------|
| 🌤️ **Surface (Atas)** | 0–25% | Terang, banyak makanan | Predator burung 🦅 |
| 🟤 **Mid Layer (Tengah)** | 25–65% | Seimbang, zona aman | Rendah |
| ⬛ **Deep Layer (Bawah)** | 65–100% | Gelap, makanan langka | Predator bawah 🐍 |

<br/>

## 🐛 Karakter Utama

### Aha (🔵 Alpha Male)
- **Peran:** Pencari nafkah — menjelajahi semua lapisan untuk mencari makan
- **HP:** 300 (alpha, sangat tahan)
- **Perilaku:**
  - Bebas menjelajahi ke mana saja
  - Memiliki **jadwal pulang rumah** (setiap 25–50 detik)
  - Memulai homecoming → berjalan menuju Tika → sapa, lalu berangkat lagi
  - Tidak mengejar Tika secara spontan; hanya datang saat jadwal pulang

### Tika (🩷 Alpha Female)
- **Peran:** Penjaga rumah — mengelola zona tengah, mencari makan di dekat rumah
- **HP:** 300 (alpha, sangat tahan)
- **Perilaku:**
  - Punya **zona rumah** di pertengahan Mid Layer
  - Mencari makan hanya di radius kecil sekitar zona rumahnya
  - **Tidak pernah mengejar Aha**
  - Bertelur hanya ketika Aha sedang ada di dekatnya
  - 😤 **Pencemburu:** Langsung ngejar dan serang cacing jantan lain yang masuk area!

### Keturunan (🟢 Offspring)
- Lahir dari telur hasil reproduksi Aha & Tika
- **HP:** 80 (rapuh, mudah mati)
- Mewarisi genetik orang tua dengan kemungkinan mutasi
- Mandiri — bisa makan, istirahat, dan berkembang sendiri
- Nama: `Gen 2`, `Gen 3`, dst.

<br/>

## 🧬 Sistem Reproduksi & Evolusi

1. Tika memasuki state `REPRODUCING` jika:
   - Aha sedang di dekatnya (dalam radius 150px)
   - Hunger ≥ 50% dan Energy ≥ 55%
   - Cooldown reproduksi (25 detik) sudah selesai
   - Tidak sedang di Surface
2. **Telur** 🥚 diletakkan di posisi Tika
3. Telur menetas setelah 10 detik → lahirlah keturunan baru
4. Setiap keturunan mewarisi gabungan genetik kedua orang tua (**crossover**) dengan kemungkinan **30% mutasi trait**

### Trait Genetik
Setiap cacing memiliki satu trait yang mempengaruhi perilakunya:

| Trait | Efek |
|-------|------|
| `FAST` | Kecepatan bergerak lebih tinggi |
| `BULKY` | Ukuran tubuh lebih besar |
| `KEEN_SENSES` | Deteksi makanan lebih jauh |
| `DIGGER` | Lebih nyaman di lapisan dalam |
| `AGILE` | Menghindari predator lebih baik |
| `FERTILE` | Cooldown reproduksi lebih pendek |
| `HARDY` | Drain vitals lebih lambat |

<br/>

## 🤖 Sistem AI & State Machine

Setiap cacing berjalan menggunakan **finite state machine**. State aktif menentukan tindakan yang diambil per frame:

```
IDLE        → berjalan santai, ganti target sesekali
FORAGING    → mencari dan memakan makanan / jamur
RESTING     → diam / bergerak lambat (energi rendah)
FLEEING     → kabur ke lapisan lebih dalam (bahaya!)
BONDING     → berjalan menuju pasangan (Aha pulang)
REPRODUCING → bergerak ke pasangan lalu bertelur
FIGHTING    → Tika mengejar & menyerang rival jantan 😤
HUNTING     → predator mengincar mangsa
```

State diprioritaskan:
1. **Bahaya** (baru dari predator) → `FLEEING`
2. **Kelaparan kritis** (<15%) → `FORAGING`
3. **Role-specific AI** → `_decideMale` / `_decideFemale` / `_decideOffspring`

<br/>

## 🌱 Ekologi Dunia

### Makanan & Jamur
- Makanan 🟢 muncul secara acak di seluruh lapisan dengan laju `0.3%` per frame
- Jamur 🫧 tumbuh dan menyebar perlahan — nutrisi tinggi
- Worm bergerak ke makanan terdekat saat lapar

### Predator
- **Burung** 🦅 mengintai di Surface — berbahaya kalau cacing naik terlalu tinggi
- **Predator Bawah** 🐍 mengancam di Deep Layer
- Predator mengincar cacing dalam radius 200px
- Diserang → `lastDangerTime` diperbarui → cacing masuk `FLEEING` selama 3 detik

### Batu & Lingkungan
- **Batu** 🪨 tersebar di seluruh dunia — jadi rintangan navigasi
- **WorldFeature** — akar pohon, tanah khusus, dan elemen visual dekoratif

### Musim
Musim berganti setiap **5 menit**:

| Musim | Efek |
|-------|------|
| 🌧️ **RAINY** | Makanan lebih banyak |
| ☀️ **DRY** | Makanan lebih langka |
| 🌤️ **MILD** | Kondisi seimbang |

### Era & Generasi
- **Era** meningkat setiap 30 menit → memicu mutasi massal pada keturunan baru
- Jika Aha atau Tika bertahan selama **24 jam** → menjadi **Golden Worm** 🏆

<br/>

### 📊 Modern HUD (React-based)
- **Stamina AHA**: Persentase energi/lapar cacing jantan.
- **Energi TIKA**: Persentase energi/lapar cacing betina.
- **Progres Tanaman**: Status pertumbuhan tanaman di permukaan.
- **Progres Batu**: Status HP batu yang sedang ditambang.
- **Waktu & Event**: Jam dunia dan pengumuman event penting di tengah atas.

### 🌱 Sistem Siram & Pertumbuhan
1. **Titik Air**: Muncul secara acak di lapisan tanah saat cuaca 🌧️ **RAINY**.
2. **Koleksi**: Aha akan secara otomatis memprioritaskan pengambilan air jika tanaman membutuhkan.
3. **Penyiraman**: Aha membawa air ke permukaan untuk menyiram **Tanaman Induk**.
4. **Pertumbuhan**: Setiap siraman meningkatkan `plantPoints`, mengubah visual tanaman dari kecambah menjadi dewasa.

<br/>

## 🏗️ Arsitektur Proyek

```
Cacing Kehidupan/
├── index.html
├── vite.config.js
└── src/
    ├── main.jsx            # Entry point React
    ├── App.jsx             # Komponen utama, mount canvas
    ├── constants.js        # Semua konstanta & konfigurasi world
    ├── utils.js            # Helper: dist, clamp, angleTo, random, dll
    ├── core/
    │   └── GameEngine.js   # Loop utama, spawning, world state
    ├── classes/
    │   ├── Worm.js         # AI + fisika + render cacing
    │   ├── Egg.js          # Telur: inkubasi & hatch
    │   ├── Predator.js     # AI predator (burung & bawah tanah)
    │   ├── Rock.js         # Obstacle batu
    │   ├── WorldFeature.js # Elemen latar (akar, tanah khusus)
    │   ├── Collectible.js  # Makanan & jamur
    │   └── Particle.js     # Efek partikel visual
    └── styles/
        └── ...             # CSS styling
```

<br/>

## ⚙️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | React + Vite |
| Rendering | HTML5 Canvas 2D API |
| AI | Custom Finite State Machine |
| Fisika | Manual vector math (no physics lib) |
| Styling | Vanilla CSS |

<br/>

## 🚀 Menjalankan Lokal

```bash
# Install dependensi
npm install

# Jalankan dev server
npm run dev

# Buka browser
# → http://localhost:5174
```

Simulasi akan langsung berjalan otomatis. Tidak ada tombol play, tidak ada kontrol — **duduk dan nikmati saja**. ☕

<br/>

## 🏆 Kondisi Spesial

| Kondisi | Deskripsi |
|---------|-----------|
| **Golden Worm** 🟡 | Aha atau Tika bertahan > 24 jam |
| **Extinction** 💀 | Semua cacing mati → simulasi restart otomatis |
| **Evolusi** 🧬 | Setiap generasi baru mungkin membawa mutasi |
| **Homecoming** 🏠 | Aha kembali ke Tika setiap 25–50 detik |
| **Fight** 😤 | Tika mengusir cacing jantan lain dari zona rumahnya |

<br/>

---

*Dibuat dengan ❤️ — karena kehidupan di dalam tanah lebih kompleks dari yang kamu kira.*
