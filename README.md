# Ruang Guru Inklusif

Aplikasi web satu file (`index.html`) untuk guru pendidikan khusus: membuat **soal ujian**, **modul ajar**, dan **LKPD** otomatis sesuai mata pelajaran, kelas, dan ketunaan. Kop surat mengikuti format Provinsi Jawa Timur (saat ini SLB Negeri Tompokersan Lumajang).

## Fitur
- Masuk dan daftar memakai **username** (gabungan nama dan angka, contoh `sony18`) dan kata sandi, tanpa email
- Generator Soal Ujian dengan 6 model soal (pilihan ganda, benar-salah, menjodohkan, isian singkat, bergambar, uraian) plus kunci jawaban, Modul Ajar, dan LKPD
- Penyesuaian untuk 8 jenis ketunaan dan 3 tingkat kemampuan
- Kop surat otomatis, logo sekolah, kolom tanda tangan
- Hasil bisa diedit, dicetak/PDF, disalin ke Word, atau diunduh `.doc`
- Arsip (Firestore bila Firebase aktif, kalau tidak di perangkat)
- Tombol A− / A+ untuk memperbesar huruf
- Panel Admin untuk membantu guru yang lupa akun

## Soal bergambar
- Isi jumlah tiap model soal di form (0 berarti tidak dipakai).
- Untuk benda sederhana (hewan, buah, jumlah benda) AI memakai emoji besar.
- Untuk gambar nyata atau diagram, AI membuat kotak bertuliskan deskripsi gambar. Klik kotak itu di kertas, pilih foto dari perangkat, dan gambar otomatis masuk (ukurannya dikecilkan agar arsip tidak berat).
- **Unggah gambar sebagai bahan soal:** di form Soal Ujian pilih sampai 4 gambar. AI melihat gambar itu, membuat soal berdasarkan isinya, dan menyisipkan gambarnya di soal yang sesuai.
- **Sisipkan gambar sendiri:** setelah hasil muncul, letakkan kursor di kertas lalu klik tombol **Sisipkan gambar**.
- Untuk peserta didik tunanetra, soal bergambar diganti deskripsi verbal.

## Gudang Materi dan Bank Soal
- **Gudang Materi (hanya admin):** admin menempel teks atau mengunggah file `.txt` berisi materi atau strategi untuk ketunaan dan mata pelajaran tertentu. Saat guru membuat soal, AI otomatis memakai sampai 3 materi yang cocok sebagai acuan, sehingga hasilnya lebih sesuai dengan pendekatan sekolah. Materi dari Word atau PDF ditempel sebagai teks. Gudang ini khusus materi acuan; soal jadi disimpan di Bank Soal.
- **Bank Soal (khusus admin):** kumpulan soal ujian milik sekolah. Admin menambah soal lewat kotak **Tambah soal** (tempel dari Word atau unggah `.txt`) atau membagikan hasil dari menu Soal Ujian. Guru tidak melihat menu ini; guru hanya memakai menu Soal Ujian.
- Aturan Firestore di atas sudah memuat koleksi `materi` dan `bank`; tempel ulang aturannya.

## Soal menebali, kop sekolah, dan kunci terpisah
- **Menebali:** centang **Soal menebali** di form. AI membuat soal huruf, angka, atau kata pendek yang dicetak dengan font **Trace** (huruf putus-putus). Unggah file `Trace-lxy0.ttf` ke repositori **di folder yang sama dengan `index.html`**. Cetak lewat **Cetak Soal** lalu simpan sebagai PDF. File Word (.doc) tidak membawa font, jadi untuk soal menebali gunakan cetak/PDF.
- **Kop surat** punya tiga pilihan di form: **Bawaan sekolah** (SLB Negeri Tompokersan sudah memakai kop resminya), **Unggah kop sendiri** (foto atau screenshot kop, tersimpan di peramban guru), atau **Kop teks otomatis** (nama sekolah dan alamat bisa diketik). Untuk sekolah lain, pilih "Sekolah lain", ketik namanya, lalu unggah kop atau pakai kop teks.
- **Menambah kop bawaan sekolah lain:** tambahkan baris di objek `KOP` pada `index.html` dengan nama sekolah yang sama seperti di daftar `SEKOLAH` dan isi gambar kop dalam format data URL (base64).
- **Identitas siswa:** di bawah kop ada Nama (dikosongkan untuk ditulis siswa), Mata Pelajaran, Kelas, Jenjang, dan Ketunaan yang terisi otomatis.
- **Soal dan kunci jawaban dipisah** menjadi dua lembar dengan tombol cetak dan unduh masing-masing.
- **Mata pelajaran** berupa pilihan (atau ketik sendiri), **Kelas** I sampai XII (jenjang menyesuaikan), dan **Materi** opsional.

## Mode percobaan
1. Buka `index.html` di peramban atau unggah ke GitHub Pages.
2. Daftar akun (data hanya di peramban itu). Username `admin` otomatis menjadi admin (ubah di `ADMIN_USERS`).
3. Menu **Pengaturan** → isi Kunci API Gemini (gratis dari Google AI Studio).

## Memasang Firebase
1. Buat project di <https://console.firebase.google.com>.
2. **Authentication** → Sign-in method → aktifkan **Email/Password** (dipakai internal; guru tidak melihat email).
3. **Firestore Database** → buat database.
4. **Project settings** → Your apps → tambah Web app → salin konfigurasi ke `FIREBASE_CONFIG` di `index.html`:
   ```js
   const FIREBASE_CONFIG = {apiKey:"...",authDomain:"...",projectId:"...",appId:"..."};
   ```
5. **Authentication** → Settings → Authorized domains → tambahkan `namaanda.github.io`.
6. **Firestore** → Rules → tempel dan publikasikan:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{d}/documents {
       function isAdmin() {
         return request.auth != null &&
           exists(/databases/$(d)/documents/admins/$(request.auth.uid));
       }
       function owns(u) {
         return request.auth != null &&
           get(/databases/$(d)/documents/usernames/$(u)).data.uid == request.auth.uid;
       }
       match /usernames/{u} {
         allow get: if true;
         allow list: if isAdmin();
         allow create: if request.auth != null && request.resource.data.uid == request.auth.uid;
         allow update: if isAdmin() ||
           (request.auth != null && request.resource.data.uid == request.auth.uid &&
            (resource.data.reset == true || resource.data.uid == request.auth.uid));
       }
       match /profil/{u} {
         allow read: if isAdmin() || owns(u);
         allow write: if owns(u);
       }
       match /guru/{u}/arsip/{doc} {
         allow read, write: if owns(u);
       }
       match /materi/{id} {
         allow read: if request.auth != null;
         allow write: if isAdmin();
       }
       match /bank/{id} {
         allow read, create, delete: if isAdmin();
       }
       match /admins/{uid} {
         allow read: if request.auth != null && request.auth.uid == uid;
         allow create: if request.auth != null && request.auth.uid == uid &&
           get(/databases/$(d)/documents/usernames/sony18).data.uid == request.auth.uid;
       }
     }
   }
   ```

## Membuat akun admin
Admin adalah pemilik username `sony18` (ubah di `ADMIN_USERNAME` pada `index.html` dan di aturan Firestore bagian `usernames/sony18`).
1. Pastikan aturan Firestore terbaru sudah dipublikasikan.
2. **Segera** daftar lewat aplikasi dengan username `sony18` dan kata sandi pilihan Anda. Siapa pun yang pertama memakai username itu menjadi admin, jadi lakukan sebelum web dibagikan ke guru lain.
3. Setelah berhasil, menu **Panel Admin** dan **Gudang Materi** muncul otomatis.
Kata sandi tidak ditulis di kode. Gunakan kata sandi yang kuat dan jangan dibagikan.

## Jika guru lupa username atau kata sandi
Kata sandi tidak bisa dilihat siapa pun, termasuk admin.
- **Lupa username:** admin mencari nama guru di Panel Admin, username tertera di bawah nama.
- **Lupa kata sandi:** admin klik **Reset akun** pada nama guru. Guru lalu membuka tab **Daftar**, mengisi nama, username yang sama, dan kata sandi baru. Arsip lama tetap ada.
- Lakukan reset hanya saat guru siap mendaftar ulang, karena selama status reset username itu bisa didaftarkan siapa pun.
- Guru yang daftar sebelum versi ini perlu didaftarkan ulang (data akun versi email tidak terbawa).

## Kunci API Gemini
Disimpan di peramban masing-masing guru. Batasi kunci hanya untuk domain Anda di Google Cloud Console (HTTP referrers) dan pantau penggunaannya. Untuk skala besar, pindahkan pemanggilan AI ke server (Cloud Functions).

## AI bawaan untuk semua guru (tanpa mengisi kunci)
Jangan menaruh kunci Gemini di `index.html`: GitHub memblokirnya dan siapa pun bisa melihatnya. Gunakan perantara gratis Cloudflare Workers:
1. Buat akun di dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker** → beri nama (misalnya `rgi-ai`) → **Deploy**.
2. Klik **Edit code**, hapus isinya, tempel isi file `worker.js`, lalu **Deploy**.
3. Buka **Settings → Variables and Secrets** → **Add** → tipe **Secret**, nama `GEMINI_KEY`, isi dengan kunci Gemini → **Deploy**.
4. Salin alamat worker (berakhiran `.workers.dev`) dan tempel ke `AI_PROXY_URL` di bagian atas `<script>` pada `index.html`.
5. Unggah `index.html` ke GitHub. Guru langsung bisa membuat soal. Kunci pribadi di Pengaturan tetap diutamakan bila diisi.

Worker hanya menerima permintaan dari `dewantara-studio.github.io` (ubah `DIIZINKAN` di `worker.js` bila domain berubah).

## Menambah sekolah
Edit objek `SEKOLAH` di `index.html`:
```js
"SLB Negeri Contoh Kota":"Alamat lengkap sekolah"
```

## Menayangkan di GitHub Pages
Buat repositori bernama `ruang-guru-inklusif`, unggah `index.html` → Settings → Pages → Branch `main` → folder `/ (root)`. Alamat webnya: `https://dewantara-studio.github.io/ruang-guru-inklusif/`.
Setelah itu tambahkan domain `dewantara-studio.github.io` di Firebase (Authentication → Settings → Authorized domains).

## Google Analytics
Kode pelacakan (ID `G-2RRN3DP0W1`) sudah dipasang di bagian `<head>` pada `index.html`. Data kunjungan muncul di Google Analytics setelah web tayang di GitHub Pages. Untuk melihat pengunjung langsung, buka Analytics → Reports → Realtime. Pelacakan tidak membaca isi soal atau data guru.

## Catatan
- Hasil AI wajib diperiksa guru sebelum dipakai.
- Mode percobaan menyimpan sandi di peramban tanpa enkripsi. Gunakan hanya untuk mencoba.
