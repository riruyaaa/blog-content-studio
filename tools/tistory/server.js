/* =========================================================
   server.js — 생성기(tools/generate)가 쓰는 Supabase 접속 도우미
   publish.js와 같은 세션 파일(.session.json)을 공유합니다.
   ========================================================= */
const fs = require('fs');
const path = require('path');

const STATE_DIR = process.env.BCS_STATE_DIR || __dirname;
const SESSION_FILE = path.join(STATE_DIR, '.session.json');

function config() {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'sync.js'), 'utf8');
  const pick = (k) => (src.match(new RegExp('const ' + k + " = '([^']*)'")) || [])[1];
  const c = { url: pick('SUPABASE_URL'), key: pick('SUPABASE_ANON_KEY'), email: pick('SYNC_EMAIL') };
  if (process.env.SB_URL) c.url = process.env.SB_URL; // 시험용
  return c;
}

async function authRequest(c, grant, body) {
  const res = await fetch(c.url + '/auth/v1/token?grant_type=' + grant, { method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('서버 로그인 실패 (' + res.status + ')');
  const j = await res.json();
  return { access: j.access_token, refresh: j.refresh_token, expiresAt: Date.now() + (j.expires_in || 3600) * 1000 - 60000, userId: j.user && j.user.id };
}

async function session() {
  const c = config();
  if (process.env.SYNC_PASSWORD) { const s = await authRequest(c, 'password', { email: c.email, password: process.env.SYNC_PASSWORD }); fs.writeFileSync(SESSION_FILE, JSON.stringify(s)); return s; }
  if (!fs.existsSync(SESSION_FILE)) throw new Error('서버 로그인 세션이 없어요. SYNC_PASSWORD를 설정하고 publish.js --login 을 한 번 실행해 주세요.');
  let s = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
  if (Date.now() >= s.expiresAt) { s = await authRequest(c, 'refresh_token', { refresh_token: s.refresh }); fs.writeFileSync(SESSION_FILE, JSON.stringify(s)); }
  return s;
}

async function sbGet(query) {
  const c = config(); const s = await session();
  const res = await fetch(c.url + '/rest/v1/' + query, { headers: { apikey: c.key, Authorization: 'Bearer ' + s.access } });
  if (!res.ok) throw new Error('서버 요청 실패 (GET ' + query.split('?')[0] + ' ' + res.status + ')');
  return res.json();
}

// 수신함에 글을 넣습니다. 전송 토큰은 헤더(x-ingest-token)로만 보냅니다.
async function ingest(fields) {
  const c = config();
  const tokenFile = process.env.INGEST_TOKEN_FILE || path.join(process.env.USERPROFILE || '', '.blog-studio', 'ingest-token.txt');
  const token = fs.readFileSync(tokenFile, 'utf8').trim();
  const res = await fetch(c.url + '/rest/v1/rpc/ingest_post', {
    method: 'POST',
    headers: { apikey: c.key, 'x-ingest-token': token, 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });
  const text = await res.text();
  if (!res.ok) throw new Error('수신함 전송 실패 (' + res.status + '): ' + text.slice(0, 200));
  return JSON.parse(text);
}

module.exports = { config, session, sbGet, ingest };
