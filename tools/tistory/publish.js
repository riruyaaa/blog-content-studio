/* =========================================================
   publish.js — 콘텐츠 스튜디오의 글을 티스토리에 올립니다. (이 PC에서만 실행)
   티스토리 공식 글쓰기 API가 종료되어 브라우저 자동화를 씁니다.

   처음 한 번
     npm install
     node publish.js --setup          카카오 로그인 창을 열어 줍니다. 직접 로그인하세요.
     (PowerShell) $env:SYNC_PASSWORD='잠금비밀번호'; node publish.js --login
                                      서버 로그인 세션을 저장합니다. (비밀번호 자체는 저장하지 않습니다)

   사용
     node publish.js --list                    서버의 글 목록
     node publish.js --test-draft              테스트 글 1개를 티스토리에 "임시저장"만 합니다.
     node publish.js --id post_xxx             글에 지정된 방식(임시저장/공개)으로 올립니다.
     node publish.js --id post_xxx --draft     방식을 임시저장으로 강제
     node publish.js --id post_xxx --public    방식을 공개 발행으로 강제
     node publish.js --next                    예약 대기열(queued)에서 가장 오래된 글 1개를 올립니다.
     node publish.js --check                   로그인 상태만 확인합니다.
   옵션: --headless (창 없이)  --blog https://이름.tistory.com
   ========================================================= */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const L = require('./lib');
const os = require('os');
const CARD = require('./card');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

const BLOG = (opt('blog', process.env.TISTORY_BLOG || 'https://rirume.tistory.com')).replace(/\/$/, '');
const WRITE_URL = BLOG + '/manage/newpost/?type=post&returnURL=%2Fmanage%2Fposts%2F';
const PROFILE = path.join(__dirname, '.profile');     // 카카오 로그인 상태 (git 제외)
const STATE_DIR = process.env.BCS_STATE_DIR || __dirname;  // 시험할 때만 다른 폴더로 바꿉니다.
const SESSION_FILE = path.join(STATE_DIR, '.session.json'); // 서버 로그인 세션 (git 제외)
const LEDGER_FILE = path.join(STATE_DIR, '.ledger.json');   // 이미 올린 글 기록 (중복 업로드 방지)
const CONFIG_FILE = path.join(STATE_DIR, 'config.json');    // 발행 방식 등 설정 (기본: 임시저장). git 제외
const LOG_DIR = path.join(STATE_DIR, 'logs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const COOKIE_FILE = path.join(__dirname, '.cookies.json');  // 티스토리 로그인 쿠키 (로그인 정보와 같으니 공유 금지, git 제외)

const log = (...a) => console.log(new Date().toLocaleString('ko-KR'), ...a);

// ---------------- 서버(Supabase) ----------------
function syncConfig() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'sync.js'), 'utf8');
  const pick = (k) => (src.match(new RegExp('const ' + k + " = '([^']*)'")) || [])[1];
  return { url: pick('SUPABASE_URL'), key: pick('SUPABASE_ANON_KEY'), email: pick('SYNC_EMAIL') };
}
const C = syncConfig();
if (process.env.SB_URL) C.url = process.env.SB_URL; // 시험용: 가짜 서버 주소로 바꿔 끼울 때만 사용

async function authRequest(grant, body) {
  const res = await fetch(C.url + '/auth/v1/token?grant_type=' + grant, {
    method: 'POST', headers: { apikey: C.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('서버 로그인 실패 (' + res.status + ')');
  const j = await res.json();
  return { access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + (j.expires_in || 3600) * 1000 - 60000, userId: j.user && j.user.id };
}

async function serverSession() {
  const pw = process.env.SYNC_PASSWORD;
  if (pw) {
    const s = await authRequest('password', { email: C.email, password: pw });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(s));
    return s;
  }
  if (!fs.existsSync(SESSION_FILE)) throw new Error('서버 로그인 세션이 없어요. SYNC_PASSWORD를 설정하고 --login 을 한 번 실행해 주세요.');
  let s = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  if (Date.now() >= s.expiresAt) {
    s = await authRequest('refresh_token', { refresh_token: s.refresh });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(s));
  }
  return s;
}

async function loadState() {
  const s = await serverSession();
  const res = await fetch(C.url + '/rest/v1/app_state?select=data,updated_at&limit=1', { headers: { apikey: C.key, Authorization: 'Bearer ' + s.access } });
  if (!res.ok) throw new Error('글 불러오기 실패 (' + res.status + ')');
  const rows = await res.json();
  if (!rows.length) throw new Error('서버에 저장된 글이 없어요. 사이트에서 먼저 접속해 동기화해 주세요.');
  return { session: s, data: rows[0].data };
}

// 올린 결과를 서버의 글에도 기록합니다. (실패해도 업로드 자체에는 영향 없음)
async function writeBack(postId, patch) {
  try {
    const { session, data } = await loadState();
    const post = (data.posts || []).find((p) => p.id === postId);
    if (!post) return;
    Object.assign(post, patch, { updatedAt: Date.now() });
    const res = await fetch(C.url + '/rest/v1/app_state', {
      method: 'POST',
      headers: { apikey: C.key, Authorization: 'Bearer ' + session.access, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: session.userId, data, updated_at: new Date().toISOString() }),
    });
    if (!res.ok) log('서버에 결과를 기록하지 못했어요 (' + res.status + ')');
  } catch (e) { log('서버에 결과를 기록하지 못했어요:', e.message); }
}

// ---------------- 수신함(inbox_posts) = 자동 발행 대기열 ----------------
async function sb(method, query, body) {
  const s = await serverSession();
  const res = await fetch(C.url + '/rest/v1/' + query, {
    method,
    headers: { apikey: C.key, Authorization: 'Bearer ' + s.access, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error('서버 요청 실패 (' + method + ' ' + query.split('?')[0] + ' ' + res.status + ')');
  return method === 'GET' ? res.json() : true;
}
const patchRow = (id, patch) => sb('PATCH', 'inbox_posts?id=eq.' + id, patch);

// 발행/실패 기록: 사람이 읽는 로그는 콘솔(로그 파일로 리다이렉트), 기계가 읽는 로그는 JSONL
function logEvent(ev) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(path.join(LOG_DIR, 'publish.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...ev }) + '\n');
  } catch (e) { /* 로그 실패는 무시 */ }
}

// 블로그 RSS(공개 피드)로 최근 발행 글과 URL을 확인합니다. 공식 제공 기능이라 로그인이 필요 없어요.
async function fetchRssItems() {
  try {
    const res = await fetch(BLOG + '/rss', { headers: { 'User-Agent': 'blog-content-studio/1.0' } });
    return res.ok ? L.parseRss(await res.text()) : [];
  } catch (e) { return []; }
}
async function findPublishedUrl(title, tries) {
  for (let i = 0; i < (tries || 6); i++) {
    const hit = (await fetchRssItems()).find((x) => L.normalize(x.title) === L.normalize(title));
    if (hit) return hit.url || '';
    await sleep(5000);
  }
  return '';
}

// 최근 발행 글: RSS + 수신함에서 공개 발행된 글
async function recentHistory(cfg) {
  const since = new Date(Date.now() - cfg.dupWindowDays * 86400000).toISOString();
  const rss = await fetchRssItems();
  let rows = [];
  try { rows = await sb('GET', 'inbox_posts?select=title,topic,published_url&status=eq.published&published_at=gte.' + since + '&limit=300'); } catch (e) { log('수신함 이력을 불러오지 못했어요:', e.message); }
  return [...rss.map((x) => ({ title: x.title, url: x.url })), ...rows.map((r) => ({ title: r.title, topic: r.topic, url: r.published_url }))];
}

// 'publishing'에서 멈춘 글(실행 도중 중단)을 정리합니다. 공개 발행이었다면 RSS로 실제 발행 여부를 먼저 확인해 중복을 막아요.
async function reclaimStale(cfg) {
  const rows = await sb('GET', 'inbox_posts?select=id,title,attempts,last_error&status=eq.publishing');
  for (const r of rows) {
    const marker = String(r.last_error || '').replace('publishing@', '');
    if (Date.parse(marker) && L.minutesSince(marker) < cfg.staleMinutes) continue;
    const url = await findPublishedUrl(r.title, 1);
    if (url) { await patchRow(r.id, { status: 'published', published_url: url, published_at: new Date().toISOString(), last_error: null }); log('중단됐던 글이 실제로는 발행되어 있었어요:', r.title); logEvent({ event: 'reclaimed_published', id: r.id, title: r.title, url }); }
    else { await patchRow(r.id, { status: r.attempts >= cfg.maxAttempts ? 'failed' : 'pending', last_error: '이전 실행이 중단됨' }); log('중단됐던 글을 대기열로 되돌렸어요:', r.title); logEvent({ event: 'reclaimed_pending', id: r.id, title: r.title }); }
  }
}

async function publishRow(row, mode, cfg) {
  const attempt = row.attempts + 1;
  await patchRow(row.id, { status: 'publishing', attempts: attempt, last_error: 'publishing@' + new Date().toISOString() });
  log('발행 시도 ' + attempt + '/' + cfg.maxAttempts + ':', row.title, '(출처:', row.source + ', 방식:', mode === 'public' ? '공개 발행' : '임시저장', ')');
  try {
    const card = cfg.card !== false && !flag('no-card') ? { title: row.title, tags: row.tags, blogName: cfg.cardLabel || 'RIRUME TRAVEL' } : null;
    const r = await upload({ title: row.title, tags: row.tags, content: L.prepareContent(row, cfg), card }, mode, { interactive: false });
    if (!r.ok) throw new Error('저장 확인에 실패했어요: ' + (r.via || ''));
    // 임시저장 방식에서는 저장 요청에 표가 그대로 들어갔는지도 확인합니다. (본문 유실·변형 방지)
    const wantTables = (String(row.content).match(/<table[\s>]/gi) || []).length;
    if (mode === 'draft' && r.tables !== undefined && r.tables < wantTables) throw new Error('표가 저장되지 않았어요 (원문 ' + wantTables + '개 → 저장 ' + r.tables + '개)');
    if (mode === 'draft' && card && r.images !== undefined && r.images < 1) throw new Error('대표 이미지 카드가 저장되지 않았어요');
    if (mode === 'draft') log('저장 확인: 본문 ' + r.textLen + '자, 표 ' + r.tables + '개, 이미지 ' + r.images + '개, 태그 "' + r.tags + '"');
    const url = mode === 'public' ? await findPublishedUrl(row.title) : '';
    await patchRow(row.id, { status: mode === 'public' ? 'published' : 'drafted', published_url: url || null, published_at: new Date().toISOString(), last_error: null });
    log('성공:', row.title, mode === 'public' ? '→ ' + (url || '(URL은 RSS에 아직 안 보임)') : '→ 임시저장');
    logEvent({ event: 'success', id: row.id, title: row.title, source: row.source, mode, url, attempt });
  } catch (e) {
    // 공개 발행 도중 오류가 났어도 실제로는 올라갔을 수 있으니, 재시도 전에 RSS로 확인해 중복 발행을 막습니다.
    const landed = mode === 'public' ? await findPublishedUrl(row.title, 3) : '';
    if (landed) {
      await patchRow(row.id, { status: 'published', published_url: landed, published_at: new Date().toISOString(), last_error: null });
      log('오류가 있었지만 실제로는 발행되어 있었어요(중복 방지):', landed);
      logEvent({ event: 'success_after_error', id: row.id, title: row.title, url: landed, attempt });
      return;
    }
    const final = attempt >= cfg.maxAttempts;
    await patchRow(row.id, { status: final ? 'failed' : 'pending', last_error: String(e.message).slice(0, 500) });
    logEvent({ event: 'failure', id: row.id, title: row.title, attempt, final, error: e.message });
    throw new Error((final ? '최종 실패(더 이상 재시도하지 않아요): ' : '실패(다음 실행에서 다시 시도해요): ') + e.message);
  }
}

async function runGenerator() {
  const script = path.join(__dirname, '..', 'generate', 'generate.js');
  if (!fs.existsSync(script)) { log('생성기(tools/generate/generate.js)가 없어요.'); return; }
  log('수신함이 비어 있어 Claude로 새 글을 생성해요.');
  const r = require('child_process').spawnSync(process.execPath, [script], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) log('글 생성에 실패했어요 (종료 코드 ' + r.status + ')');
}

async function runInbox() {
  const cfg = L.loadConfig(CONFIG_FILE);
  const mode = flag('public') ? 'public' : flag('draft') ? 'draft' : cfg.publishMode;
  log('실행 모드:', mode === 'public' ? '공개 발행' + (cfg.approvedAt ? ' (승인: ' + cfg.approvedAt + ')' : '') : '임시저장 (공개 발행은 --approve-public 후에만)');
  await reclaimStale(cfg);

  const pending = () => sb('GET', 'inbox_posts?select=*&status=eq.pending&attempts=lt.' + cfg.maxAttempts + '&order=created_at.asc&limit=20');
  let rows = await pending();
  if (!rows.length && (flag('generate') || cfg.fallbackGenerate)) { await runGenerator(); rows = await pending(); }
  if (!rows.length) { log('수신함에 발행할 글이 없어요.'); logEvent({ event: 'empty' }); return false; }

  const recent = await recentHistory(cfg);
  for (const row of rows.slice(0, 5)) {
    const dup = L.findDuplicate({ title: row.title, topic: row.topic }, recent, cfg.dupThreshold);
    if (dup) {
      if (dup.exactTitle && row.attempts > 0 && dup.item.url) {
        await patchRow(row.id, { status: 'published', published_url: dup.item.url, published_at: new Date().toISOString(), last_error: null });
        log('이전 시도에서 이미 발행된 글이에요(중복 발행 안 함):', dup.item.url);
        logEvent({ event: 'already_published', id: row.id, title: row.title, url: dup.item.url });
        return true;
      }
      await patchRow(row.id, { status: 'skipped_duplicate', last_error: '중복 주제: "' + dup.item.title + '" (유사도 ' + dup.score.toFixed(2) + ')' });
      log('중복 주제라 건너뛰어요:', row.title, '≈', dup.item.title, '(' + dup.score.toFixed(2) + ')');
      logEvent({ event: 'skipped_duplicate', id: row.id, title: row.title, similarTo: dup.item.title, score: dup.score });
      continue;
    }
    await publishRow(row, mode, cfg);
    return true; // 한 번 실행에 한 개
  }
  log('중복이 아닌 글이 없어서 이번에는 발행하지 않았어요.');
  return false;
}

// 시험 글 정리: 제목이 [자동화 테스트] / [점검] 으로 시작하는 임시저장만 지웁니다.
async function cleanupTestDrafts() {
  // 기본은 [자동화 테스트]/[점검] 시험 글. --title-prefix "제목 앞부분" 으로 특정 글만 지정할 수도 있어요.
  const prefix = opt('title-prefix');
  const MINE = prefix ? new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : /^\[(자동화 테스트|점검)\]/;
  const { ctx, page } = await openBrowser();
  try {
    await ensureLoggedIn(page, { interactive: false });
    await page.waitForTimeout(3500);
    // 기본 핸들러(모든 확인창 취소)를 빼고, 삭제 확인창만 수락합니다. 그 밖의 확인창(이어쓰기 등)은 계속 취소.
    page.removeAllListeners('dialog');
    page.on('dialog', (d) => { if (/삭제/.test(d.message())) d.accept().catch(() => {}); else d.dismiss().catch(() => {}); });
    await page.locator('a.count').first().click();
    await page.waitForTimeout(1200);
    const titles = async () => (await page.locator('.info_editor a.link_info').allInnerTexts()).map((t) => t.trim());
    const before = await titles();
    let deleted = 0;
    for (let guard = 0; guard < 50; guard++) {
      const rows = page.locator('.info_editor');
      const n = await rows.count();
      let hit = -1; let t = '';
      for (let i = 0; i < n; i++) { const x = (await rows.nth(i).locator('a.link_info').innerText()).trim(); if (MINE.test(x)) { hit = i; t = x; break; } }
      if (hit < 0) break;
      await rows.nth(hit).hover();
      await rows.nth(hit).locator('button.ico_trash').click({ timeout: 5000 });
      await page.waitForTimeout(1500);
      if ((await titles()).length < n) { deleted++; log('삭제:', t); } else { log('삭제되지 않아 중단:', t); break; }
    }
    log('임시저장 ' + before.length + '개 중 시험 글 ' + deleted + '개를 삭제했어요. 남은 글: ' + (before.length - deleted) + '개');
  } finally { await ctx.close().catch(() => {}); }
}

// ---------------- 기록 파일 ----------------
const readLedger = () => { try { return JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8')); } catch (e) { return {}; } };
const writeLedger = (l) => fs.writeFileSync(LEDGER_FILE, JSON.stringify(l, null, 2));

// ---------------- 브라우저 ----------------
function findChromium() {
  if (process.env.CHROMIUM_PATH) return { executablePath: process.env.CHROMIUM_PATH };
  const root = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  if (fs.existsSync(root)) {
    const dir = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().pop();
    const exe = dir && path.join(root, dir, 'chrome-win64', 'chrome.exe');
    if (exe && fs.existsSync(exe)) return { executablePath: exe };
  }
  return { channel: 'chrome' };
}

// 티스토리 로그인 쿠키는 세션 쿠키라 브라우저를 닫으면 사라집니다. 저장해 두었다가 유효기간을 붙여 다시 넣습니다.
const isLoginDomain = (c) => /(tistory|kakao)\.com$/.test(c.domain.replace(/^\./, ''));
async function restoreCookies(ctx) {
  try {
    const saved = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
    const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
    await ctx.addCookies(saved.filter(isLoginDomain).map((c) => ({ ...c, expires: c.expires > 0 ? c.expires : exp })));
  } catch (e) { /* 저장된 쿠키가 없으면 로그인부터 */ }
}
async function saveCookies(ctx) {
  fs.writeFileSync(COOKIE_FILE, JSON.stringify((await ctx.cookies()).filter(isLoginDomain)));
}

async function openBrowser() {
  const ctx = await chromium.launchPersistentContext(PROFILE, { ...findChromium(), headless: flag('headless'), viewport: flag('headless') ? { width: 1400, height: 900 } : null });
  const page = ctx.pages()[0] || (await ctx.newPage());
  // "이어서 작성하시겠습니까?" 같은 확인창은 취소해서 항상 새 글로 시작합니다. (수락하면 기존 임시저장을 덮어쓸 수 있어요)
  page.on('dialog', (d) => { log('확인창 취소:', d.message().replace(/\s+/g, ' ').slice(0, 60)); d.dismiss().catch(() => {}); });
  await restoreCookies(ctx);
  return { ctx, page };
}

async function ensureLoggedIn(page, { interactive }) {
  await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded' });
  const title = page.locator('#post-title-inp');
  if (await title.isVisible({ timeout: 10000 }).catch(() => false)) { await saveCookies(page.context()); return; }
  if (!interactive) throw new Error('티스토리 로그인이 풀려 있어요. node publish.js --setup 으로 다시 로그인해 주세요.');
  log('티스토리(카카오) 로그인이 필요해요. 열린 창에서 직접 로그인해 주세요. (최대 5분 대기)');
  await title.waitFor({ state: 'visible', timeout: 300000 }).catch(async () => {
    await page.goto(WRITE_URL, { waitUntil: 'domcontentloaded' });
    await title.waitFor({ state: 'visible', timeout: 60000 });
  });
  await saveCookies(page.context());
}

// "임시저장 N"의 N은 a.count 요소에 따로 들어 있습니다.
const draftCount = async (page) => {
  const t = (await page.locator('a.count').first().innerText().catch(() => '')) || '';
  const m = t.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
};

// 대표 이미지 카드: 제목으로 PNG를 만들어 티스토리에 업로드하고, 편집기에 들어간 이미지 블록을 돌려줍니다.
async function attachCard(page, spec) {
  const png = await CARD.renderCard(page.context(), spec);
  const tmp = path.join(os.tmpdir(), 'bcs-card-' + Date.now() + '.png');
  fs.writeFileSync(tmp, png);
  try {
    // 첨부 버튼은 글자가 아니라 aria-label로 이름이 붙어 있어요. (HTML/마크다운 모드용 숨은 복제본이 있어 보이는 것만 선택)
    await page.locator('.mce-btn.mce-menubtn[aria-label="첨부"]:visible').first().click();
    await page.waitForTimeout(700);
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10000 }),
      page.locator('.mce-menu-item', { hasText: '사진' }).first().click(),
    ]);
    const uploaded = page.waitForResponse((r) => r.url().includes('/manage/post/attach.json'), { timeout: 30000 });
    await chooser.setFiles(tmp);
    const res = await uploaded;
    if (res.status() !== 200) throw new Error('이미지 업로드 응답 ' + res.status());
    await page.waitForFunction(() => window.tinymce.get('editor-tistory').getContent().includes('[##_Image|'), null, { timeout: 15000 });
    return await page.evaluate(() => window.tinymce.get('editor-tistory').getContent());
  } finally {
    fs.unlink(tmp, () => {});
  }
}

async function fillEditor(page, post) {
  // 로드 직후 "이어서 작성하시겠습니까?" 확인창이 뜰 수 있어요. 취소하면 편집기가 초기화되므로 지나간 뒤에 입력합니다.
  await page.waitForTimeout(3500);
  await page.locator('#post-title-inp').fill(post.title || '');

  const tagInput = page.locator('#tagText');
  for (const t of String(post.tags || '').split(/[,\n]/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean)) {
    await tagInput.fill(t);
    await tagInput.press('Enter');
  }

  // 대표 이미지 카드는 본문보다 먼저 업로드해서(편집기가 비어 있을 때) 맨 앞에 둡니다.
  let lead = '';
  if (post.card) lead = await attachCard(page, post.card);

  // 본문은 마지막에, TinyMCE 편집기에 직접 넣습니다. (HTML 모드의 CodeMirror 값은 저장 요청에 반영되지 않았어요)
  const textLen = await page.evaluate((html) => {
    const ed = window.tinymce && window.tinymce.get('editor-tistory');
    if (!ed) return -1;
    ed.setContent(html);
    // 티스토리는 편집기 입력 이벤트로 갱신된 값을 저장하므로, setContent만으로는 빈 본문이 저장됩니다.
    ed.undoManager.add();
    ed.fire('input');
    ed.fire('change');
    ed.nodeChanged();
    return ed.getContent({ format: 'text' }).trim().length;
  }, lead + (post.content || ''));
  if (textLen < 0) throw new Error('티스토리 편집기(TinyMCE)를 찾지 못했어요. 티스토리 화면이 바뀌었을 수 있어요.');
  if (textLen === 0) throw new Error('본문이 편집기에 들어가지 않았어요.');

  // 저장 직전에 제목과 본문이 그대로 남아 있는지 한 번 더 확인합니다.
  await page.waitForTimeout(800);
  const still = await page.evaluate(() => window.tinymce.get('editor-tistory').getContent({ format: 'text' }).trim().length);
  const titleNow = await page.locator('#post-title-inp').inputValue();
  if (still === 0 || !titleNow) throw new Error('입력한 내용이 사라졌어요. (본문 ' + still + '자, 제목 ' + (titleNow ? '있음' : '없음') + ')');
}

// 임시저장: (1) 서버가 본문이 든 저장 요청을 200으로 받았고 (2) "임시저장 N"의 N이 늘어났을 때만 성공으로 봅니다.
async function saveDraft(page) {
  const before = await draftCount(page);
  const saved = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 20000);
    const onResponse = (r) => {
      const q = r.request();
      if (q.method() !== 'POST' || !/^\/manage\/drafts(\/\d+)?$/.test(new URL(r.url()).pathname)) return;
      let body = {};
      try { body = JSON.parse(q.postData() || '{}'); } catch (e) { /* 무시 */ }
      page.off('response', onResponse);
      clearTimeout(timer);
      resolve({ status: r.status(), textLen: String(body.content || '').replace(/<[^>]*>/g, '').trim().length, tables: (String(body.content || '').match(/<table[\s>]/gi) || []).length, tags: body.tags || '', images: String(body.content || '').split('[##_Image|').length - 1, overwrote: /\/\d+$/.test(r.url()) });
    };
    page.on('response', onResponse);
  });
  await page.locator('a.action', { hasText: '임시저장' }).first().click();
  const req = await saved;
  if (flag('verbose')) log('저장 요청:', JSON.stringify(req));
  let after = before;
  for (let i = 0; i < 10 && after <= before; i++) { await page.waitForTimeout(500); after = await draftCount(page); }
  const serverOk = !!req && req.status === 200 && req.textLen > 0;
  const grew = after > before;
  const via = !req ? '저장 요청을 확인하지 못함' : !serverOk ? '서버 응답 ' + req.status + ', 본문 ' + req.textLen + '자' : !grew ? '서버는 받았지만 임시저장 개수가 늘지 않음(기존 글 덮어쓰기 의심)' : '서버 200 · 본문 ' + req.textLen + '자 · 개수 증가';
  return { ok: serverOk && grew, before, after, via, tables: req ? req.tables : 0, images: req ? req.images : 0, tags: req ? req.tags : '', textLen: req ? req.textLen : 0 };
}

async function publishPublic(page) {
  await page.locator('#publish-layer-btn').click();
  await page.locator('#open20').check({ timeout: 8000 }); // 공개
  const label = (await page.locator('#publish-btn').innerText()).trim();
  if (flag('dry-run')) return { ok: label.includes('공개'), dry: true, label }; // 모의 실행: 발행 버튼은 누르지 않습니다.
  await page.locator('#publish-btn').click();
  await page.waitForURL((u) => !u.pathname.includes('/manage/newpost'), { timeout: 30000 }).catch(() => {});
  const left = !page.url().includes('/manage/newpost');
  return { ok: left, via: left ? '발행 후 화면 이동 확인' : '발행 버튼을 눌렀지만 화면이 이동하지 않음', url: page.url() };
}

async function upload(post, mode, { interactive }) {
  const { ctx, page } = await openBrowser();
  try {
    await ensureLoggedIn(page, { interactive });
    await fillEditor(page, post);
    if (mode === 'public') return { mode, ...(await publishPublic(page)) };
    return { mode, ...(await saveDraft(page)) };
  } finally {
    await ctx.close().catch(() => {});
  }
}

// ---------------- 명령 ----------------
(async () => {
  if (flag('setup') || flag('check')) {
    const { ctx, page } = await openBrowser();
    try {
      await ensureLoggedIn(page, { interactive: flag('setup') });
      log('티스토리 로그인 상태: 정상 (글쓰기 화면 확인됨)');
      if (flag('setup')) await page.waitForTimeout(1500);
    } finally { await ctx.close().catch(() => {}); }
    return;
  }

  if (flag('login')) { await serverSession(); log('서버 로그인 세션을 저장했어요.'); return; }

  if (flag('approve-public')) {
    const cfg = L.loadConfig(CONFIG_FILE);
    cfg.publishMode = 'public'; cfg.approvedAt = new Date().toISOString();
    L.saveConfig(CONFIG_FILE, cfg);
    log('공개 발행을 승인했어요. 이제 --run 은 공개 발행으로 올립니다. (되돌리기: node publish.js --set-draft)');
    return;
  }
  if (flag('set-draft')) {
    const cfg = L.loadConfig(CONFIG_FILE);
    cfg.publishMode = 'draft'; cfg.approvedAt = null;
    L.saveConfig(CONFIG_FILE, cfg);
    log('임시저장 모드로 되돌렸어요.');
    return;
  }

  if (flag('status')) {
    const cfg = L.loadConfig(CONFIG_FILE);
    console.log('발행 방식:', cfg.publishMode === 'public' ? '공개 발행 (승인 ' + cfg.approvedAt + ')' : '임시저장');
    const rows = await sb('GET', 'inbox_posts?select=status,source&limit=1000');
    const by = {}; rows.forEach((r) => { const k = r.status + ' / ' + r.source; by[k] = (by[k] || 0) + 1; });
    console.log('수신함:', Object.keys(by).length ? JSON.stringify(by) : '비어 있음');
    const f = path.join(LOG_DIR, 'publish.jsonl');
    if (fs.existsSync(f)) { console.log('최근 기록:'); fs.readFileSync(f, 'utf8').trim().split('\n').slice(-5).forEach((l) => console.log('  ' + l.slice(0, 200))); }
    return;
  }

  if (flag('fallback')) {
    const cfg = L.loadConfig(CONFIG_FILE);
    cfg.fallbackGenerate = opt('fallback', 'on') !== 'off';
    L.saveConfig(CONFIG_FILE, cfg);
    log('Claude 대체 생성: ' + (cfg.fallbackGenerate ? '켬 (수신함이 비면 새 글을 생성해요)' : '끔'));
    return;
  }

  if (flag('cleanup-tests')) { await cleanupTestDrafts(); return; }

  if (flag('run')) {
    if (await runInbox()) return;
    const cfg = L.loadConfig(CONFIG_FILE);
    log('앱 예약 대기열(--next)을 확인해요.' + (cfg.publishMode === 'public' ? '' : ' (공개 발행 승인 전이라 임시저장으로 처리)'));
    try { await loadState(); } catch (e) {
      if (/저장된 글이 없어요/.test(e.message)) { log('앱 대기열: 서버에 앱 데이터가 아직 없어서 건너뛰어요. (할 일이 없는 정상 상태)'); return; }
      throw e;
    }
    argv.push('--next');
    if (cfg.publishMode !== 'public' && !flag('draft')) argv.push('--draft');
  }

  if (flag('test-draft')) {
    const stamp = new Date().toLocaleString('ko-KR');
    const post = {
      title: '[자동화 테스트] 임시저장 확인 ' + stamp,
      content: '<h2>자동화 테스트</h2><p>이 글은 자동화 점검용 임시저장 글이에요. 공개되지 않으니 확인 후 삭제해도 됩니다.</p><ul><li>제목</li><li>본문(HTML)</li><li>태그</li></ul>',
      tags: '자동화테스트, 임시저장',
    };
    if (!flag('no-card')) post.card = { title: post.title, tags: post.tags, blogName: 'RIRUME TRAVEL' };
    const r = await upload(post, 'draft', { interactive: true });
    log(r.ok ? '임시저장 성공 — 임시저장 개수 ' + r.before + ' → ' + r.after + ' (' + r.via + ')' : '임시저장 확인 실패 — 임시저장 개수 ' + r.before + ' → ' + r.after + ' (' + r.via + ')');
    process.exitCode = r.ok ? 0 : 1;
    return;
  }

  const { data } = await loadState();
  const posts = data.posts || [];

  if (flag('list')) {
    const led = readLedger();
    posts.forEach((p) => console.log([p.id, p.platform || '-', p.publishMode || '-', p.queued ? '대기' : '-', (led[p.id] && led[p.id].state) || p.publishState || '-', p.title || '(제목 없음)'].join('  |  ')));
    return;
  }

  const ledger = readLedger();
  let post;
  if (flag('next')) {
    post = posts
      .filter((p) => p.platform === 'tistory' && p.queued && p.content && !ledger[p.id] && !['drafted', 'published'].includes(p.publishState))
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))[0];
    if (!post) { log('예약 대기열이 비어 있어요. 올릴 글이 없습니다.'); return; }
  } else {
    post = posts.find((p) => p.id === opt('id'));
    if (!post) throw new Error('--id 로 글을 지정해 주세요. (node publish.js --list 로 목록 확인)');
    if (!post.content) throw new Error('본문이 비어 있는 글이에요.');
    if (ledger[post.id] && !flag('again')) throw new Error('이미 올린 글이에요(' + ledger[post.id].state + '). 다시 올리려면 --again 을 붙이세요.');
  }

  const mode = flag('public') ? 'public' : flag('draft') ? 'draft' : post.publishMode === 'public' ? 'public' : 'draft';
  log('업로드 시작:', post.title, '(방식:', mode === 'public' ? '공개 발행' : '임시저장', ')');
  try {
    const r = await upload(post, mode, { interactive: !flag('next') && !flag('headless') });
    if (r.dry) { log('모의 실행 결과: 발행 버튼 문구 "' + r.label + '" — ' + (r.ok ? '공개 발행 경로 정상 (실제로는 발행하지 않았어요)' : '공개로 바뀌지 않았어요')); process.exitCode = r.ok ? 0 : 1; return; }
    if (!r.ok) throw new Error('저장 확인에 실패했어요: ' + (r.via || ''));
    ledger[post.id] = { state: mode === 'public' ? 'published' : 'drafted', at: new Date().toISOString(), title: post.title };
    writeLedger(ledger);
    await writeBack(post.id, { publishState: ledger[post.id].state, queued: false, publishedAt: ledger[post.id].at });
    log('완료:', post.title, '→', ledger[post.id].state);
  } catch (e) {
    await writeBack(post.id, { publishState: 'failed' });
    throw e;
  }
})().catch((e) => { console.error('오류:', e.message); process.exit(1); });
