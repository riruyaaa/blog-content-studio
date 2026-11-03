/* =========================================================
   lock.js — 화면 잠금
   비밀번호 원문은 저장하지 않고, 솔트+PBKDF2 해시만 보관합니다.
   정적 사이트라 진짜 접근 제어는 아니며, 화면을 가리는 용도입니다.
   ========================================================= */
(function () {
  const SALT = '42bcb74b36e2260fa4d28fed0d1f40ea';
  const HASH = '5f124e069535e0dc80d98ebaf06f7c04bdaa5a9c3a017b61f4f7696a3bdd9517';
  const ITER = 200000;
  const KEY = 'bcs_unlock_v1';

  function hex(buf) { return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join(''); }
  function unhex(s) { return new Uint8Array(s.match(/../g).map((h) => parseInt(h, 16))); }

  async function derive(pw) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(SALT), iterations: ITER, hash: 'SHA-256' }, key, 256);
    return hex(bits);
  }

  function remembered() { try { return localStorage.getItem(KEY) === HASH; } catch (e) { return false; } }
  function remember() { try { localStorage.setItem(KEY, HASH); } catch (e) { /* 무시 */ } }

  // 잠금을 푼 비밀번호로 서버에 로그인해 기기 간 데이터를 맞춥니다. 서버 데이터가 더 최신이면 새로고침합니다.
  async function connectSync(pw) {
    try {
      if (!window.Sync || !(await window.Sync.login(pw))) return;
      const applied = await window.Store.syncNow();
      const imported = await window.Store.importInbox();
      if (applied || imported) location.reload();
    } catch (e) { console.warn('동기화 연결 실패', e); }
  }

  // 이미 잠금을 푼 기기라도, 서버 동기화 세션이 없으면 한 번 더 입력받아 로그인합니다.
  function hasSyncSession() { try { return !!localStorage.getItem('bcs_sync_session_v1'); } catch (e) { return false; } }

  if (remembered() && hasSyncSession()) return;

  const style = document.createElement('style');
  style.textContent = '#lockScreen{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:#faf9f5;font-family:"Noto Sans KR",sans-serif}'
    + '#lockScreen form{width:min(320px,86vw);text-align:center}'
    + '#lockScreen h1{font-size:20px;margin:0 0 6px;color:#141413}#lockScreen p{margin:0 0 18px;color:#6b6a63;font-size:13px}'
    + '#lockScreen input{width:100%;box-sizing:border-box;padding:12px 14px;font-size:16px;border:1px solid #d8d5c8;border-radius:10px;background:#fff;color:#141413}'
    + '#lockScreen button{width:100%;margin-top:10px;padding:12px;font-size:15px;font-weight:600;border:0;border-radius:10px;background:#33456B;color:#fff;cursor:pointer}'
    + '#lockScreen .err{min-height:18px;margin-top:10px;font-size:13px;color:#b8453c}'
    + '@media (prefers-color-scheme:dark){#lockScreen{background:#1b1a17}#lockScreen h1{color:#f1efe6}#lockScreen input{background:#262420;color:#f1efe6;border-color:#3d3a33}}';
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'lockScreen';
  box.innerHTML = '<form><h1>🔒 콘텐츠 스튜디오</h1><p>비밀번호를 입력하세요</p>'
    + '<input type="password" id="lockPw" autocomplete="current-password" autofocus>'
    + '<button type="submit">열기</button><div class="err" id="lockErr"></div></form>';
  document.body.appendChild(box);
  document.body.style.overflow = 'hidden';

  box.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('lockErr');
    err.textContent = '';
    let h = '';
    try { h = await derive(document.getElementById('lockPw').value); }
    catch (ex) { err.textContent = '이 브라우저에서는 잠금 해제를 지원하지 않아요 (HTTPS 필요)'; return; }
    if (h === HASH) {
      remember();
      connectSync(document.getElementById('lockPw').value);
      box.remove();
      style.remove();
      document.body.style.overflow = '';
    } else {
      err.textContent = '비밀번호가 맞지 않아요';
      document.getElementById('lockPw').select();
    }
  });
})();
