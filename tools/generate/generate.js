/* =========================================================
   generate.js — [대체안] Claude가 새로 쓴 글을 수신함에 넣습니다.
   ※ ChatGPT가 쓴 원문을 그대로 전달하는 경로(tools/gmail)와는 별개입니다.
      이 글은 수신함에 source = 'claude' 로 기록되어 구분됩니다.

   이 PC의 Claude Code(로그인된 구독)를 헤드리스로 호출하므로 별도 유료 API 키가 필요 없어요.
   (구독 사용량은 소모됩니다.)

   사용 (tools/generate 폴더에서)
     node generate.js                 지금 시각 기준 슬롯(오전/오후) 글 1개 생성 → 수신함
     node generate.js --slot pm       슬롯 지정
     node generate.js --dry           수신함에 넣지 않고 결과만 출력
     node generate.js --hint "다낭"    주제 힌트
   ========================================================= */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const S = require('../tistory/server');
const L = require('../tistory/lib');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const log = (...a) => console.log(new Date().toLocaleString('ko-KR'), ...a);

const BLOG = process.env.TISTORY_BLOG || 'https://rirume.tistory.com';
const BRIEF = fs.readFileSync(path.join(__dirname, 'brief.md'), 'utf8');
const MAX_TRIES = 3;

const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
// 슬롯(am/pm)은 실행 시각으로 정하되, 12시 이후에 켜진 날 오전 글이 비어 있으면 오전 슬롯부터 채웁니다. (놓친 실행 따라잡기)
let slot = opt('slot');
let externalId = '';
async function resolveSlot() {
  if (!slot) {
    slot = new Date().getHours() < 12 ? 'am' : 'pm';
    if (slot === 'pm' && !flag('dry')) {
      try {
        const am = await S.sbGet('inbox_posts?select=id&source=eq.claude&external_id=eq.claude-' + today() + '-am');
        if (!am.length) slot = 'am';
      } catch (e) { /* 확인 실패 시 pm 유지 */ }
    }
  }
  externalId = 'claude-' + today() + '-' + slot;
}

function claudeBin() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;
  const p = path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
  return fs.existsSync(p) ? p : 'claude';
}

// ---------- 최근 글 (주제 겹침 방지) ----------
async function recentTitles() {
  const out = [];
  try {
    const res = await fetch(BLOG + '/rss', { headers: { 'User-Agent': 'blog-content-studio/1.0' } });
    if (res.ok) L.parseRss(await res.text()).forEach((x) => out.push({ title: x.title }));
  } catch (e) { /* RSS를 못 읽어도 계속 */ }
  try {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const rows = await S.sbGet('inbox_posts?select=title,topic&status=in.(pending,publishing,published,skipped_duplicate)&created_at=gte.' + since + '&limit=300');
    rows.forEach((r) => out.push({ title: r.title, topic: r.topic }));
  } catch (e) { log('수신함 이력을 읽지 못했어요(RSS만 사용):', e.message); }
  return out;
}

// ---------- 프롬프트 ----------
function buildPrompt(recent, feedback) {
  const recentList = recent.slice(0, 40).map((r) => '- ' + r.title).join('\n') || '(아직 없음)';
  return `너는 아래 지침에 따라 티스토리 블로그 글 1편을 쓰는 작가야.

# 지침
${BRIEF}

# 이번 글
- 날짜: ${today()}
- 슬롯: ${slot === 'am' ? '오전 글(am)' : '오후 글(pm)'}
${opt('hint') ? '- 주제 힌트: ' + opt('hint') + '\n' : ''}
# 최근 발행/대기 중인 글 (아래와 같은 주제·도시·각도는 피해)
${recentList}
${feedback ? '\n# 직전 시도의 문제 (반드시 고칠 것)\n' + feedback + '\n' : ''}
# 출력 형식 (이 형식 그대로, 다른 설명·코드펜스 없이)
===TITLE===
(글 제목, 검색에 잘 걸리게 20~45자)
===TOPIC===
(이 글의 핵심 주제를 한 줄로. 예: 제주 동부 2박3일 코스)
===TAGS===
(쉼표로 구분한 태그 6~8개, # 없이)
===META===
(검색설명 80~150자)
===CONTENT_HTML===
(본문 HTML 조각. h2/h3/p/ul/ol/li/strong/table(thead,tbody,tr,th,td)만 사용. h1·html·head·body·script·style·이미지 태그 금지.
 소제목(h2) 4개 이상, 표(table) 최소 1개, 자주 묻는 질문(FAQ) 3개 이상, "참고/출처" 항목, 마지막에 CTA 문단.
 공백 제외 본문 3,000자 이상. 2,500자 미만이면 다시 써야 하니 충분히 길게)
===END===`;
}

function callClaude(prompt) {
  const r = spawnSync(claudeBin(), ['-p', '--output-format', 'json'], { input: prompt, encoding: 'utf8', timeout: 900000, maxBuffer: 50 * 1024 * 1024 });
  if (r.error) throw new Error('Claude 실행 실패: ' + r.error.message);
  if (r.status !== 0) throw new Error('Claude 종료 코드 ' + r.status + ': ' + String(r.stderr || r.stdout).slice(0, 300));
  let j; try { j = JSON.parse(r.stdout); } catch (e) { throw new Error('Claude 출력을 해석하지 못했어요: ' + String(r.stdout).slice(0, 200)); }
  if (j.is_error) throw new Error('Claude 오류: ' + String(j.result).slice(0, 300));
  return String(j.result || '');
}

// ---------- 해석과 검증 ----------
function parseArticle(text) {
  const grab = (a, b) => { const i = text.indexOf(a); if (i < 0) return ''; const j = text.indexOf(b, i + a.length); return text.slice(i + a.length, j < 0 ? undefined : j).trim(); };
  return {
    title: grab('===TITLE===', '===TOPIC==='), topic: grab('===TOPIC===', '===TAGS==='),
    tags: grab('===TAGS===', '===META===').replace(/#/g, ''), meta: grab('===META===', '===CONTENT_HTML==='),
    content: grab('===CONTENT_HTML===', '===END==='),
  };
}
function sanitize(html) {
  return html.replace(/<\/?(script|style|iframe|html|head|body)[^>]*>/gi, '').replace(/^```(?:html)?\s*|\s*```$/g, '').trim();
}
function validate(a) {
  const p = [];
  const plain = a.content.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
  if (a.title.length < 10 || a.title.length > 70) p.push('제목 길이가 ' + a.title.length + '자예요 (20~45자 권장)');
  if (!a.topic) p.push('TOPIC이 비었어요');
  if (a.tags.split(',').filter((t) => t.trim()).length < 5) p.push('태그가 5개 미만이에요');
  if (a.meta.length < 50 || a.meta.length > 170) p.push('검색설명이 ' + a.meta.length + '자예요 (80~150자)');
  if ((a.content.match(/<h2[\s>]/gi) || []).length < 4) p.push('h2 소제목이 4개 미만이에요');
  if (!/<table[\s>]/i.test(a.content)) p.push('표(table)가 없어요');
  if (!/자주\s*묻는|FAQ/i.test(a.content)) p.push('FAQ가 없어요');
  if (/<h1[\s>]/i.test(a.content)) p.push('h1을 쓰면 안 돼요');
  if (plain.length < 2500) p.push('본문이 공백 제외 ' + plain.length + '자예요 (2,500자 이상)');
  return p;
}

(async () => {
  await resolveSlot();
  if (!flag('dry')) {
    const existing = await S.sbGet('inbox_posts?select=id,status&source=eq.claude&external_id=eq.' + externalId);
    if (existing.length) { log('이 슬롯(' + externalId + ')의 글이 이미 있어서 만들지 않아요.'); return; }
  }
  const recent = await recentTitles();
  log('최근 글 ' + recent.length + '개를 확인했어요. 슬롯:', externalId);

  let feedback = '';
  for (let i = 1; i <= MAX_TRIES; i++) {
    log('Claude로 글을 생성해요 (' + i + '/' + MAX_TRIES + ') ...');
    const a = parseArticle(callClaude(buildPrompt(recent, feedback)));
    a.content = sanitize(a.content);
    const problems = validate(a);
    const dup = L.findDuplicate({ title: a.title, topic: a.topic }, recent, 0.55);
    if (dup) problems.push('최근 글 "' + dup.item.title + '"과 주제가 겹쳐요 (유사도 ' + dup.score.toFixed(2) + ')');
    if (problems.length) { log('검증 실패:', problems.join(' / ')); feedback = problems.map((x) => '- ' + x).join('\n'); continue; }

    if (flag('dry')) { console.log(JSON.stringify({ ...a, contentChars: a.content.replace(/<[^>]*>/g, '').replace(/\s+/g, '').length }, null, 2)); return; }
    const r = await S.ingest({ p_title: a.title, p_content: a.content, p_tags: a.tags, p_meta_description: a.meta, p_source: 'claude', p_topic: a.topic, p_external_id: externalId });
    log(r.duplicate ? '이미 같은 슬롯의 글이 있어요(중복 전송 안 함).' : '수신함에 넣었어요: ' + a.title + ' (출처: claude, id ' + r.id + ')');
    return;
  }
  throw new Error('검증을 통과하는 글을 만들지 못했어요: ' + feedback.replace(/\n/g, ' '));
})().catch((e) => { console.error('오류:', e.message); process.exit(1); });
