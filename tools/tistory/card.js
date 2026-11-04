/* =========================================================
   card.js — 글 제목으로 대표 이미지 카드(PNG)를 만듭니다. (무료, 외부 서비스 없음)
   HTML/CSS로 그린 뒤 브라우저로 캡처하므로 저작권 문제가 없는 오리지널 이미지예요.
   ========================================================= */

const THEMES = [
  { bg1: '#1f3a5f', bg2: '#3b6ea5', accent: '#ffd166', ink: '#ffffff' }, // 바다
  { bg1: '#7a2e3b', bg2: '#c8553d', accent: '#ffe8a3', ink: '#ffffff' }, // 노을
  { bg1: '#1d4d3f', bg2: '#4a9c7a', accent: '#f4e285', ink: '#ffffff' }, // 숲
  { bg1: '#4a3a7a', bg2: '#8a6fd1', accent: '#ffd6e0', ink: '#ffffff' }, // 보라
  { bg1: '#2b2d42', bg2: '#5c6784', accent: '#ef8354', ink: '#ffffff' }, // 밤
  { bg1: '#b5651d', bg2: '#e0a458', accent: '#fff4d6', ink: '#2b1d0e' }, // 사막
];

function hash(s) { let h = 0; for (const ch of String(s || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function pickTheme(title) { return THEMES[hash(title) % THEMES.length]; }

// 제목 길이에 맞춰 글자 크기를 정합니다.
function titleSize(title) {
  const n = [...String(title || '')].length;
  return n <= 14 ? 92 : n <= 24 ? 76 : n <= 36 ? 62 : 52;
}

// 제목 앞의 "[말머리]"는 카드에서 빼고, 태그는 아래 줄에 보여 줍니다.
function cleanTitle(t) { return String(t || '').replace(/^\s*\[[^\]]*\]\s*/, '').trim(); }

function cardHtml({ title, tags, blogName }) {
  const th = pickTheme(title);
  const t = cleanTitle(title);
  const chips = String(tags || '').split(/[,\n]/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean).slice(0, 3);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{font-family:"Malgun Gothic","Noto Sans KR","Apple SD Gothic Neo",sans-serif;background:linear-gradient(135deg,${th.bg1},${th.bg2});color:${th.ink};position:relative}
  .c1{position:absolute;right:-140px;top:-140px;width:520px;height:520px;border-radius:50%;background:${th.accent};opacity:.16}
  .c2{position:absolute;right:120px;bottom:-190px;width:380px;height:380px;border-radius:50%;background:#fff;opacity:.08}
  .bar{position:absolute;left:72px;top:84px;width:84px;height:10px;border-radius:5px;background:${th.accent}}
  .label{position:absolute;left:72px;top:112px;font-size:26px;letter-spacing:6px;font-weight:700;color:${th.accent}}
  .title{position:absolute;left:72px;right:96px;top:176px;font-size:${titleSize(t)}px;line-height:1.28;font-weight:800;word-break:keep-all;overflow-wrap:break-word;text-shadow:0 3px 14px rgba(0,0,0,.25);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
  .chips{position:absolute;left:72px;bottom:64px;display:flex;gap:14px}
  .chip{font-size:26px;padding:10px 22px;border-radius:999px;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);font-weight:600}
  .plane{position:absolute;right:84px;bottom:58px;width:96px;height:96px;opacity:.9}
  </style></head><body>
  <div class="c1"></div><div class="c2"></div><div class="bar"></div>
  <div class="label">${esc(blogName || 'TRAVEL')}</div>
  <div class="title">${esc(t)}</div>
  <div class="chips">${chips.map((c) => '<span class="chip">#' + esc(c) + '</span>').join('')}</div>
  <svg class="plane" viewBox="0 0 24 24" fill="${th.accent}"><path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>
  </body></html>`;
}

// 열려 있는 브라우저 컨텍스트에서 카드를 그려 PNG Buffer로 돌려줍니다.
async function renderCard(ctx, spec) {
  const page = await ctx.newPage();
  try {
    await page.setViewportSize({ width: 1200, height: 630 });
    await page.setContent(cardHtml(spec), { waitUntil: 'load' });
    await page.waitForTimeout(200);
    return await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  } finally {
    await page.close().catch(() => {});
  }
}

module.exports = { cardHtml, renderCard, pickTheme, titleSize, cleanTitle };
