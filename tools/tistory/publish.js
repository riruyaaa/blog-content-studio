/* =========================================================
   publish.js — 완성된 글을 티스토리 글쓰기 화면에 채워 넣습니다.
   이 PC에서만 실행합니다. (티스토리 공식 글쓰기 API가 종료되어 브라우저 자동화를 씁니다.)

   사용법 (tools/tistory 폴더에서)
     npm install
     set SYNC_PASSWORD=잠금비밀번호         (PowerShell: $env:SYNC_PASSWORD='...')
     node publish.js --list                 서버의 글 목록 보기
     node publish.js --id post_xxx          글을 채우고 발행 직전에 멈춤(직접 확인 후 발행)
     node publish.js --id post_xxx --publish   발행 버튼까지 누름

   옵션: --blog https://이름.tistory.com   --chrome (설치된 Chrome 사용)
   ========================================================= */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };

const BLOG = (opt('blog', process.env.TISTORY_BLOG || 'https://rirume.tistory.com')).replace(/\/$/, '');
const PROFILE = path.join(__dirname, '.profile'); // 카카오 로그인 상태가 저장되는 로컬 폴더 (git 제외)

// ---- Supabase에서 글 읽기 (sync.js와 같은 접속 정보를 사용) ----
function syncConfig() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'sync.js'), 'utf8');
  const pick = (k) => (src.match(new RegExp("const " + k + " = '([^']*)'")) || [])[1];
  return { url: pick('SUPABASE_URL'), key: pick('SUPABASE_ANON_KEY'), email: pick('SYNC_EMAIL') };
}

async function loadPosts() {
  const pw = process.env.SYNC_PASSWORD;
  if (!pw) throw new Error('SYNC_PASSWORD 환경변수에 잠금 비밀번호를 넣어 주세요.');
  const c = syncConfig();
  const auth = await fetch(c.url + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: c.email, password: pw }),
  });
  if (!auth.ok) throw new Error('서버 로그인 실패 (' + auth.status + ') — 비밀번호를 확인하세요.');
  const { access_token } = await auth.json();
  const res = await fetch(c.url + '/rest/v1/app_state?select=data&limit=1', { headers: { apikey: c.key, Authorization: 'Bearer ' + access_token } });
  if (!res.ok) throw new Error('글 불러오기 실패 (' + res.status + ')');
  const rows = await res.json();
  if (!rows.length) throw new Error('서버에 저장된 글이 없어요. 사이트에서 먼저 접속해 동기화해 주세요.');
  return rows[0].data.posts || [];
}

function tagsOf(post) {
  return String(post.tags || '').split(/[,\n]/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean);
}

async function fillEditor(page, post) {
  await page.goto(BLOG + '/manage/newpost/?type=post&returnURL=%2Fmanage%2Fposts%2F', { waitUntil: 'domcontentloaded' });

  // 로그인이 안 되어 있으면 로그인 페이지로 이동합니다 — 사용자가 직접 로그인할 때까지 기다립니다.
  const title = page.locator('#post-title-inp');
  if (!(await title.isVisible({ timeout: 8000 }).catch(() => false))) {
    console.log('티스토리(카카오) 로그인이 필요해요. 열린 창에서 직접 로그인해 주세요. (최대 5분 대기)');
    await title.waitFor({ state: 'visible', timeout: 300000 }).catch(async () => {
      await page.goto(BLOG + '/manage/newpost/?type=post&returnURL=%2Fmanage%2Fposts%2F', { waitUntil: 'domcontentloaded' });
      await title.waitFor({ state: 'visible', timeout: 60000 });
    });
  }

  // "이어서 작성하시겠습니까?" 같은 임시저장 안내가 뜨면 취소(새 글로 시작)합니다.
  page.on('dialog', (d) => d.dismiss().catch(() => {}));

  await title.fill(post.title || '');

  // HTML 모드로 전환
  await page.locator('#editor-mode-layer-btn-open').click();
  await page.locator('#editor-mode-html').click();
  await page.waitForTimeout(800);

  // CodeMirror에 본문 HTML을 넣습니다.
  const ok = await page.evaluate((html) => {
    const el = document.querySelector('.CodeMirror');
    if (!el || !el.CodeMirror) return false;
    el.CodeMirror.setValue(html);
    return true;
  }, post.content || '');
  if (!ok) throw new Error('HTML 편집기(CodeMirror)를 찾지 못했어요. 티스토리 화면이 바뀌었을 수 있어요.');

  // 태그
  const tagInput = page.locator('#tagText');
  for (const t of tagsOf(post)) {
    await tagInput.fill(t);
    await tagInput.press('Enter');
  }
  console.log('제목·본문·태그를 채웠어요. (태그 ' + tagsOf(post).length + '개)');
}

async function publish(page) {
  await page.locator('#publish-layer-btn').click();
  await page.locator('#open20').check().catch(() => {}); // 공개
  await page.locator('#publish-btn').click();
  await page.waitForTimeout(3000);
  console.log('발행 버튼을 눌렀어요. 현재 주소:', page.url());
}

(async () => {
  const posts = await loadPosts();

  if (flag('list')) {
    posts.forEach((p) => console.log([p.id, p.status, p.platform || '-', (p.title || '(제목 없음)')].join('  |  ')));
    return;
  }

  const id = opt('id');
  const post = posts.find((p) => p.id === id);
  if (!post) throw new Error('--id 로 글을 지정해 주세요. (node publish.js --list 로 목록 확인)');
  if (!post.content) throw new Error('본문이 비어 있는 글이에요.');

  const launch = { headless: false, viewport: null };
  if (flag('chrome')) launch.channel = 'chrome';
  else if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
  const ctx = await chromium.launchPersistentContext(PROFILE, launch);
  const page = ctx.pages()[0] || (await ctx.newPage());

  await fillEditor(page, post);
  if (flag('publish')) await publish(page);
  else console.log('발행 직전이에요. 브라우저에서 내용을 확인하고 직접 발행해 주세요. 끝나면 창을 닫으세요.');

  await new Promise((r) => ctx.on('close', r));
})().catch((e) => { console.error('오류:', e.message); process.exit(1); });
