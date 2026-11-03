/* =========================================================
   lib.js — 자동 발행 파이프라인의 순수 로직 (브라우저/네트워크 없이 시험 가능)
   ========================================================= */
const fs = require('fs');
const path = require('path');

// ---------- 설정 (tools/tistory/config.json, git 제외) ----------
const DEFAULT_CONFIG = {
  publishMode: 'draft',     // 'draft'(임시저장) | 'public'(공개 발행). 공개는 --approve-public 으로만 켭니다.
  approvedAt: null,
  maxAttempts: 3,           // 글 하나당 최대 시도 횟수 (실패하면 다음 실행에서 다시 시도)
  dupThreshold: 0.55,       // 제목 유사도가 이 값 이상이면 중복 주제로 봅니다.
  dupWindowDays: 90,        // 이 기간 안에 발행한 글과 비교합니다.
  leadWithMeta: true,       // 검색설명을 본문 맨 앞 요약 문단으로도 넣습니다. (티스토리에는 검색설명 입력칸이 없어요)
  staleMinutes: 15,         // 이 시간 넘게 'publishing'이면 중단된 것으로 봅니다.
};

function loadConfig(file) {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) { return { ...DEFAULT_CONFIG }; }
}
function saveConfig(file, cfg) { fs.writeFileSync(file, JSON.stringify(cfg, null, 2)); }

// ---------- 제목 비교 ----------
function normalize(s) {
  return String(s || '').toLowerCase().replace(/\[[^\]]*\]/g, ' ').replace(/[^0-9a-z가-힣]+/g, '');
}
function bigrams(s) {
  const n = normalize(s); const set = new Set();
  for (let i = 0; i < n.length - 1; i++) set.add(n.slice(i, i + 2));
  return set;
}
// 글자 2-gram 자카드 유사도 (0~1)
function similarity(a, b) {
  const A = bigrams(a); const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0; A.forEach((x) => { if (B.has(x)) inter++; });
  return inter / (A.size + B.size - inter);
}
// recent: [{title, topic?, url?}]  → 가장 비슷한 항목과 판정 결과
function findDuplicate(candidate, recent, threshold) {
  let best = null;
  for (const r of recent) {
    const exactTitle = normalize(r.title) && normalize(r.title) === normalize(candidate.title);
    const sameTopic = candidate.topic && r.topic && normalize(candidate.topic) === normalize(r.topic);
    const score = Math.max(similarity(candidate.title, r.title), candidate.topic && r.topic ? similarity(candidate.topic, r.topic) : 0);
    const dup = exactTitle || sameTopic || score >= threshold;
    if (dup && (!best || score > best.score || exactTitle)) best = { item: r, score: exactTitle || sameTopic ? 1 : score, exactTitle: !!exactTitle };
  }
  return best;
}

// ---------- RSS ----------
function decodeXml(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').trim();
}
function parseRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g; let m;
  while ((m = re.exec(String(xml || '')))) {
    const pick = (tag) => { const t = m[1].match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>')); return t ? decodeXml(t[1]) : ''; };
    items.push({ title: pick('title'), url: pick('link'), date: pick('pubDate') });
  }
  return items;
}

// ---------- 본문 준비 ----------
function escapeHtml(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
// 티스토리에는 검색설명 입력칸이 없고 본문 앞부분에서 자동으로 뽑아 가므로, 맨 앞에 요약 문단을 둡니다.
function prepareContent(post, cfg) {
  const meta = String(post.meta_description || '').trim();
  const html = String(post.content || '');
  if (!cfg.leadWithMeta || !meta) return html;
  const plain = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ');
  if (plain.slice(0, meta.length + 20).includes(meta.slice(0, 30))) return html; // 이미 앞부분에 있으면 중복해서 넣지 않음
  return '<p>' + escapeHtml(meta) + '</p>\n' + html;
}

// ---------- 시간 ----------
const minutesSince = (iso) => (Date.now() - Date.parse(iso)) / 60000;

module.exports = { DEFAULT_CONFIG, loadConfig, saveConfig, normalize, similarity, findDuplicate, parseRss, prepareContent, escapeHtml, minutesSince };
