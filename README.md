# tiktok-streak-bot

Kirim pesan jaga streak TikTok secara semi-otomatis pakai **Playwright** + **LLM**
(endpoint yang kompatibel OpenAI, mis. 9Router). Pesan dibuat bervariasi tiap run
oleh LLM; kalau LLM gagal, otomatis pakai template cadangan.

## Instalasi

```bash
cd tiktok-streak-bot
npm install
npx playwright install chromium   # unduh browser sekali saja
cp .env.example .env              # lalu isi LLM_BASE_URL / MODEL / KEY
```

## Login pertama (sekali saja)

```bash
npm run login
```

Browser terbuka, login manual ke akun TikTok. Sesi tersimpan di folder
`.profile/` dan dipakai run berikutnya. Jangan hapus folder itu.

## Jalankan

```bash
npm run send     # kirim ke semua target (headless)
npm run dry      # simulasi tanpa mengirim
npm run headed   # browser terlihat, buat debug / selesaikan CAPTCHA manual
```

Flag tambahan: `--no-react` (lewati reaksi video), `--login`, `--headed`, `--dry-run`.

## Jadwal otomatis

Contoh cron (2x sehari):

```
10 8,20 * * * cd /path/ke/tiktok-streak-bot && /usr/bin/node bot.js >> bot.log 2>&1
```

## Cara kerja

1. Buka profil tiap target (`config.js`), klik tombol Message.
2. Minta LLM buatkan satu pesan streak yang bervariasi (`llm.js`).
3. Ketik pesan dengan jeda manusiawi lalu kirim (Enter).
4. Khusus `syaa115275`: baca caption kartu video terbaru di chat, minta LLM
   buatkan reaksi singkat, kirim.
5. Jeda acak 4-9 detik antar chat. Semua aktivitas dicatat di `bot.log`.

## Risiko (baca dulu)

- Otomatisasi seperti ini **melanggar ToS TikTok**. Akun bisa kena limit,
  CAPTCHA berulang, atau dalam kasus ekstrem dibatasi/diblokir.
- Jangan pakai untuk spam atau kirim ke orang yang tidak dikenal.
- CAPTCHA slider kadang muncul; kalau headless gagal, jalankan `npm run headed`
  dan selesaikan manual.
- Selector DOM TikTok bisa berubah; kalau tombol tidak ketemu, buka dengan
  `--headed` dan sesuaikan selector di `bot.js` (`openChat` / `sendText`).
