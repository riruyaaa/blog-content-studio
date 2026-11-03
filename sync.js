/* =========================================================
   sync.js — Supabase 동기화 (기기 간 글 공유)
   - 라이브러리 없이 REST로 직접 호출합니다.
   - 로그인한 사용자 1명의 데이터를 app_state 테이블 한 행(JSON)으로 저장합니다.
   - anon 키는 공개되어도 되는 키이며, 실제 접근 제한은 Supabase RLS 정책이 담당합니다.
   - SUPABASE_URL / SUPABASE_ANON_KEY가 비어 있으면 동기화는 꺼지고 로컬 저장만 씁니다.
   ========================================================= */
(function (global) {
  const SUPABASE_URL = 'https://lyhmuimkmiinscmbagad.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_oJcqzf_P8GQUettDRe3sEA_unZQCeL_';
  const SYNC_EMAIL = 'studio@example.com';

  const SESSION_KEY = 'bcs_sync_session_v1';
  // API 키는 서버로 보내지 않고 각 기기에만 둡니다.
  const LOCAL_ONLY = ['apiKey', 'searchApiKey', 'imageApiKey'];

  function configured() { return !!(SUPABASE_URL && SUPABASE_ANON_KEY); }

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; }
  }
  function writeSession(s) {
    try { if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); } catch (e) { /* 무시 */ }
  }

  function toSession(res) {
    return {
      access: res.access_token,
      refresh: res.refresh_token,
      userId: res.user && res.user.id,
      expiresAt: Date.now() + (res.expires_in || 3600) * 1000 - 60000,
    };
  }

  async function authRequest(grant, body) {
    const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=' + grant, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('auth ' + res.status);
    return toSession(await res.json());
  }

  async function login(password) {
    if (!configured()) return false;
    try {
      writeSession(await authRequest('password', { email: SYNC_EMAIL, password }));
      return true;
    } catch (e) {
      console.warn('동기화 로그인 실패', e);
      return false;
    }
  }

  async function validSession() {
    let s = readSession();
    if (!s) return null;
    if (Date.now() < s.expiresAt) return s;
    try {
      s = await authRequest('refresh_token', { refresh_token: s.refresh });
      writeSession(s);
      return s;
    } catch (e) {
      writeSession(null);
      return null;
    }
  }

  function ready() { return configured() && !!readSession(); }

  function strip(data) {
    const copy = { ...data };
    LOCAL_ONLY.forEach((k) => delete copy[k]);
    return copy;
  }

  // 반환: { data, ts } | null(서버에 아직 없음) | undefined(실패)
  async function fetchRemote() {
    const s = await validSession();
    if (!s) return undefined;
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/app_state?select=data,updated_at&limit=1', {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access },
      });
      if (!res.ok) return undefined;
      const rows = await res.json();
      if (!rows.length) return null;
      return { data: rows[0].data, ts: Date.parse(rows[0].updated_at) || 0 };
    } catch (e) {
      console.warn('서버에서 불러오지 못했어요', e);
      return undefined;
    }
  }

  async function push(data, ts, opts) {
    const s = await validSession();
    if (!s) return false;
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/app_state', {
        method: 'POST',
        keepalive: !!(opts && opts.keepalive),
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + s.access,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({ user_id: s.userId, data: strip(data), updated_at: new Date(ts).toISOString() }),
      });
      return res.ok;
    } catch (e) {
      console.warn('서버에 저장하지 못했어요', e);
      return false;
    }
  }

  // 수신함(inbox_posts): ChatGPT 등 외부에서 보낸 글. 실패하면 undefined.
  async function fetchInbox() {
    const s = await validSession();
    if (!s) return undefined;
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/inbox_posts?select=*&order=created_at.desc&limit=100', {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access },
      });
      return res.ok ? await res.json() : undefined;
    } catch (e) {
      console.warn('수신함을 불러오지 못했어요', e);
      return undefined;
    }
  }

  async function deleteInbox(ids) {
    const s = await validSession();
    if (!s || !ids.length) return false;
    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/inbox_posts?id=in.(' + ids.join(',') + ')', {
        method: 'DELETE',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + s.access },
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  global.Sync = { configured, ready, login, fetchRemote, push, fetchInbox, deleteInbox, LOCAL_ONLY };
})(window);
