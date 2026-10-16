# 🛠️ Translation Fixer

Perbaiki hasil translate AI dengan **glosarium** dan **aturan penggantian** — tanpa AI, tanpa server, 100% berjalan di browser.

Tempelkan teks hasil translate, klik **Perbaiki Sekarang**, dan semua istilah yang salah diganti otomatis dengan istilah yang benar.

## Fitur

- **Perbaiki Dokumen** — tempel teks, klik sekali, hasil langsung muncul. Bisa disalin atau diunduh sebagai `.txt`.
- **Tampilkan Perubahan** — menyorot kata yang diganti dan menampilkan statistik jumlah penggantian per istilah.
- **Tambah Istilah** — form singkat (istilah salah, istilah benar, mode) dengan tombol Submit. Tekan Enter untuk submit cepat, atau tempel banyak istilah sekaligus dari Excel/Google Sheets.
- **Daftar Glosarium** — lihat, cari, edit, nonaktifkan, hapus, dan export istilah.
- **Aturan Ganti** — find & replace biasa atau Regex untuk kasus rumit.
- **Cek Konsistensi** — deteksi istilah yang belum diperbaiki, dipakai campur dengan padanannya, atau punya padanan ganda di glosarium.
- **Privat** — data tersimpan di `localStorage` browser Anda dan tidak dikirim ke mana pun.

## Struktur File

```
index.html   # tampilan halaman
style.css    # gaya
script.js    # semua logika
```

Tidak ada dependensi atau proses build. Cukup buka `index.html` di browser, atau upload ketiga file ke GitHub Pages.

## Cara Pakai

1. Buka tab **➕ Tambah Istilah**, isi istilah salah dan benar, lalu klik **Submit**.
2. Ulangi untuk istilah lain. Cek hasilnya di tab **📚 Daftar Glosarium**.
3. Tempel teks hasil translate di kotak **Perbaiki Dokumen** (paling atas).
4. Klik **✨ Perbaiki Sekarang**, lalu **📋 Salin** atau **⬇️ Unduh** hasilnya.

### Mode Glosarium

| Mode | Perilaku |
|---|---|
| **Kata utuh** | Hanya cocok jika berdiri sebagai kata sendiri (`awan` tidak mengubah `awanan`). Huruf besar/kecil diabaikan. |
| **Sebagian kata** | Cocok juga di dalam kata lain. Huruf besar/kecil diabaikan. |
| **Persis (Aa)** | Kata utuh dan harus sama persis, termasuk huruf besar/kecil. |

Pada mode selain Persis, pola huruf besar ikut dipertahankan: `Awan` → `Cloud`, `AWAN` → `CLOUD`. Istilah lebih dari satu kata (mis. `production scheme`) tetap cocok walau spasinya ganda atau ada baris baru di antaranya.

### Format Paste Massal

Satu istilah per baris. Pemisah yang didukung:

```
pelayan | server
awan → cloud
penyebaran aplikasi -> deployment
pipa data, pipeline
```

Copy langsung dari Excel atau Google Sheets (kolom dipisah TAB) juga bisa. Jika istilah salah sudah ada, padanannya diperbarui, bukan digandakan.

### Aturan Ganti (Regex)

Aturan dijalankan **setelah** glosarium, berurutan dari atas ke bawah.

- Tanpa centang Regex: teks dicari apa adanya (huruf besar/kecil dibedakan).
- Dengan centang Regex: pola ditulis sebagai regex JavaScript. Bisa memakai format `/pola/flags`, mis. `/(\d+) kali/i`.
- Di kolom ganti, gunakan `$1`, `$2`, `$&` untuk grup tangkapan, serta `\n` dan `\t` untuk baris baru dan tab.
- Regex yang tidak valid ditandai merah dan dilewati.

Contoh: cari `\s{2,}`, ganti ` ` (satu spasi), untuk merapikan spasi ganda.

### Cek Konsistensi

Tempel dokumen di tab **🔍 Cek Konsistensi**. Hasilnya:

- **Belum diperbaiki** — istilah salah masih ada di dokumen.
- **Tidak konsisten** — istilah salah dan istilah benar muncul bersamaan.
- **Konflik glosarium** — satu istilah salah punya lebih dari satu padanan.

## Data & Privasi

- Glosarium dan aturan disimpan di `localStorage` dengan kunci `tf_glossary_v2` dan `tf_rules_v2`.
- Data hanya ada di browser dan perangkat yang dipakai. Menghapus data situs atau berganti browser akan mengosongkan daftar, jadi gunakan **Export** untuk cadangan.
- Hasil Export berformat `salah | benar` per baris, dan bisa ditempel kembali lewat paste massal.

## Catatan

- Penggantian glosarium dilakukan satu kali jalan, sehingga hasil penggantian tidak diganti lagi oleh istilah lain.
- Istilah yang lebih panjang diproses lebih dulu daripada yang pendek.
- Browser yang didukung: versi terbaru Chrome, Edge, Firefox, dan Safari (membutuhkan dukungan regex Unicode `\p{L}`).
