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

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

const BLOG = (opt('blog', process.env.TISTORY_BLOG || 'https://rirume.tistory.com')).replace(/\/$/, '');
const WRITE_URL = BLOG + '/manage/newpost/?type=post&returnURL=%2Fmanage%2Fposts%2F';
const PROFILE = path.join(__dirname, '.profile');     // 카카오 로그인 상태 (git 제외)
const STATE_DIR = process.env.BCS_STATE_DIR || __dirname;  // 시험할 때만 다른 폴더로 바꿉니다.
const SESSION_FILE = path.join(STATE_DIR, '.session.json'); // 서버 로그인 세션 (git 제외)
const LEDGER_FILE = path.join(STATE_DIR, '.ledger.json');   // 이미 올린 글 기록 (중복 업로드 방지)
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

async function fillEditor(page, post) {
  // 로드 직후 "이어서 작성하시겠습니까?" 확인창이 뜰 수 있어요. 취소하면 편집기가 초기화되므로 지나간 뒤에 입력합니다.
  await page.waitForTimeout(3500);
  await page.locator('#post-title-inp').fill(post.title || '');

  const tagInput = page.locator('#tagText');
  for (const t of String(post.tags || '').split(/[,\n]/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean)) {
    await tagInput.fill(t);
    await tagInput.press('Enter');
  }

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
  }, post.content || '');
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
      resolve({ status: r.status(), textLen: String(body.content || '').replace(/<[^>]*>/g, '').trim().length, overwrote: /\/\d+$/.test(r.url()) });
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
  return { ok: serverOk && grew, before, after, via };
}

async function publishPublic(page) {
  await page.locator('#publish-layer-btn').click();
  await page.locator('#open20').check({ timeout: 8000 }); // 공개
  const label = (await page.locator('#publish-btn').innerText()).trim();
  if (flag('dry-run')) return { ok: label.includes('공개'), dry: true, label }; // 모의 실행: 발행 버튼은 누르지 않습니다.
  await page.locator('#publish-btn').click();
  await page.waitForURL((u) => !u.pathname.includes('/manage/newpost'), { timeout: 30000 }).catch(() => {});
  return { ok: !page.url().includes('/manage/newpost'), url: page.url() };
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

  if (flag('test-draft')) {
    const stamp = new Date().toLocaleString('ko-KR');
    const post = {
      title: '[자동화 테스트] 임시저장 확인 ' + stamp,
      content: '<h2>자동화 테스트</h2><p>이 글은 자동화 점검용 임시저장 글이에요. 공개되지 않으니 확인 후 삭제해도 됩니다.</p><ul><li>제목</li><li>본문(HTML)</li><li>태그</li></ul>',
      tags: '자동화테스트, 임시저장',
    };
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
