#!/usr/bin/env node
/**
 * tiktok-streak-bot
 * Kirim pesan jaga streak TikTok secara semi-otomatis (Playwright + LLM).
 *
 * Cara pakai:
 *   node bot.js --login     Buka browser headed, login manual sekali (cookie tersimpan di .profile/)
 *   node bot.js             Kirim pesan ke semua target (headless)
 *   node bot.js --headed    Kirim pesan dengan browser terlihat (debug / selesaikan CAPTCHA manual)
 *   node bot.js --dry-run   Cek login + simulasi tanpa benar-benar mengirim
 *   node bot.js --no-react  Lewati reaksi video di chat syaa115275
 *
 * Catatan: selector DOM TikTok bisa berubah sewaktu-waktu. Kalau gagal,
 * jalankan dengan --headed dan sesuaikan selector di fungsi openChat/sendText.
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { TARGETS, FALLBACK_MESSAGES } = require('./config');
const { generateMessage, generateReaction } = require('./llm');

const USER_DATA_DIR = path.join(__dirname, '.profile');
const LOG_FILE = path.join(__dirname, 'bot.log');

const args = process.argv.slice(2);
const OPT = {
  login: args.includes('--login'),
  headed: args.includes('--headed') || args.includes('--login'),
  dryRun: args.includes('--dry-run'),
  noReact: args.includes('--no-react'),
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_FILE, line + '\n');
  } catch {}
}

async function captchaVisible(page) {
  const markers = [
    'text=/drag the slider/i',
    'text=/verify to continue/i',
    'iframe[src*="captcha"]',
  ];
  for (const m of markers) {
    try {
      if (await page.locator(m).first().isVisible({ timeout: 1500 })) return true;
    } catch {}
  }
  return false;
}

async function loginState(page) {
  await page.goto('https://www.tiktok.com/', { waitUntil: 'domcontentloaded' });
  await sleep(4000);
  if (await captchaVisible(page)) return 'captcha';
  try {
    if (await page.locator('button:has-text("Log in")').first().isVisible({ timeout: 3000 })) {
      return 'logged-out';
    }
  } catch {}
  return 'ok';
}

async function openChat(page, username) {
  await page.goto(`https://www.tiktok.com/@${username}`, { waitUntil: 'domcontentloaded' });
  await sleep(rand(2500, 4500));
  if (await captchaVisible(page)) return 'captcha';
  const msgBtn = page.locator('button:has-text("Message")').first();
  try {
    await msgBtn.waitFor({ state: 'visible', timeout: 12000 });
  } catch {
    return 'no-button';
  }
  await msgBtn.click();
  await sleep(rand(2000, 3500));
  return 'ok';
}

async function sendText(page, text) {
  const input = page.locator('div[contenteditable="true"]').last();
  await input.waitFor({ state: 'visible', timeout: 12000 });
  await input.click();
  await sleep(500);
  await input.pressSequentially(text, { delay: rand(30, 90) });
  await sleep(rand(500, 1200));
  await page.keyboard.press('Enter');
  await sleep(rand(1500, 2500));
}

// Best-effort: ambil caption kartu video terbaru di chat untuk bahan reaksi.
// Rapuh terhadap perubahan DOM TikTok; kegagalan di sini tidak menggagalkan run.
async function newestSharedVideoCaption(page) {
  try {
    const cards = page.locator('a[href*="/video/"], a[href*="/photo/"]');
    const n = await cards.count();
    if (n === 0) return null;
    const last = cards.nth(n - 1);
    const text = (await last.innerText().catch(() => '')).trim();
    return text.slice(0, 200) || null;
  } catch {
    return null;
  }
}

async function main() {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: !OPT.headed,
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = browser.pages()[0] || (await browser.newPage());

  if (OPT.login) {
    log('Mode login: silakan login manual di jendela browser yang terbuka.');
    await page.goto('https://www.tiktok.com/', { waitUntil: 'domcontentloaded' });
    for (let i = 0; i < 60; i++) {
      await sleep(5000);
      if ((await loginState(page)) === 'ok') {
        log('Login terdeteksi. Sesi tersimpan di .profile/, browser boleh ditutup.');
        break;
      }
    }
    await browser.close();
    return;
  }

  const st = await loginState(page);
  if (st !== 'ok') {
    log(
      st === 'captcha'
        ? 'GAGAL: CAPTCHA muncul. Jalankan dengan --headed dan selesaikan manual.'
        : 'GAGAL: belum login. Jalankan dulu: node bot.js --login'
    );
    await browser.close();
    process.exit(1);
  }
  log('Login OK.');

  const results = [];
  for (const t of TARGETS) {
    try {
      log(`Buka chat @${t.username} ...`);
      const opened = await openChat(page, t.username);
      if (opened !== 'ok') {
        results.push([t.username, 'gagal buka chat: ' + opened]);
        continue;
      }

      let text;
      try {
        text = await generateMessage(t.label);
      } catch (e) {
        log(`LLM gagal (${e.message}), pakai template fallback.`);
        text = pick(FALLBACK_MESSAGES);
      }
      log(`Pesan untuk @${t.username}: ${text}`);

      if (!OPT.dryRun) {
        await sendText(page, text);
        log(`Terkirim ke @${t.username}.`);
      } else {
        log('[dry-run] tidak dikirim.');
      }
      results.push([t.username, 'ok']);

      if (t.react && !OPT.noReact && !OPT.dryRun) {
        try {
          const caption = await newestSharedVideoCaption(page);
          if (caption) {
            const reaction = await generateReaction(caption);
            log(`Reaksi video: ${reaction}`);
            await sendText(page, reaction);
            log('Reaksi video terkirim.');
          } else {
            log('Tidak ada kartu video terbaca, reaksi dilewati.');
          }
        } catch (e) {
          log(`Reaksi video gagal (non-fatal): ${e.message}`);
        }
      }

      await sleep(rand(4000, 9000)); // jeda antar chat biar kelihatan manusiawi
    } catch (e) {
      results.push([t.username, 'error: ' + e.message]);
      log(`Error @${t.username}: ${e.message}`);
    }
  }

  await browser.close();
  log('Selesai. Ringkasan: ' + JSON.stringify(results));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
