/* =========================================================
   app.js — 블로그 콘텐츠 스튜디오 메인 애플리케이션
   ========================================================= */

(function () {
  'use strict';

  // ---------------- 상수 ----------------
  const POST_TYPES = ['정보성 글', 'SEO 글', '후기', '여행 가이드', '여행 일정', '병원 질환 설명', '병원 치료 사례', '제품 비교', '맛집 소개', '숙소 소개', '뉴스/이슈', '재테크 정보', '자유 형식'];
  const PURPOSES = ['검색 유입', '정보 전달', '예약 문의', '구매 전환', '브랜딩', 'SNS 공유', '전문성 강조'];
  const TONES = ['친근한 ~요체', 'MZ', '전문적', '부드러운 전문가', '뉴스형', '후기형', '직접 설정'];
  const LENGTHS = ['짧게', '보통', '자세히', '매우 자세히'];
  const PLATFORMS = [
    { key: 'naver', label: '네이버 블로그', desc: '짧은 문단·모바일 가독성 중심' },
    { key: 'tistory', label: '티스토리', desc: 'Google SEO·H2/H3 구조 강조' },
    { key: 'general', label: '일반 블로그', desc: '범용 스타일' },
  ];
  const OPTION_DEFS = [
    { key: 'seoTitle', label: 'SEO 제목 생성', desc: '검색에 강한 제목을 함께 만들어요' },
    { key: 'metaDesc', label: '메타디스크립션 생성', desc: '검색결과 요약문을 만들어요' },
    { key: 'toc', label: '목차 생성', desc: '글 구조를 미리 정리해요' },
    { key: 'seoHeadings', label: '소제목 SEO 최적화', desc: 'H2에 키워드를 반영해요' },
    { key: 'keywordInsert', label: '핵심 키워드 자연스럽게 삽입', desc: '본문에 키워드를 배치해요' },
    { key: 'relatedSearch', label: '관련 검색어 포함', desc: '서브 키워드를 함께 언급해요' },
    { key: 'faq', label: 'FAQ 추가', desc: '자주 묻는 질문을 붙여요' },
    { key: 'cta', label: 'CTA 추가', desc: '마무리에 행동 유도 문구 추가' },
    { key: 'hashtags', label: '해시태그 생성', desc: '완성 후 해시태그를 만들어요' },
    { key: 'thumbnail', label: '썸네일 문구 생성', desc: '썸네일용 짧은 문구를 제안해요' },
    { key: 'images', label: '관련 이미지 자동 삽입', desc: '본문 사이사이에 무료 이미지를 자동으로 넣어요' },
    { key: 'cardnews', label: '카드뉴스 구성안 생성', desc: '이미지 포함 8~10장 카드뉴스 (기본 OFF)' },
  ];
  const DEFAULT_OPTIONS = { seoTitle: true, metaDesc: true, toc: true, seoHeadings: true, keywordInsert: true, relatedSearch: true, faq: true, cta: true, hashtags: true, thumbnail: true, images: true, cardnews: false };
  const PLATFORM_LABEL = { naver: '네이버 블로그', tistory: '티스토리', general: '일반 블로그' };
  const STATUS_LABEL = { writing: '작성 중', done: '작성 완료', idea: '아이디어', scheduled: '업로드 예정', published: '업로드 완료' };
  const STATUS_PILL = { writing: 'pill-writing', done: 'pill-done', idea: 'pill-idea', scheduled: 'pill-scheduled', published: 'pill-published' };
  const CAL_STATUS_ORDER = ['idea', 'writing', 'done', 'scheduled', 'published'];
  const BLOG_COLORS = ['#33456B', '#9C6B08', '#2E7D54', '#B8453C', '#5B4B8A', '#1F7A7A'];
  const AI_ACTIONS = [
    { action: 'full', label: '✨ 글 전체 작성', scope: '전체' },
    { action: 'continue', label: '✨ 이어쓰기', scope: '전체' },
    { action: 'natural', label: '✨ 문장 자연스럽게', scope: '선택' },
    { action: 'mz', label: '✨ MZ 말투로 변경', scope: '선택' },
    { action: 'expert', label: '✨ 전문가스럽게 변경', scope: '선택' },
    { action: 'simple', label: '✨ 쉽게 설명', scope: '선택' },
    { action: 'elaborate', label: '✨ 내용 자세히', scope: '선택' },
    { action: 'shorten', label: '✨ 내용 줄이기', scope: '선택' },
    { action: 'seo', label: '✨ SEO 최적화', scope: '선택' },
    { action: 'subheadings', label: '✨ 소제목 만들기', scope: '전체' },
    { action: 'titles', label: '✨ 제목 추천', scope: '전체' },
    { action: 'clickTitles', label: '✨ 클릭하고 싶은 제목', scope: '전체' },
    { action: 'faq', label: '✨ FAQ 생성', scope: '전체' },
    { action: 'cta', label: '✨ CTA 생성', scope: '전체' },
    { action: 'hashtags', label: '✨ 해시태그 생성', scope: '전체' },
    { action: 'fixSpelling', label: '✨ 맞춤법 수정', scope: '선택' },
  ];
  const EMOJI_LIST = ['😀', '😊', '🙂', '😍', '🤩', '😎', '🥳', '😅', '🤔', '😴', '👍', '👏', '🙌', '💪', '🔥', '✨', '⭐', '❤️', '💡', '📌', '📍', '📷', '🎉', '✅', '⚠️', '❗', '🗓️', '✈️', '🏖️', '🍜', '☕', '📝'];
  // 여행/동물병원/재테크 블로그의 실제 상위 노출 글을 살펴보고 정리한 공통 패턴이에요.
  const INSIGHT_POINTS = [
    '본문은 2,500~4,000자 이상 — 짧은 글보다 훨씬 자세히 다뤄야 유리해요',
    'H2 소제목 4~6개 + 필요하면 H3로 한 번 더 세분화해서 구조화하세요',
    '체크리스트·표로 정리하면 스캔하기 쉬워져 체류시간이 길어져요',
    'FAQ 3~5개로 실제 검색 의도(질문)를 직접 해결해주세요',
    '핵심 키워드는 제목+본문에 5회 이상, 과하지 않게 자연스럽게 반복하세요',
    '단계·수치·실제 경험처럼 구체적인 내용을 넣으면 신뢰도가 올라가요',
  ];

  // ---------------- 상태 ----------------
  const state = {
    view: 'dashboard', viewParams: {},
    blogs: [], posts: [], ideas: [], presets: [], calendar: [],
    favorites: { postIds: [], titles: [], ideaIds: [] },
    activeBlogId: null,
    currentPost: null,
    rightTab: 'seo',
    titleFlat: [], titleGenResult: null,
    hashtagResult: null, thumbResult: null, cardNewsResult: null,
    mobilePreview: false,
    step1Draft: null,
    calendarCursor: new Date(),
    searchQuery: '',
    ideaCategory: '전체',
    favTab: 'posts',
  };

  // ---------------- DOM 헬퍼 ----------------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $all = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str == null ? '' : String(str);
    return d.innerHTML;
  }
  function debounce(fn, wait) {
    let t;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }
  function toast(msg) {
    const host = $('#toast-host');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    host.appendChild(t);
    setTimeout(() => { t.remove(); }, 2200);
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); toast('복사했어요'); } catch (e) { toast('복사에 실패했어요'); }
    document.body.removeChild(ta);
  }
  function copyText(text) {
    if (!text) { toast('복사할 내용이 없어요'); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast('복사했어요')).catch(() => fallbackCopy(text));
    } else fallbackCopy(text);
  }
  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  }
  function fmtRelative(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return '방금 전';
    if (m < 60) return `${m}분 전`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}시간 전`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}일 전`;
    return fmtDate(ts);
  }

  // ---------------- 데이터 헬퍼 ----------------
  function getActiveBlog() { return state.blogs.find((b) => b.id === state.activeBlogId) || state.blogs[0] || null; }
  function getBlogById(id) { return state.blogs.find((b) => b.id === id) || null; }
  function blogColor(id) {
    const idx = state.blogs.findIndex((b) => b.id === id);
    const b = getBlogById(id);
    return (b && b.color) || BLOG_COLORS[idx % BLOG_COLORS.length] || '#33456B';
  }
  function paramsFromPost(post) {
    return {
      topic: post.title || post.mainKeyword || '', mainKeyword: post.mainKeyword || '', subKeywords: post.subKeywords || '',
      postType: post.category || '정보성 글', purpose: post.purpose || [], targetReader: post.targetReader || '',
      tone: post.tone || '친근한 ~요체', lengthPref: post.lengthPref || '보통', platform: post.platform || 'naver',
      aiRequest: post.aiRequest || '', options: post.options || {}, blog: getBlogById(post.blogId) || getActiveBlog(),
    };
  }

  // ---------------- 초기화 ----------------
  function init() {
    Store.init().then(loadAll);
    bindGlobalUI();
    window.addEventListener('resize', debounce(() => { updatePanelToggleVisibility(); updateMenuToggleVisibility(); }, 150));
  }

  function loadAll() {
    Promise.all([
      Store.getBlogs(), Store.getPosts(), Store.getIdeas(), Store.getPresets(), Store.getCalendar(),
      Store.getTheme(), Store.getActiveBlogId(),
    ]).then(([blogs, posts, ideas, presets, calendar, theme, activeBlogId]) => {
      state.blogs = blogs; state.posts = posts; state.ideas = ideas; state.presets = presets; state.calendar = calendar;
      state.activeBlogId = activeBlogId && blogs.find((b) => b.id === activeBlogId) ? activeBlogId : (blogs[0] && blogs[0].id);
      applyTheme(theme);
      const dbData = JSON.parse(localStorage.getItem('bcs_data_v2') || '{}');
      state.favorites = dbData.favorites || state.favorites;
      renderBlogSwitcher();
      navigate('dashboard');
    });
  }

  // ---------------- 라우팅 ----------------
  function navigate(view, params) {
    state.view = view; state.viewParams = params || {};
    renderApp();
  }

  function renderApp() {
    updateSidebarActive();
    updateAppShellClasses();
    updatePanelToggleVisibility();
    updateMenuToggleVisibility();
    const main = $('#mainView');
    main.innerHTML = '';
    main.scrollTop = 0;
    switch (state.view) {
      case 'dashboard': renderDashboard(main); break;
      case 'new-post': renderStep1(main); break;
      case 'editor': renderEditor(main); break;
      case 'writing': renderPostList(main, 'writing'); break;
      case 'done': renderPostList(main, 'done'); break;
      case 'ideas': renderIdeas(main); break;
      case 'calendar': renderCalendar(main); break;
      case 'favorites': renderFavorites(main); break;
      case 'settings': renderSettings(main); break;
      case 'search': renderSearch(main); break;
    }
    if (state.view === 'editor') renderRightPanel(); else { $('#rightPanel').innerHTML = ''; }
  }

  function updateSidebarActive() {
    $all('.nav-item[data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
  }
  function updateAppShellClasses() {
    const app = $('#app');
    if (state.view === 'editor') app.classList.add('app-shell--with-panel');
    else { app.classList.remove('app-shell--with-panel'); $('#rightPanel').classList.remove('open'); $('#panelBackdrop').classList.remove('show'); }
  }
  function updatePanelToggleVisibility() {
    const btn = $('#panelToggle');
    const narrow = window.matchMedia('(max-width:1080px)').matches;
    btn.style.display = (state.view === 'editor' && narrow) ? 'flex' : 'none';
  }
  function updateMenuToggleVisibility() {
    const btn = $('#menuToggle');
    btn.style.display = window.matchMedia('(max-width:680px)').matches ? 'flex' : 'none';
  }
  function closeSidebar() { $('#sidebar').classList.remove('open'); $('#sidebarBackdrop').classList.remove('show'); }

  // ---------------- 테마 ----------------
  function applyTheme(theme) {
    state.theme = theme || 'system';
    const root = document.documentElement;
    if (state.theme === 'dark') root.setAttribute('data-theme', 'dark');
    else if (state.theme === 'light') root.setAttribute('data-theme', 'light');
    else root.removeAttribute('data-theme');
    const isDark = state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    $all('#themeToggle, #sidebarThemeToggle .ic').forEach(() => {});
    $('#themeToggle').textContent = isDark ? '☀️' : '🌙';
    const label = $('#sidebarThemeLabel'); if (label) label.textContent = isDark ? '라이트 모드' : '다크 모드';
  }
  function toggleTheme() {
    const isDark = state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    Store.setTheme(next).then(() => applyTheme(next));
  }

  // ---------------- 전역 UI 바인딩 ----------------
  function bindGlobalUI() {
    $all('.nav-item[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => { navigate(btn.dataset.view); closeSidebar(); });
    });
    $('#newPostBtn').addEventListener('click', () => { resetStep1Draft(); navigate('new-post'); closeSidebar(); });
    $('#themeToggle').addEventListener('click', toggleTheme);
    $('#sidebarThemeToggle').addEventListener('click', toggleTheme);
    $('#menuToggle').addEventListener('click', () => { $('#sidebar').classList.toggle('open'); $('#sidebarBackdrop').classList.toggle('show'); });
    $('#sidebarBackdrop').addEventListener('click', closeSidebar);
    $('#panelToggle').addEventListener('click', () => { $('#rightPanel').classList.toggle('open'); $('#panelBackdrop').classList.toggle('show'); });
    $('#panelBackdrop').addEventListener('click', () => { $('#rightPanel').classList.remove('open'); $('#panelBackdrop').classList.remove('show'); });

    const search = $('#globalSearch');
    const doSearch = debounce(() => {
      state.searchQuery = search.value.trim();
      if (state.searchQuery) navigate('search'); else if (state.view === 'search') navigate('dashboard');
    }, 300);
    search.addEventListener('input', doSearch);
    search.addEventListener('keydown', (e) => { if (e.key === 'Enter') { state.searchQuery = search.value.trim(); if (state.searchQuery) navigate('search'); } });

    $('#finalHost').addEventListener('click', onFinalHostClick);
    $('#modalHost').addEventListener('click', (e) => { if (e.target.id === 'modalHost' || e.target.classList.contains('modal-overlay')) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeEmojiPopover(); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.emoji-pop') && !e.target.closest('[data-cmd="emoji"]')) closeEmojiPopover(); });
  }

  // ---------------- 블로그 전환 ----------------
  function renderBlogSwitcher() {
    const host = $('#blogSwitcher');
    const blog = getActiveBlog();
    if (!blog) { host.innerHTML = `<button class="blog-switcher-btn" id="blogSwitcherBtn"><span class="meta"><span class="name">블로그 추가하기</span></span></button>`; }
    else {
      host.innerHTML = `
      <button class="blog-switcher-btn" id="blogSwitcherBtn">
        <span class="blog-avatar" style="background:${blog.color || blogColor(blog.id)}">${escapeHtml((blog.nickname || blog.name || '?').slice(0, 1))}</span>
        <span class="meta"><div class="name">${escapeHtml(blog.name)}</div><div class="cat">${escapeHtml(blog.category || '')}</div></span>
        <span class="chev">▾</span>
      </button>`;
    }
    $('#blogSwitcherBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleBlogDropdown(); });
  }
  let blogDropdownEl = null;
  function toggleBlogDropdown() {
    if (blogDropdownEl) { closeBlogDropdown(); return; }
    const btn = $('#blogSwitcherBtn');
    const dd = document.createElement('div');
    dd.className = 'card';
    dd.style.cssText = 'position:absolute; top:52px; left:20px; width:280px; padding:8px; z-index:80; box-shadow:var(--shadow-lg);';
    dd.innerHTML = state.blogs.map((b) => `
      <button class="nav-item" data-blog="${b.id}" style="width:100%;">
        <span class="blog-avatar" style="background:${b.color || blogColor(b.id)}; width:22px; height:22px; font-size:10px;">${escapeHtml((b.nickname || b.name || '?').slice(0, 1))}</span>
        <span style="flex:1; text-align:left; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(b.name)}</span>
        ${b.id === state.activeBlogId ? '<span style="color:var(--accent);">✓</span>' : ''}
      </button>`).join('') + `<div class="nav-divider"></div><button class="nav-item" id="addBlogFromSwitcher"><span class="ic">＋</span>새 블로그 추가</button>`;
    document.body.appendChild(dd);
    blogDropdownEl = dd;
    dd.querySelectorAll('[data-blog]').forEach((el) => el.addEventListener('click', () => {
      Store.setActiveBlogId(el.dataset.blog).then(() => { state.activeBlogId = el.dataset.blog; renderBlogSwitcher(); closeBlogDropdown(); renderApp(); });
    }));
    $('#addBlogFromSwitcher', dd).addEventListener('click', () => { closeBlogDropdown(); openBlogModal(null); });
    setTimeout(() => document.addEventListener('click', closeBlogDropdownOnce), 0);
  }
  function closeBlogDropdownOnce(e) { if (blogDropdownEl && !blogDropdownEl.contains(e.target)) closeBlogDropdown(); }
  function closeBlogDropdown() { if (blogDropdownEl) { blogDropdownEl.remove(); blogDropdownEl = null; document.removeEventListener('click', closeBlogDropdownOnce); } }

  // ---------------- 모달 ----------------
  function openModal(innerHtml, opts) {
    opts = opts || {};
    const host = $('#modalHost');
    host.innerHTML = `<div class="modal-overlay"><div class="modal ${opts.large ? 'modal-lg' : ''}">${innerHtml}</div></div>`;
    if (opts.onMount) opts.onMount(host);
  }
  function closeModal() { $('#modalHost').innerHTML = ''; }

  // ============================================================
  // 대시보드
  // ============================================================
  function renderDashboard(main) {
    const blog = getActiveBlog();
    const writing = state.posts.filter((p) => p.status === 'writing').sort((a, b) => b.updatedAt - a.updatedAt);
    const done = state.posts.filter((p) => p.status === 'done').sort((a, b) => b.updatedAt - a.updatedAt);
    const todayStr = Store.dateStr(new Date());
    const weekEnd = new Date(Date.now() + 7 * 86400000);
    const weekEntries = state.calendar.filter((c) => c.date >= todayStr && c.date <= Store.dateStr(weekEnd)).sort((a, b) => a.date.localeCompare(b.date));
    const ideas = state.ideas.slice(0, 4);

    main.innerHTML = `
    <div class="view">
      <div class="hero-row">
        <div>
          <div class="hero-greet">안녕하세요 👋</div>
          <div class="hero-sub">오늘은 어떤 콘텐츠를 만들어볼까요? ${blog ? `현재 <b>${escapeHtml(blog.name)}</b> 작업 중이에요.` : ''}</div>
        </div>
        <button class="btn btn-primary btn-lg" id="dashNewPostBtn">＋ 새 글 작성</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card"><div class="stat-num mono">${writing.length}</div><div class="stat-label">📚 작성 중인 글</div></div>
        <div class="stat-card"><div class="stat-num mono">${weekEntries.length}</div><div class="stat-label">📅 이번 주 예정 콘텐츠</div></div>
        <div class="stat-card"><div class="stat-num mono">${done.length}</div><div class="stat-label">✅ 완성된 글</div></div>
        <div class="stat-card"><div class="stat-num mono">${state.ideas.length}</div><div class="stat-label">💡 콘텐츠 아이디어</div></div>
      </div>

      <div class="card-row-grid" style="margin-top:26px;">
        <div class="card">
          <div class="section-head"><div class="section-title">📚 작성 중인 글</div><button class="btn btn-ghost btn-sm" data-nav="writing">더보기</button></div>
          <div class="mini-list">${writing.length ? writing.slice(0, 4).map(miniPostRow).join('') : emptyMini('아직 작성 중인 글이 없어요')}</div>
        </div>
        <div class="card">
          <div class="section-head"><div class="section-title">📅 이번 주 콘텐츠</div><button class="btn btn-ghost btn-sm" data-nav="calendar">더보기</button></div>
          <div class="mini-list">${weekEntries.length ? weekEntries.slice(0, 4).map(miniCalRow).join('') : emptyMini('이번 주 예정된 콘텐츠가 없어요')}</div>
        </div>
        <div class="card">
          <div class="section-head"><div class="section-title">✅ 최근 작성 글</div><button class="btn btn-ghost btn-sm" data-nav="done">더보기</button></div>
          <div class="mini-list">${done.length ? done.slice(0, 4).map(miniPostRow).join('') : emptyMini('아직 완성된 글이 없어요')}</div>
        </div>
        <div class="card">
          <div class="section-head"><div class="section-title">💡 콘텐츠 아이디어</div><button class="btn btn-ghost btn-sm" data-nav="ideas">더보기</button></div>
          <div class="mini-list">${ideas.length ? ideas.map(miniIdeaRow).join('') : emptyMini('아이디어를 추가해보세요')}</div>
        </div>
      </div>
    </div>`;

    $('#dashNewPostBtn').addEventListener('click', () => { resetStep1Draft(); navigate('new-post'); });
    $all('[data-nav]', main).forEach((b) => b.addEventListener('click', () => navigate(b.dataset.nav)));
    $all('.mini-item[data-post]', main).forEach((b) => b.addEventListener('click', () => openEditor(b.dataset.post)));
    $all('.mini-item[data-idea]', main).forEach((b) => b.addEventListener('click', () => startPostFromIdea(b.dataset.idea)));
    $all('.mini-item[data-cal]', main).forEach((b) => b.addEventListener('click', () => navigate('calendar')));
  }
  function emptyMini(text) { return `<div class="empty-mini">${escapeHtml(text)}</div>`; }
  function miniPostRow(p) {
    const cls = p.status === 'done' ? 'good' : 'warn';
    return `<div class="mini-item" data-post="${p.id}">
      <span class="dot" style="background:${blogColor(p.blogId)}"></span>
      <span class="title">${escapeHtml(p.title || '(제목 없음)')}</span>
      <span class="blogtag">${escapeHtml((getBlogById(p.blogId) || {}).name || '')}</span>
      <span class="sub">${fmtRelative(p.updatedAt)}</span>
    </div>`;
  }
  function miniCalRow(c) {
    const label = c.postId ? (state.posts.find((p) => p.id === c.postId) || {}).title : (state.ideas.find((i) => i.id === c.ideaId) || {}).title;
    return `<div class="mini-item" data-cal="${c.id}">
      <span class="dot" style="background:${blogColor(c.blogId)}"></span>
      <span class="title">${escapeHtml(label || '(제목 없음)')}</span>
      <span class="pill ${STATUS_PILL[c.status] || 'pill-idea'}">${STATUS_LABEL[c.status] || c.status}</span>
      <span class="sub">${c.date.slice(5)}</span>
    </div>`;
  }
  function miniIdeaRow(i) {
    return `<div class="mini-item" data-idea="${i.id}">
      <span class="dot" style="background:${blogColor(i.blogId)}"></span>
      <span class="title">${escapeHtml(i.title)}</span>
      <span class="sub">${escapeHtml(i.category || '')}</span>
    </div>`;
  }

  // ============================================================
  // Step1 — 새 글 작성 설정
  // ============================================================
  function resetStep1Draft(prefillIdea) {
    const blog = getActiveBlog() || {};
    state.step1Draft = {
      postType: guessPostType(blog.category), targetReader: blog.audience || '', tone: TONES.includes(blog.tone) ? blog.tone : '친근한 ~요체',
      lengthPref: LENGTHS.includes(blog.lengthPref) ? blog.lengthPref : '보통', platform: 'naver',
    };
    if (prefillIdea) {
      state.step1Draft.topic = prefillIdea.title; state.step1Draft.mainKeyword = prefillIdea.mainKeyword;
      state.step1Draft.subKeywords = prefillIdea.subKeywords; state.step1Draft.postType = prefillIdea.category || state.step1Draft.postType;
    }
  }
  function guessPostType(cat) {
    if (!cat) return '정보성 글';
    if (cat.includes('여행사')) return '여행 가이드';
    if (cat.includes('여행')) return '여행 가이드';
    if (cat.includes('동물')) return '병원 질환 설명';
    if (cat.includes('재테크')) return '재테크 정보';
    return '정보성 글';
  }
  function startPostFromIdea(ideaId) {
    const idea = state.ideas.find((i) => i.id === ideaId);
    if (!idea) return;
    if (idea.blogId && idea.blogId !== state.activeBlogId && getBlogById(idea.blogId)) {
      state.activeBlogId = idea.blogId; Store.setActiveBlogId(idea.blogId); renderBlogSwitcher();
    }
    resetStep1Draft(idea);
    navigate('new-post');
  }

  function renderStep1(main) {
    if (!state.blogs.length) { main.innerHTML = noBlogState(); $('#s1AddBlogBtn', main).addEventListener('click', () => openBlogModal(null)); return; }
    if (!state.step1Draft) resetStep1Draft();
    const d = state.step1Draft;
    main.innerHTML = `
    <div class="view view-narrow">
      <div class="page-title">✍️ 새 글 작성</div>
      <div class="page-sub">STEP 1 · 콘텐츠 설정 — 원하는 방향을 정하면 AI가 초안을 만들어드려요.</div>

      <div class="card card-flat" style="margin-top:16px;">
        <div class="section-title" style="font-size:13px;">💡 상위 노출 글 참고 포인트</div>
        <div class="field-hint" style="margin:4px 0 8px;">여행·동물병원·재테크 블로그의 실제 상위 노출 글 구조를 살펴보고 반영한 가이드예요.</div>
        <div class="check-grid" style="grid-template-columns:1fr 1fr;">
          ${INSIGHT_POINTS.map((t) => `<div class="check-item good"><span class="cico">✓</span><span class="ctext">${t}</span></div>`).join('')}
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="section-head" style="margin-bottom:14px;">
          <div class="field" style="flex:1; max-width:320px;">
            <div class="field-label">프리셋 적용 <span class="opt">(선택)</span></div>
            <div style="display:flex; gap:8px;">
              <select class="select" id="s1PresetSelect"><option value="">프리셋 선택…</option>${state.presets.map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select>
              <button class="btn btn-secondary btn-sm" id="s1ApplyPreset">적용</button>
            </div>
          </div>
        </div>

        <div class="field-row">
          <div class="field"><div class="field-label">글 주제</div><input class="input" id="s1Topic" placeholder="예: 10월 홍콩 여행 준비" value="${escapeHtml(d.topic || '')}"></div>
          <div class="field"><div class="field-label">핵심 키워드</div><input class="input" id="s1MainKw" placeholder="예: 10월 홍콩 여행" value="${escapeHtml(d.mainKeyword || '')}"></div>
        </div>
        <div class="field" style="margin-top:14px;">
          <div class="field-label">서브 키워드 <span class="opt">(쉼표로 구분)</span></div>
          <input class="input" id="s1SubKw" placeholder="예: 홍콩 날씨, 홍콩 옷차림, 홍콩 준비물" value="${escapeHtml(d.subKeywords || '')}">
        </div>

        <div class="field-row" style="margin-top:14px;">
          <div class="field"><div class="field-label">글 종류</div>
            <select class="select" id="s1PostType">${POST_TYPES.map((t) => `<option ${t === d.postType ? 'selected' : ''}>${t}</option>`).join('')}</select>
          </div>
          <div class="field"><div class="field-label">예상 독자</div><input class="input" id="s1TargetReader" placeholder="예: 10월 홍콩 자유여행 준비자" value="${escapeHtml(d.targetReader || '')}"></div>
        </div>

        <div class="field" style="margin-top:14px;">
          <div class="field-label">글 목적 <span class="opt">(복수 선택 가능)</span></div>
          <div class="chip-group" id="s1Purpose">${PURPOSES.map((p) => `<button type="button" class="chip" data-purpose="${p}">${p}</button>`).join('')}</div>
        </div>

        <div class="field-row" style="margin-top:14px;">
          <div class="field">
            <div class="field-label">말투</div>
            <select class="select" id="s1Tone">${TONES.map((t) => `<option ${t === d.tone ? 'selected' : ''}>${t}</option>`).join('')}</select>
            <input class="input" id="s1ToneCustom" placeholder="원하는 말투를 직접 입력해보세요" style="margin-top:8px;" ${d.tone === '직접 설정' ? '' : 'hidden'}>
          </div>
          <div class="field">
            <div class="field-label">글 길이</div>
            <div class="seg" id="s1LengthSeg">${LENGTHS.map((l) => `<button type="button" class="seg-btn ${l === d.lengthPref ? 'active' : ''}" data-length="${l}">${l}</button>`).join('')}</div>
          </div>
        </div>

        <div class="field" style="margin-top:14px;">
          <div class="field-label">플랫폼</div>
          <div class="radio-row" id="s1PlatformRow">
            ${PLATFORMS.map((p) => `
              <label class="radio-card ${p.key === d.platform ? 'selected' : ''}">
                <input type="radio" name="s1Platform" value="${p.key}" ${p.key === d.platform ? 'checked' : ''}>
                <div><div class="rt">${p.label}</div><div class="rd">${p.desc}</div></div>
              </label>`).join('')}
          </div>
        </div>

        <div class="field" style="margin-top:14px;">
          <div class="field-label">AI 추가 요청사항 <span class="opt">(자유롭게 입력)</span></div>
          <textarea class="textarea" id="s1AiRequest" placeholder="예: 10월 홍콩 여행을 준비하는 사람들이 검색할 만한 내용 중심으로 써줘. 날씨, 옷차림, 준비물, 여행 팁을 자세히 넣어줘." style="min-height:96px;"></textarea>
        </div>

        <div class="field" style="margin-top:18px;">
          <div class="field-label">글 생성 옵션</div>
          <div class="check-grid">
            ${OPTION_DEFS.map((o) => `
              <label class="check-row">
                <input type="checkbox" id="s1opt_${o.key}" ${DEFAULT_OPTIONS[o.key] ? 'checked' : ''}>
                <span><span class="t">${o.label}</span><br><span class="d">${o.desc}</span></span>
              </label>`).join('')}
          </div>
        </div>

        <div style="display:flex; gap:10px; margin-top:24px; align-items:center; flex-wrap:wrap;">
          <button class="btn btn-primary btn-lg" id="s1SubmitBtn" style="flex:1;">✨ AI로 글 생성하기</button>
          <button class="btn btn-secondary btn-lg" id="s1SkipBtn">빈 글로 바로 시작</button>
          <button class="btn btn-secondary btn-lg" id="s1PasteBtn">📋 글 붙여넣기</button>
        </div>
      </div>
    </div>`;

    // 이벤트 바인딩
    $all('#s1Purpose .chip', main).forEach((chip) => chip.addEventListener('click', () => chip.classList.toggle('selected')));
    $('#s1Tone', main).addEventListener('change', (e) => { $('#s1ToneCustom', main).hidden = e.target.value !== '직접 설정'; });
    $all('#s1PlatformRow input', main).forEach((r) => r.addEventListener('change', syncRadioCardSelected));
    $('#s1ApplyPreset', main).addEventListener('click', () => {
      const id = $('#s1PresetSelect', main).value; const preset = state.presets.find((p) => p.id === id);
      if (preset) applyPresetToForm(preset, main); else toast('적용할 프리셋을 선택해주세요');
    });
    $('#s1SubmitBtn', main).addEventListener('click', () => submitStep1(false));
    $('#s1SkipBtn', main).addEventListener('click', () => submitStep1(true));
    $('#s1PasteBtn', main).addEventListener('click', openPasteModal);
  }
  function noBlogState() {
    return `<div class="view"><div class="empty-state"><div class="es-ic">🗂️</div><div class="es-t">먼저 블로그를 추가해주세요</div><div class="es-d">블로그 프로필을 만들면 그에 맞는 말투와 설정으로 글을 쓸 수 있어요.</div>
    <button class="btn btn-primary" id="s1AddBlogBtn" style="margin-top:16px;">＋ 새 블로그 추가</button></div></div>`;
  }
  function syncRadioCardSelected() {
    $all('#s1PlatformRow .radio-card').forEach((card) => card.classList.toggle('selected', card.querySelector('input').checked));
  }
  function applyPresetToForm(preset, main) {
    const s = preset.settings || {};
    if (s.tone) {
      const opt = Array.from($('#s1Tone', main).options).find((o) => o.value === s.tone);
      if (opt) { $('#s1Tone', main).value = s.tone; $('#s1ToneCustom', main).hidden = true; }
      else { $('#s1Tone', main).value = '직접 설정'; $('#s1ToneCustom', main).hidden = false; $('#s1ToneCustom', main).value = s.tone; }
    }
    if (s.lengthPref) $all('#s1LengthSeg .seg-btn', main).forEach((b) => b.classList.toggle('active', b.dataset.length === s.lengthPref));
    if (s.platform) { const r = $(`input[name="s1Platform"][value="${s.platform}"]`, main); if (r) { r.checked = true; syncRadioCardSelected(); } }
    if (typeof s.faq === 'boolean') $('#s1opt_faq', main).checked = s.faq;
    if (typeof s.cta === 'boolean') $('#s1opt_cta', main).checked = s.cta;
    toast(`"${preset.name}" 프리셋을 적용했어요`);
  }
  function collectStep1Params(main) {
    const topic = $('#s1Topic', main).value.trim();
    const mainKeyword = $('#s1MainKw', main).value.trim();
    const subKeywords = $('#s1SubKw', main).value.trim();
    const postType = $('#s1PostType', main).value;
    const purpose = $all('#s1Purpose .chip.selected', main).map((c) => c.dataset.purpose);
    const targetReader = $('#s1TargetReader', main).value.trim();
    let tone = $('#s1Tone', main).value;
    if (tone === '직접 설정') tone = $('#s1ToneCustom', main).value.trim() || '직접 설정';
    const lengthPref = $('#s1LengthSeg .seg-btn.active', main).dataset.length;
    const platformEl = $('input[name="s1Platform"]:checked', main);
    const platform = platformEl ? platformEl.value : 'naver';
    const aiRequest = $('#s1AiRequest', main).value.trim();
    const options = {}; OPTION_DEFS.forEach((o) => { options[o.key] = $('#s1opt_' + o.key, main).checked; });
    return { topic, mainKeyword, subKeywords, postType, purpose, targetReader, tone, lengthPref, platform, aiRequest, options, blog: getActiveBlog() };
  }
  // ---------------- 글 붙여넣기 (ChatGPT 등에서 복사한 글) ----------------
  // HTML이면 그대로 두고, 아니면 마크다운/일반 텍스트를 HTML로 바꿉니다.
  function textToHtml(text) {
    const src = String(text || '').replace(/\r\n?/g, '\n').trim();
    if (/<(h[1-6]|p|ul|ol|div|table|section|article)[\s>]/i.test(src)) return src;
    const inline = (t) => escapeHtml(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // 마크다운 표(헤더 줄 + |---| 구분 줄 + 데이터 줄)는 미리 table 로 바꿔 자리표시자로 둡니다.
    const tables = [];
    const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    const srcLines = src.split('\n'); const kept = [];
    for (let k = 0; k < srcLines.length; k++) {
      const cur = srcLines[k].trim();
      if (cur.charAt(0) === '|' && k + 1 < srcLines.length && /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(srcLines[k + 1].trim())) {
        const head = cells(cur); const rows = []; k += 2;
        while (k < srcLines.length && srcLines[k].trim().charAt(0) === '|') { rows.push(cells(srcLines[k])); k++; }
        k--;
        tables.push('<table><thead><tr>' + head.map((h) => '<th>' + inline(h) + '</th>').join('') + '</tr></thead><tbody>' + rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
        kept.push(''); kept.push('@@TABLE' + (tables.length - 1) + '@@'); kept.push('');
      } else kept.push(srcLines[k]);
    }
    const out = []; let list = null; let para = [];
    const flushPara = () => { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } };
    const flushList = () => { if (list) { out.push('<' + list.tag + '>' + list.items.map((i) => '<li>' + inline(i) + '</li>').join('') + '</' + list.tag + '>'); list = null; } };
    kept.forEach((raw) => {
      const line = raw.trim();
      let m;
      if (!line) { flushPara(); flushList(); return; }
      if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flushPara(); flushList(); const h = m[1].length >= 3 ? 3 : 2; out.push('<h' + h + '>' + inline(m[2]) + '</h' + h + '>'); return; }
      if ((m = line.match(/^[-*•]\s+(.*)$/))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); return; }
      if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); return; }
      flushList(); para.push(line);
    });
    flushPara(); flushList();
    return out.join('\n').replace(/<p>@@TABLE(\d+)@@<\/p>/g, (_, n) => tables[Number(n)]);
  }

  function openPasteModal() {
    openModal(`
      <div class="modal-head"><h3>📋 글 붙여넣기</h3><button class="btn-icon" id="pmClose">✕</button></div>
      <div class="modal-body">
        <div class="field"><div class="field-label">제목</div><input class="input" id="ppTitle" placeholder="글 제목"></div>
        <div class="field"><div class="field-label">본문 (HTML · 마크다운 · 일반 텍스트 모두 가능)</div><textarea class="textarea" id="ppBody" style="min-height:220px;" placeholder="ChatGPT에서 복사한 글을 붙여넣으세요"></textarea></div>
        <div class="field"><div class="field-label">태그 (쉼표로 구분)</div><input class="input" id="ppTags" placeholder="제주도여행, 제주맛집"></div>
        <div class="field"><div class="field-label">메타 설명 (선택)</div><input class="input" id="ppMeta"></div>
        <div class="field"><div class="field-label">티스토리 발행 방식</div>
          <select class="select" id="ppMode"><option value="draft">임시저장 (공개하지 않음)</option><option value="public">공개 발행</option></select>
        </div>
        <label class="check-row" style="display:flex; gap:8px; align-items:center; margin-top:8px;"><input type="checkbox" id="ppQueue"> 예약 발행 대기열에 넣기 (정해진 시간에 자동 업로드)</label>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" id="ppCancel">취소</button><button class="btn btn-primary" id="ppSave">저장</button></div>`, {
      onMount: (host) => {
        $('#pmClose', host).addEventListener('click', closeModal);
        $('#ppCancel', host).addEventListener('click', closeModal);
        $('#ppSave', host).addEventListener('click', () => {
          const title = $('#ppTitle', host).value.trim();
          const body = $('#ppBody', host).value;
          if (!title || !body.trim()) { toast('제목과 본문을 입력해주세요'); return; }
          const now = Date.now();
          const post = {
            blogId: state.activeBlogId, platform: 'tistory', status: 'writing', source: 'paste',
            title, content: textToHtml(body), tags: $('#ppTags', host).value.trim(), metaDescription: $('#ppMeta', host).value.trim(),
            publishMode: $('#ppMode', host).value, queued: $('#ppQueue', host).checked, publishState: '',
            category: '', mainKeyword: '', subKeywords: '', purpose: '', targetReader: '', tone: '', lengthPref: '보통', aiRequest: '',
            options: {}, favorite: false, seoScore: 0, thumbnailPhrases: [], faq: [], cardNews: [], createdAt: now, updatedAt: now,
          };
          Store.savePost(post).then((saved) => { state.posts.unshift(saved); closeModal(); toast('글을 저장했어요'); navigate('writing'); });
        });
        $('#ppTitle', host).focus();
      },
    });
  }

  function submitStep1(skipAi) {
    const main = $('#mainView');
    const params = collectStep1Params(main);
    if (!params.topic || !params.mainKeyword) { toast('글 주제와 핵심 키워드를 입력해주세요'); return; }
    const base = {
      blogId: state.activeBlogId, category: params.postType, mainKeyword: params.mainKeyword, subKeywords: params.subKeywords,
      purpose: params.purpose, targetReader: params.targetReader, tone: params.tone, lengthPref: params.lengthPref,
      platform: params.platform, aiRequest: params.aiRequest, options: params.options, status: 'writing', favorite: false, seoScore: 0,
    };
    if (skipAi) {
      const post = Object.assign(base, { title: params.topic, content: '', tags: '', metaDescription: '', thumbnailPhrases: [], faq: [], cardNews: [] });
      Store.savePost(post).then((saved) => { state.posts.unshift(saved); openEditor(saved.id); toast('빈 글로 시작해요'); });
      return;
    }
    const btn = $('#s1SubmitBtn', main); btn.disabled = true; btn.textContent = '✨ AI가 작성 중이에요…';
    setTimeout(() => {
      const result = AI.generateFullPost(params);
      const post = Object.assign(base, {
        title: result.title, content: result.content, tags: result.tags, metaDescription: result.metaDescription,
        thumbnailPhrases: result.thumbnailPhrases, faq: result.faq, cardNews: result.cardNews,
      });
      Store.savePost(post).then((saved) => { state.posts.unshift(saved); openEditor(saved.id); toast('AI가 초안을 작성했어요'); });
    }, 650);
  }

  // ============================================================
  // 에디터 (Step2)
  // ============================================================
  function openEditor(postId) { navigate('editor', { postId }); }

  function renderEditor(main) {
    const post = state.posts.find((p) => p.id === state.viewParams.postId);
    if (!post) { main.innerHTML = `<div class="view empty-state"><div class="es-ic">📄</div><div class="es-t">글을 찾을 수 없어요</div></div>`; return; }
    state.currentPost = post;
    state.mobilePreview = false;
    const blog = getBlogById(post.blogId) || getActiveBlog() || {};
    const isFav = state.favorites.postIds.includes(post.id);

    main.innerHTML = `
    <div class="view editor-wrap">
      <div class="editor-head">
        <div style="flex:1; min-width:220px;">
          <input class="editor-title-input" id="editorTitleInput" placeholder="제목을 입력하세요" value="${escapeHtml(post.title || '')}">
          <div class="editor-meta-row">
            <span class="pill" style="background:${(blog.color || '#33456B')}22; color:${blog.color || '#33456B'}">${escapeHtml(blog.name || '')}</span>
            <span>${escapeHtml(post.category || '')}</span><span>·</span>
            <span>${PLATFORM_LABEL[post.platform] || ''}</span><span>·</span>
            <span>생성 ${fmtDate(post.createdAt)}</span>
          </div>
        </div>
        <div style="display:flex; gap:8px; align-items:center;">
          <button class="pill ${STATUS_PILL[post.status]}" id="statusToggleBtn" style="border:none; cursor:pointer;">${STATUS_LABEL[post.status]}</button>
          <button class="star-btn ${isFav ? 'on' : ''}" id="favToggleBtn" title="즐겨찾기">${isFav ? '★' : '☆'}</button>
          <button class="btn-icon" id="deletePostBtn" title="삭제">🗑</button>
        </div>
      </div>

      <div class="seg" style="align-self:flex-start;">
        <button class="seg-btn active" data-mode="edit">작성 화면</button>
        <button class="seg-btn" data-mode="preview">모바일 미리보기</button>
      </div>

      <div id="editModePane">
        ${toolbarHtml()}
        <div class="editor-surface"><div class="editor-content" id="editorContent" contenteditable="true" data-placeholder="본문을 작성해보세요…">${post.content || ''}</div></div>
      </div>
      <div id="previewModePane" class="mobile-preview-wrap" hidden></div>

      <div class="card" style="margin-top:4px;">
        <div class="section-title" style="margin-bottom:10px;">📎 메타 정보</div>
        <div class="field"><div class="field-label">해시태그</div><input class="input" id="editorTags" placeholder="#태그1, #태그2" value="${escapeHtml(post.tags || '')}"></div>
        <div class="field" style="margin-top:10px;"><div class="field-label">메타디스크립션</div><textarea class="textarea" id="editorMeta" style="min-height:60px;">${escapeHtml(post.metaDescription || '')}</textarea></div>
      </div>

      <div class="editor-footbar">
        <span><span class="autosave-dot"></span><span id="autosaveText">저장됨</span></span>
        <span id="wordCountText" class="mono">0자</span>
        <button class="btn btn-primary" id="viewFinalBtn">📋 최종본 보기</button>
      </div>
    </div>`;

    initEditorEvents(post, main);
    updateWordCount();
  }

  function toolbarHtml() {
    return `<div class="editor-toolbar" id="editorToolbar">
      <button class="tb-btn" data-cmd="h1" title="제목 1">H1</button>
      <button class="tb-btn" data-cmd="h2" title="제목 2">H2</button>
      <button class="tb-btn" data-cmd="h3" title="제목 3">H3</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" data-cmd="bold" title="굵게"><b>B</b></button>
      <button class="tb-btn" data-cmd="underline" title="밑줄"><u>U</u></button>
      <button class="tb-btn" data-cmd="strike" title="취소선"><s>S</s></button>
      <div class="tb-sep"></div>
      <button class="tb-btn" data-cmd="quote" title="인용문">❝</button>
      <button class="tb-btn" data-cmd="ul" title="글머리 목록">•≡</button>
      <button class="tb-btn" data-cmd="ol" title="번호 목록">1.≡</button>
      <button class="tb-btn" data-cmd="checklist" title="체크리스트">☑</button>
      <button class="tb-btn" data-cmd="hr" title="구분선">―</button>
      <button class="tb-btn" data-cmd="link" title="링크">🔗</button>
      <button class="tb-btn" data-cmd="table" title="표">▦</button>
      <button class="tb-btn" data-cmd="image" title="이미지 삽입">🖼️</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" data-cmd="box-tip" title="강조 박스">💡</button>
      <button class="tb-btn" data-cmd="box-info" title="정보 박스">ℹ️</button>
      <button class="tb-btn" data-cmd="box-warn" title="주의 박스">⚠️</button>
      <button class="tb-btn" data-cmd="emoji" title="이모지" id="emojiBtn">🙂</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" data-cmd="undo" title="실행취소">↺</button>
      <button class="tb-btn" data-cmd="redo" title="다시실행">↻</button>
    </div>`;
  }

  const scheduleAutosave = debounce(() => {
    const post = state.currentPost; if (!post) return;
    const titleEl = $('#editorTitleInput'); const tagsEl = $('#editorTags'); const metaEl = $('#editorMeta');
    if (titleEl) post.title = titleEl.value;
    if (tagsEl) post.tags = tagsEl.value;
    if (metaEl) post.metaDescription = metaEl.value;
    syncPostContentFromEditor();
    Store.savePost(post).then((saved) => {
      syncPostInList(saved);
      const el = $('#autosaveText'); if (el) el.textContent = '방금 저장됨';
      refreshRightPanelIfEditor();
    });
  }, 800);

  function syncPostContentFromEditor() {
    const ed = $('#editorContent');
    if (ed && state.currentPost) state.currentPost.content = ed.innerHTML;
  }
  function syncPostInList(saved) {
    const idx = state.posts.findIndex((p) => p.id === saved.id);
    if (idx >= 0) state.posts[idx] = saved;
  }
  function updateWordCount() {
    const ed = $('#editorContent'); const el = $('#wordCountText');
    if (ed && el) el.textContent = ed.innerText.replace(/\s/g, '').length + '자';
  }

  function initEditorEvents(post, main) {
    const ed = $('#editorContent', main);
    const titleInput = $('#editorTitleInput', main);
    titleInput.addEventListener('input', () => { scheduleAutosave(); });
    ed.addEventListener('input', () => { scheduleAutosave(); updateWordCount(); });
    $('#editorTags', main).addEventListener('input', scheduleAutosave);
    $('#editorMeta', main).addEventListener('input', scheduleAutosave);
    ed.addEventListener('click', (e) => {
      if (e.target.matches('.checklist input[type="checkbox"]')) {
        if (e.target.checked) e.target.setAttribute('checked', 'checked'); else e.target.removeAttribute('checked');
        scheduleAutosave();
      }
    });

    // 툴바
    const tb = $('#editorToolbar', main);
    tb.addEventListener('mousedown', (e) => { if (e.target.closest('.tb-btn')) e.preventDefault(); });
    tb.addEventListener('click', (e) => {
      const btn = e.target.closest('.tb-btn'); if (!btn) return;
      runToolbarCmd(btn.dataset.cmd, btn);
    });

    // 모드 전환
    $all('.seg-btn[data-mode]', main).forEach((b) => b.addEventListener('click', () => {
      $all('.seg-btn[data-mode]', main).forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      state.mobilePreview = b.dataset.mode === 'preview';
      $('#editModePane', main).hidden = state.mobilePreview;
      $('#previewModePane', main).hidden = !state.mobilePreview;
      if (state.mobilePreview) { syncPostContentFromEditor(); renderMobilePreview($('#previewModePane', main), state.currentPost); }
    }));

    // 상태/즐겨찾기/삭제
    $('#statusToggleBtn', main).addEventListener('click', () => {
      post.status = post.status === 'done' ? 'writing' : 'done';
      const b = $('#statusToggleBtn', main); b.className = 'pill ' + STATUS_PILL[post.status]; b.textContent = STATUS_LABEL[post.status];
      Store.savePost(post).then((saved) => { syncPostInList(saved); toast(post.status === 'done' ? '완성된 글로 표시했어요' : '작성 중으로 되돌렸어요'); });
    });
    $('#favToggleBtn', main).addEventListener('click', () => {
      Store.toggleFavoritePost(post.id).then((isFav) => {
        state.favorites.postIds = isFav ? [...state.favorites.postIds, post.id].filter((v, i, a) => a.indexOf(v) === i) : state.favorites.postIds.filter((x) => x !== post.id);
        const b = $('#favToggleBtn', main); b.classList.toggle('on', isFav); b.textContent = isFav ? '★' : '☆';
      });
    });
    $('#deletePostBtn', main).addEventListener('click', () => {
      if (!confirm('이 글을 삭제할까요? 되돌릴 수 없어요.')) return;
      Store.deletePost(post.id).then(() => { state.posts = state.posts.filter((p) => p.id !== post.id); toast('삭제했어요'); navigate('writing'); });
    });
    $('#viewFinalBtn', main).addEventListener('click', () => {
      syncPostContentFromEditor(); post.title = titleInput.value; post.tags = $('#editorTags', main).value; post.metaDescription = $('#editorMeta', main).value;
      Store.savePost(post).then((saved) => { syncPostInList(saved); openFinal(saved.id); });
    });
  }

  function runToolbarCmd(cmd, btn) {
    const ed = $('#editorContent'); if (!ed) return; ed.focus();
    switch (cmd) {
      case 'bold': document.execCommand('bold'); break;
      case 'underline': document.execCommand('underline'); break;
      case 'strike': document.execCommand('strikeThrough'); break;
      case 'h1': document.execCommand('formatBlock', false, 'H1'); break;
      case 'h2': document.execCommand('formatBlock', false, 'H2'); break;
      case 'h3': document.execCommand('formatBlock', false, 'H3'); break;
      case 'quote': document.execCommand('formatBlock', false, 'BLOCKQUOTE'); break;
      case 'ul': document.execCommand('insertUnorderedList'); break;
      case 'ol': document.execCommand('insertOrderedList'); break;
      case 'hr': document.execCommand('insertHorizontalRule'); break;
      case 'link': { const url = prompt('링크 주소를 입력하세요', 'https://'); if (url) document.execCommand('createLink', false, url); break; }
      case 'checklist': document.execCommand('insertHTML', false, '<ul class="checklist"><li><input type="checkbox"> 할 일을 입력하세요</li><li><input type="checkbox"> 할 일을 입력하세요</li></ul><p><br></p>'); break;
      case 'table': document.execCommand('insertHTML', false, '<table><tr><th>구분</th><th>항목 1</th><th>항목 2</th></tr><tr><td>내용</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>내용</td><td>&nbsp;</td><td>&nbsp;</td></tr></table><p><br></p>'); break;
      case 'box-tip': document.execCommand('insertHTML', false, '<div class="box box-tip"><b>💡 강조</b><br>내용을 입력하세요.</div><p><br></p>'); break;
      case 'box-info': document.execCommand('insertHTML', false, '<div class="box box-info"><b>ℹ️ 정보</b><br>내용을 입력하세요.</div><p><br></p>'); break;
      case 'box-warn': document.execCommand('insertHTML', false, '<div class="box box-warn"><b>⚠️ 주의</b><br>내용을 입력하세요.</div><p><br></p>'); break;
      case 'emoji': toggleEmojiPopover(btn); return;
      case 'image': openImageModal(state.currentPost); return;
      case 'undo': document.execCommand('undo'); break;
      case 'redo': document.execCommand('redo'); break;
    }
    scheduleAutosave(); updateWordCount();
  }

  // ---------------- 이미지 삽입 ----------------
  function openImageModal(post) {
    if (!post) return;
    savedRange = null;
    const sel = window.getSelection();
    const ed = $('#editorContent');
    if (sel && sel.rangeCount && ed && ed.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      savedRange = sel.getRangeAt(0).cloneRange();
    }
    const query = (post.mainKeyword || post.title || '').trim() || '블로그';

    openModal(`
      <div class="modal-head"><h3>🖼️ 이미지 삽입</h3><button class="btn-icon" id="modalCloseBtn">✕</button></div>
      <div class="modal-body">
        <div class="seg" style="margin-bottom:14px;">
          <button type="button" class="seg-btn active" data-imgtab="suggest">무료 이미지 추천</button>
          <button type="button" class="seg-btn" data-imgtab="upload">내 사진 업로드</button>
        </div>
        <div id="imgTabSuggest">
          <div class="field-hint" style="margin-bottom:10px;">"${escapeHtml(query)}" 관련 이미지를 추천해드려요. 설정에서 이미지 API 키를 연결하면 실제 검색 결과로 자동 전환돼요.</div>
          <div class="img-suggest-grid" id="imgSuggestGrid"><div class="faint" style="padding:24px; text-align:center; grid-column:1/-1;">불러오는 중…</div></div>
        </div>
        <div id="imgTabUpload" hidden>
          <div class="field-hint" style="margin-bottom:10px;">내 컴퓨터에 있는 사진을 업로드해서 바로 삽입할 수 있어요.</div>
          <input type="file" class="input" id="imgUploadInput" accept="image/*">
        </div>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" id="modalCancelBtn">닫기</button></div>
    `, { large: true });

    $('#modalCloseBtn').addEventListener('click', closeModal);
    $('#modalCancelBtn').addEventListener('click', closeModal);
    $all('.seg-btn[data-imgtab]').forEach((b) => b.addEventListener('click', () => {
      $all('.seg-btn[data-imgtab]').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      $('#imgTabSuggest').hidden = b.dataset.imgtab !== 'suggest';
      $('#imgTabUpload').hidden = b.dataset.imgtab !== 'upload';
    }));

    Store.getImageApiKey().then((key) => {
      Integrations.searchFreeImages(query, key, 6).then((res) => {
        const grid = $('#imgSuggestGrid'); if (!grid) return;
        grid.innerHTML = res.images.map((img, i) => `
          <button type="button" class="img-suggest-item" data-img-idx="${i}">
            <img src="${img.url}" alt="${escapeHtml(img.alt || '')}">
            <span class="img-suggest-badge">${res.source === 'live' ? '실시간 검색' : '자동 생성'}</span>
          </button>`).join('');
        grid.querySelectorAll('[data-img-idx]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const img = res.images[+btn.dataset.imgIdx];
            insertImageIntoEditor(img.url, img.alt || query, img.credit);
            closeModal();
          });
        });
      });
    });

    $('#imgUploadInput').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        insertImageIntoEditor(reader.result, file.name.replace(/\.[a-zA-Z0-9]+$/, ''), '');
        closeModal();
      };
      reader.readAsDataURL(file);
    });
  }

  function insertImageIntoEditor(url, alt, credit) {
    const ed = $('#editorContent'); if (!ed) return;
    ed.focus();
    if (savedRange) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange); }
    const capText = credit ? `${alt || ''} · ${credit}` : (alt || '');
    const capHtml = capText ? `<figcaption>${escapeHtml(capText)}</figcaption>` : '';
    const html = `<figure class="post-image"><img src="${url}" alt="${escapeHtml(alt || '')}">${capHtml}</figure><p><br></p>`;
    document.execCommand('insertHTML', false, html);
    scheduleAutosave(); updateWordCount();
    toast('이미지를 삽입했어요');
  }

  let emojiPopEl = null; let savedRange = null;
  function toggleEmojiPopover(btn) {
    if (emojiPopEl) { closeEmojiPopover(); return; }
    const sel = window.getSelection(); if (sel && sel.rangeCount) savedRange = sel.getRangeAt(0).cloneRange();
    const pop = document.createElement('div'); pop.className = 'emoji-pop';
    pop.innerHTML = EMOJI_LIST.map((e) => `<button type="button">${e}</button>`).join('');
    const rect = btn.getBoundingClientRect();
    pop.style.top = (rect.bottom + window.scrollY + 4) + 'px';
    pop.style.left = Math.min(rect.left + window.scrollX, window.innerWidth - 280) + 'px';
    document.body.appendChild(pop);
    emojiPopEl = pop;
    pop.addEventListener('mousedown', (e) => e.preventDefault());
    pop.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const ed = $('#editorContent'); ed.focus();
      if (savedRange) { const sel2 = window.getSelection(); sel2.removeAllRanges(); sel2.addRange(savedRange); }
      document.execCommand('insertText', false, b.textContent);
      scheduleAutosave(); closeEmojiPopover();
    });
  }
  function closeEmojiPopover() { if (emojiPopEl) { emojiPopEl.remove(); emojiPopEl = null; } }

  function renderMobilePreview(container, post) {
    const clone = document.createElement('div');
    clone.innerHTML = post.content || '<p>아직 작성된 내용이 없어요.</p>';
    clone.querySelectorAll('p').forEach((p) => { if (p.textContent.trim().length > 110) p.classList.add('long-para'); });
    const blog = getBlogById(post.blogId) || {};
    container.innerHTML = `<div class="mobile-frame">
      <div class="mobile-frame-bar"></div>
      <div class="mobile-frame-app">${escapeHtml(blog.name || '블로그')} · 모바일 미리보기</div>
      <div class="mobile-frame-body"><h1>${escapeHtml(post.title || '(제목 없음)')}</h1>${clone.innerHTML}</div>
    </div>`;
  }

  // ============================================================
  // 오른쪽 패널 — SEO 분석 / AI 도구
  // ============================================================
  function renderRightPanel() {
    const panel = $('#rightPanel');
    panel.innerHTML = `
      <div class="tabbar">
        <button class="tab-btn ${state.rightTab === 'seo' ? 'active' : ''}" data-tab="seo">🔍 SEO 분석</button>
        <button class="tab-btn ${state.rightTab === 'ai' ? 'active' : ''}" data-tab="ai">✨ AI 도구</button>
      </div>
      <div id="rightPanelBody"></div>`;
    panel.onclick = onRightPanelClick;
    renderRightPanelBody();
  }
  function renderRightPanelBody() {
    const body = $('#rightPanelBody'); if (!body) return;
    body.innerHTML = state.rightTab === 'seo' ? renderSeoTab() : renderAiTab();
    $all('.tab-btn[data-tab]', $('#rightPanel')).forEach((b) => b.classList.toggle('active', b.dataset.tab === state.rightTab));
  }

  function onRightPanelClick(e) {
    const tabBtn = e.target.closest('.tab-btn[data-tab]');
    if (tabBtn) { state.rightTab = tabBtn.dataset.tab; renderRightPanelBody(); return; }

    const aiBtn = e.target.closest('.ai-btn[data-action]');
    if (aiBtn) { handleAiAction(aiBtn.dataset.action); return; }

    const genBtn = e.target.closest('[data-gen]');
    if (genBtn) { runGenerator(genBtn.dataset.gen); return; }

    const cardNewsToggle = e.target.closest('#cardNewsToggle');
    if (cardNewsToggle) { toggleCardNewsOption(); return; }

    const copyAllTags = e.target.closest('#copyAllTagsBtn');
    if (copyAllTags) { copyText((state.hashtagResult || []).join(' ')); return; }
    const copyCoreTags = e.target.closest('#copyCoreTagsBtn');
    if (copyCoreTags) { copyText((state.hashtagResult || []).slice(0, 8).join(' ')); return; }

    const titleCopy = e.target.closest('[data-title-idx]');
    if (titleCopy) { const t = state.titleFlat[+titleCopy.dataset.titleIdx]; if (t) copyText(t.text); return; }
    const titleFav = e.target.closest('[data-title-fav-idx]');
    if (titleFav) {
      const t = state.titleFlat[+titleFav.dataset.titleFavIdx]; if (!t) return;
      Store.toggleFavoriteTitle(t.text).then((isFav) => {
        const dbData = JSON.parse(localStorage.getItem('bcs_data_v2') || '{}');
        state.favorites.titles = (dbData.favorites || {}).titles || [];
        renderRightPanelBody();
      });
      return;
    }
    const thumbCopy = e.target.closest('[data-thumb-idx]');
    if (thumbCopy) { const t = (state.thumbResult || [])[+thumbCopy.dataset.thumbIdx]; if (t) copyText(t); return; }
  }

  function refreshRightPanelIfEditor() { if (state.view === 'editor') renderRightPanelBody(); }

  function renderSeoTab() {
    const post = state.currentPost; if (!post) return '';
    syncPostContentFromEditor();
    const analysis = SEO.analyze(post);
    post.seoScore = analysis.score;
    const C = 2 * Math.PI * 29;
    const dash = (analysis.score / 100) * C;
    const groupLabels = { title: '제목', body: '본문', structure: '구성', content: '콘텐츠', readability: '가독성' };
    const iconFor = { good: '✓', warn: '!', improve: '✕' };

    let html = `
    <div class="seo-score-card">
      <div class="score-ring">
        <svg viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="29"></circle>
          <circle class="fg" cx="32" cy="32" r="29" stroke-dasharray="${dash} ${C}"></circle></svg>
        <div class="num mono">${analysis.score}</div>
      </div>
      <div><div class="score-label">SEO 점수</div><div class="page-title" style="font-size:20px;">${analysis.score} <span class="faint" style="font-size:13px; font-weight:400;">/ 100</span></div>
      <div class="score-desc">${analysis.score >= 80 ? '아주 좋아요!' : analysis.score >= 60 ? '조금만 더 다듬어보세요' : '보완이 필요해요'}</div></div>
    </div>`;

    Object.keys(groupLabels).forEach((key) => {
      const items = analysis.groups[key];
      if (!items || !items.length) return;
      html += `<div class="check-group"><div class="check-group-title">${groupLabels[key]}</div>`;
      items.forEach((it) => { html += `<div class="check-item ${it.status}"><span class="cico">${iconFor[it.status]}</span><span class="ctext">${escapeHtml(it.text)}</span></div>`; });
      html += `</div>`;
    });

    if (analysis.kwRows.length) {
      html += `<div class="check-group"><div class="check-group-title">키워드 분석</div>
      <table class="kw-table"><thead><tr><th>키워드</th><th>등장</th><th>제목</th><th>소제목</th><th>밀도</th></tr></thead><tbody>
      ${analysis.kwRows.map((r) => `<tr>
        <td>${escapeHtml(r.keyword)}${r.isMain ? ' <span class="faint">(메인)</span>' : ''}</td>
        <td class="mono">${r.count}</td>
        <td>${r.inTitle ? '✓' : '—'}</td>
        <td>${r.inHeading ? '✓' : '—'}</td>
        <td class="kw-density ${r.warn ? 'warn' : 'good'}">${r.density.toFixed(1)}%</td>
      </tr>`).join('')}
      </tbody></table></div>`;
    }
    return html;
  }

  function renderAiTab() {
    const post = state.currentPost; if (!post) return '';
    const selNote = `<div class="ai-selection-note" id="aiSelNote">본문에서 문장을 선택하면 그 부분에만 적용돼요.</div>`;
    let html = `<div class="panel-title">✨ AI 글쓰기 도우미</div>${selNote}
      <div class="ai-btn-grid">
        ${AI_ACTIONS.map((a) => `<button type="button" class="ai-btn" data-action="${a.action}" title="${a.scope === '선택' ? '선택한 문장에 적용' : '글 전체에 적용'}">${a.label}</button>`).join('')}
      </div>`;

    // 제목 생성기
    html += `<div class="check-group" id="titleGenSection">
      <div class="section-head"><div class="check-group-title" style="margin:0;">제목 생성기</div><button class="btn btn-secondary btn-sm" data-gen="titles">10개 생성</button></div>`;
    if (state.titleGenResult) {
      const cats = { seo: 'SEO형', click: '클릭 유도형', natural: '자연스러운 제목', mz: 'MZ형', question: '질문형' };
      Object.keys(cats).forEach((k) => {
        html += `<div class="title-cat"><div class="title-cat-name">${cats[k]}</div>`;
        state.titleGenResult[k].forEach((t) => {
          const idx = state.titleFlat.findIndex((x) => x.text === t && x.cat === k);
          const isFav = state.favorites.titles.includes(t);
          html += `<div class="title-row"><span class="tt">${escapeHtml(t)}</span><span class="tact">
            <button class="btn-icon btn-sm" data-title-idx="${idx}" title="복사">📋</button>
            <button class="btn-icon btn-sm" data-title-fav-idx="${idx}" title="즐겨찾기" style="${isFav ? 'color:var(--warning);' : ''}">${isFav ? '★' : '☆'}</button>
          </span></div>`;
        });
        html += `</div>`;
      });
    } else html += `<div class="faint" style="font-size:12px; padding:8px 2px;">버튼을 눌러 제목 10개를 만들어보세요.</div>`;
    html += `</div>`;

    // 해시태그 생성기
    html += `<div class="check-group" id="hashtagGenSection">
      <div class="section-head"><div class="check-group-title" style="margin:0;">해시태그 생성기</div><button class="btn btn-secondary btn-sm" data-gen="hashtags">생성</button></div>`;
    if (state.hashtagResult && state.hashtagResult.length) {
      html += `<div class="hashtag-box">${state.hashtagResult.map((t) => `<span class="hashtag-chip">${escapeHtml(t)}</span>`).join('')}</div>
      <div style="display:flex; gap:8px;"><button class="btn btn-secondary btn-sm" id="copyAllTagsBtn">전체 복사</button><button class="btn btn-secondary btn-sm" id="copyCoreTagsBtn">SEO 핵심 태그만</button></div>`;
    } else html += `<div class="faint" style="font-size:12px; padding:8px 2px;">20~30개의 해시태그를 만들어보세요.</div>`;
    html += `</div>`;

    // 썸네일 문구
    html += `<div class="check-group" id="thumbGenSection">
      <div class="section-head"><div class="check-group-title" style="margin:0;">썸네일 문구</div><button class="btn btn-secondary btn-sm" data-gen="thumb">생성</button></div>`;
    if (state.thumbResult && state.thumbResult.length) {
      html += `<div class="thumb-phrase-list">${state.thumbResult.map((t, i) => `<div class="thumb-phrase"><span>${escapeHtml(t)}</span><button class="btn-icon btn-sm" data-thumb-idx="${i}" title="복사">📋</button></div>`).join('')}</div>`;
    } else html += `<div class="faint" style="font-size:12px; padding:8px 2px;">썸네일용 짧은 문구를 제안받아보세요.</div>`;
    html += `</div>`;

    // 카드뉴스
    const cardOn = !!(post.options && post.options.cardnews);
    html += `<div class="check-group" id="cardNewsSection">
      <div class="section-head"><div class="check-group-title" style="margin:0;">카드뉴스 구성안</div><button type="button" class="toggle ${cardOn ? 'on' : ''}" id="cardNewsToggle"></button></div>`;
    if (cardOn) {
      html += `<button class="btn btn-secondary btn-sm" data-gen="cardnews" style="margin-bottom:10px;">카드뉴스 이미지 생성 (8~10장)</button>`;
      if (state.cardNewsResult && state.cardNewsResult.length) {
        const blog = getBlogById(post.blogId) || getActiveBlog() || {};
        const total = state.cardNewsResult.length;
        html += `<div class="field-hint" style="margin-bottom:10px;">이미지를 우클릭(모바일은 길게 누르기) → '이미지 저장'으로 바로 다운로드할 수 있어요.</div>`;
        html += `<div class="card-news-grid">` + state.cardNewsResult.map((s) => {
          const svg = Icons.buildCardSvg({ heading: s.heading, body: s.body, no: s.no, total, keyword: post.mainKeyword || post.title, blogColor: blog.color });
          const uri = Icons.toDataUri(svg);
          return `<div class="card-news-slide">
            <img class="cn-img" src="${uri}" alt="${escapeHtml(s.heading)} 카드뉴스 이미지 ${s.no}번" draggable="false">
            <div class="cn-cap"><span class="cn-no mono">SLIDE ${s.no}</span><span class="cn-h">${escapeHtml(s.heading)}</span></div>
          </div>`;
        }).join('') + `</div>`;
      }
    } else html += `<div class="faint" style="font-size:12px; padding:4px 2px 8px;">기본적으로 꺼져 있어요. 필요할 때만 켜서 사용해보세요.</div>`;
    html += `</div>`;

    return html;
  }

  function handleAiAction(action) {
    const post = state.currentPost; if (!post) return;
    syncPostContentFromEditor();
    const params = paramsFromPost(post);
    const selectionModes = { natural: 'natural', mz: 'mz', expert: 'expert', simple: 'simple', elaborate: 'elaborate', shorten: 'shorten', seo: 'seo', fixSpelling: 'fixSpelling' };
    const ed = $('#editorContent');

    if (selectionModes[action]) {
      const sel = window.getSelection();
      const text = sel ? sel.toString() : '';
      if (!text || !sel.rangeCount || !ed.contains(sel.getRangeAt(0).commonAncestorContainer)) { toast('먼저 본문에서 문장을 선택해주세요'); return; }
      const out = AI.rewriteSelection(text, selectionModes[action], params);
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(out));
      sel.removeAllRanges();
      scheduleAutosave(); updateWordCount();
      toast('선택한 문장을 반영했어요');
      return;
    }

    switch (action) {
      case 'full':
        if (!confirm('현재 본문을 AI가 새로 작성한 내용으로 덮어씁니다. 계속할까요?')) return;
        { const r = AI.generateFullPost(params); ed.innerHTML = r.content; if (!post.title) post.title = r.title; toast('전체 글을 새로 작성했어요'); }
        break;
      case 'continue':
        ed.insertAdjacentHTML('beforeend', AI.continueWriting(post.content, params)); toast('이어서 작성했어요'); break;
      case 'subheadings': {
        const heads = AI.generateSubheadings(params, 3);
        ed.insertAdjacentHTML('beforeend', heads.map((h) => `<h2>${escapeHtml(h)}</h2><p>내용을 이어서 작성해보세요.</p>`).join(''));
        toast('소제목을 추가했어요'); break;
      }
      case 'titles': case 'clickTitles': runGenerator('titles'); return;
      case 'faq': {
        const faqs = AI.generateFAQ(params, 3);
        ed.insertAdjacentHTML('beforeend', '<h2>자주 묻는 질문</h2>' + faqs.map((f) => `<div class="box box-info"><b>Q. ${escapeHtml(f.q)}</b><br>${escapeHtml(f.a)}</div>`).join(''));
        toast('FAQ를 추가했어요'); break;
      }
      case 'cta':
        ed.insertAdjacentHTML('beforeend', `<div class="box box-tip">${escapeHtml(AI.generateCTA(params.blog, params))}</div>`);
        toast('CTA를 추가했어요'); break;
      case 'hashtags': runGenerator('hashtags'); return;
    }
    scheduleAutosave(); updateWordCount();
  }

  function runGenerator(kind) {
    const post = state.currentPost; if (!post) return;
    syncPostContentFromEditor();
    const params = paramsFromPost(post);
    if (kind === 'titles') {
      const cats = AI.generateTitles(params, 10);
      state.titleGenResult = cats;
      state.titleFlat = [];
      Object.keys(cats).forEach((k) => cats[k].forEach((t) => state.titleFlat.push({ cat: k, text: t })));
      toast('제목 10개를 만들었어요');
    } else if (kind === 'hashtags') {
      state.hashtagResult = AI.generateHashtags(params, 26);
      post.tags = state.hashtagResult.join(', ');
      const tagsEl = $('#editorTags'); if (tagsEl) tagsEl.value = post.tags;
      scheduleAutosave();
      toast('해시태그를 만들었어요');
    } else if (kind === 'thumb') {
      state.thumbResult = AI.generateThumbnailPhrases(params, 6);
      toast('썸네일 문구를 만들었어요');
    } else if (kind === 'cardnews') {
      state.cardNewsResult = AI.generateCardNews(post, 9);
      post.cardNews = state.cardNewsResult; scheduleAutosave();
      toast('카드뉴스 구성안을 만들었어요');
    }
    renderRightPanelBody();
  }

  function toggleCardNewsOption() {
    const post = state.currentPost; if (!post) return;
    post.options = post.options || {};
    post.options.cardnews = !post.options.cardnews;
    scheduleAutosave();
    renderRightPanelBody();
  }

  // ============================================================
  // 글 목록 (작성 중 / 완성됨)
  // ============================================================
  function renderPostList(main, status) {
    const title = status === 'writing' ? '📚 작성 중인 글' : '✅ 완성된 글';
    main.innerHTML = `
    <div class="view">
      <div class="page-title">${title}</div>
      <div class="post-toolbar" style="margin-top:16px;">
        <select class="select" id="plBlogFilter" style="max-width:200px;"><option value="">모든 블로그</option>${state.blogs.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}</select>
        <select class="select" id="plSort" style="max-width:160px;"><option value="new">최신순</option><option value="old">오래된순</option></select>
        <span class="faint" style="margin-left:auto;" id="plCount"></span>
      </div>
      <div class="post-grid" id="plGrid" style="margin-top:16px;"></div>
    </div>`;
    const renderGrid = () => {
      const blogFilter = $('#plBlogFilter').value; const sort = $('#plSort').value;
      let list = state.posts.filter((p) => p.status === status);
      if (blogFilter) list = list.filter((p) => p.blogId === blogFilter);
      list = list.sort((a, b) => sort === 'old' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt);
      $('#plCount').textContent = `총 ${list.length}개`;
      $('#plGrid').innerHTML = list.length ? list.map(postCardHtml).join('') : emptyStateHtml('📄', status === 'writing' ? '작성 중인 글이 없어요' : '완성된 글이 없어요', '새 글 작성을 눌러 첫 콘텐츠를 만들어보세요.');
      bindPostCardEvents($('#plGrid'));
    };
    $('#plBlogFilter').addEventListener('change', renderGrid);
    $('#plSort').addEventListener('change', renderGrid);
    renderGrid();
  }
  function emptyStateHtml(icon, title, desc) {
    return `<div class="empty-state" style="grid-column:1/-1;"><div class="es-ic">${icon}</div><div class="es-t">${escapeHtml(title)}</div><div class="es-d">${escapeHtml(desc)}</div></div>`;
  }
  function postCardHtml(p) {
    const blog = getBlogById(p.blogId) || {};
    const isFav = state.favorites.postIds.includes(p.id);
    const excerpt = SEO.plainText(p.content || '').slice(0, 70);
    const tags = (p.tags || '').split(/[, ]+/).filter(Boolean).slice(0, 3);
    return `<div class="post-card" data-open="${p.id}">
      <div class="pc-actions"><button class="star-btn ${isFav ? 'on' : ''}" data-fav="${p.id}">${isFav ? '★' : '☆'}</button></div>
      <div class="pc-top"><span class="pill" style="background:${(blog.color || '#33456B')}22; color:${blog.color || '#33456B'}">${escapeHtml(blog.name || '')}</span></div>
      <div class="pc-title">${escapeHtml(p.title || '(제목 없음)')}</div>
      <div class="pc-excerpt">${escapeHtml(excerpt || '아직 작성된 내용이 없어요')}</div>
      <div class="pc-meta"><span>${escapeHtml(p.category || '')}</span><span>·</span><span>${fmtRelative(p.updatedAt)}</span>${p.source ? `<span>·</span><span title="글이 들어온 경로">출처: ${escapeHtml(SOURCE_LABEL[p.source] || p.source)}</span>` : ''}${p.status === 'done' ? `<span>·</span><span>SEO ${p.seoScore || 0}점</span>` : ''}</div>
      ${p.platform === 'tistory' ? publishBoxHtml(p) : ''}
      <div class="pc-footer">
        <div class="pc-tags">${tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join('')}</div>
        <button class="btn-icon btn-sm" data-del="${p.id}" title="삭제">🗑</button>
      </div>
    </div>`;
  }
  const SOURCE_LABEL = { 'chatgpt-email': 'ChatGPT(메일)', claude: 'Claude 생성', paste: '붙여넣기', chatgpt: 'ChatGPT', test: '시험' };
  const PUBLISH_STATE_LABEL = { drafted: '📝 티스토리 임시저장됨', published: '✅ 티스토리 발행됨', failed: '⚠️ 업로드 실패' };
  function publishBoxHtml(p) {
    const mode = p.publishMode === 'public' ? 'public' : 'draft';
    return `<div class="pc-publish" data-pub>
      <select data-pub-mode="${p.id}"><option value="draft" ${mode === 'draft' ? 'selected' : ''}>임시저장</option><option value="public" ${mode === 'public' ? 'selected' : ''}>공개 발행</option></select>
      <label><input type="checkbox" data-pub-queue="${p.id}" ${p.queued ? 'checked' : ''}> 예약 대기</label>
      <span class="pc-pubstate">${PUBLISH_STATE_LABEL[p.publishState] || ''}</span>
    </div>`;
  }
  function savePublishSetting(id, patch) {
    const post = state.posts.find((x) => x.id === id);
    if (!post) return;
    Object.assign(post, patch);
    Store.savePost(post).then(() => toast('발행 설정을 저장했어요'));
  }
  function bindPostCardEvents(root) {
    $all('[data-pub-mode]', root).forEach((el) => el.addEventListener('change', () => savePublishSetting(el.dataset.pubMode, { publishMode: el.value })));
    $all('[data-pub-queue]', root).forEach((el) => el.addEventListener('change', () => savePublishSetting(el.dataset.pubQueue, { queued: el.checked })));
    $all('[data-open]', root).forEach((c) => c.addEventListener('click', (e) => { if (e.target.closest('[data-fav],[data-del],[data-pub]')) return; openEditor(c.dataset.open); }));
    $all('[data-fav]', root).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      Store.toggleFavoritePost(b.dataset.fav).then((isFav) => {
        state.favorites.postIds = isFav ? [...state.favorites.postIds, b.dataset.fav] : state.favorites.postIds.filter((x) => x !== b.dataset.fav);
        b.classList.toggle('on', isFav); b.textContent = isFav ? '★' : '☆';
      });
    }));
    $all('[data-del]', root).forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm('이 글을 삭제할까요?')) return;
      Store.deletePost(b.dataset.del).then(() => { state.posts = state.posts.filter((p) => p.id !== b.dataset.del); renderApp(); toast('삭제했어요'); });
    }));
  }

  // ============================================================
  // 검색
  // ============================================================
  function renderSearch(main) {
    const q = state.searchQuery.toLowerCase();
    const results = state.posts.filter((p) => [p.title, p.mainKeyword, p.subKeywords, p.tags, p.category].filter(Boolean).join(' ').toLowerCase().includes(q));
    main.innerHTML = `<div class="view"><div class="page-title">🔍 "${escapeHtml(state.searchQuery)}" 검색 결과</div>
    <div class="page-sub">${results.length}개의 글을 찾았어요</div>
    <div class="post-grid" style="margin-top:20px;">${results.length ? results.map(postCardHtml).join('') : emptyStateHtml('🔍', '검색 결과가 없어요', '다른 키워드로 다시 검색해보세요.')}</div></div>`;
    bindPostCardEvents(main);
  }

  // ============================================================
  // 콘텐츠 아이디어
  // ============================================================
  function renderIdeas(main) {
    main.innerHTML = `
    <div class="view">
      <div class="page-title">💡 콘텐츠 아이디어</div>
      <div class="page-sub">카테고리를 고르고 아이디어를 생성해보세요.</div>
      <div class="post-toolbar" style="margin-top:16px;">
        <div class="chip-group" id="ideaCatGroup">
          <button type="button" class="chip ${state.ideaCategory === '전체' ? 'selected' : ''}" data-cat="전체">전체</button>
          ${POST_TYPES.map((t) => `<button type="button" class="chip ${state.ideaCategory === t ? 'selected' : ''}" data-cat="${t}">${t}</button>`).join('')}
        </div>
      </div>
      <div style="display:flex; gap:8px; margin:14px 0;">
        <button class="btn btn-primary" id="genIdeaBtn">✨ 아이디어 생성</button>
        <button class="btn btn-secondary" id="addIdeaBtn">＋ 직접 추가</button>
      </div>
      <div class="idea-grid" id="ideaGrid"></div>
    </div>`;
    const renderGrid = () => {
      const list = state.ideaCategory === '전체' ? state.ideas : state.ideas.filter((i) => i.category === state.ideaCategory);
      $('#ideaGrid').innerHTML = list.length ? list.map(ideaCardHtml).join('') : emptyStateHtml('💡', '아이디어가 없어요', '아이디어 생성 버튼을 눌러보세요.');
      bindIdeaCardEvents($('#ideaGrid'));
    };
    $all('#ideaCatGroup .chip', main).forEach((c) => c.addEventListener('click', () => {
      state.ideaCategory = c.dataset.cat;
      $all('#ideaCatGroup .chip', main).forEach((x) => x.classList.toggle('selected', x === c));
      renderGrid();
    }));
    $('#genIdeaBtn').addEventListener('click', () => {
      const cat = state.ideaCategory === '전체' ? guessPostType((getActiveBlog() || {}).category) : state.ideaCategory;
      const fresh = AI.generateIdeas(cat, getActiveBlog(), 6);
      Promise.all(fresh.map((i) => Store.saveIdea(i))).then((saved) => { state.ideas = [...saved, ...state.ideas]; renderGrid(); toast('아이디어 6개를 만들었어요'); });
    });
    $('#addIdeaBtn').addEventListener('click', () => openIdeaModal());
    renderGrid();
  }
  function ideaCardHtml(i) {
    const blog = getBlogById(i.blogId) || {};
    const isFav = state.favorites.ideaIds.includes(i.id);
    return `<div class="idea-card">
      <div class="pc-top"><span class="pill" style="background:${(blog.color || '#33456B')}22; color:${blog.color || '#33456B'}">${escapeHtml(blog.name || '전체')}</span><button class="star-btn ${isFav ? 'on' : ''}" data-idea-fav="${i.id}">${isFav ? '★' : '☆'}</button></div>
      <div class="ic-title">${escapeHtml(i.title)}</div>
      <div class="idea-kv"><b>메인 키워드</b><span>${escapeHtml(i.mainKeyword || '-')}</span></div>
      <div class="idea-kv"><b>서브 키워드</b><span>${escapeHtml(i.subKeywords || '-')}</span></div>
      <div class="idea-kv"><b>검색 의도</b><span>${escapeHtml(i.intent || '-')}</span></div>
      <div class="idea-kv"><b>글 방향</b><span>${escapeHtml(i.direction || '-')}</span></div>
      <div class="idea-kv"><b>업로드 시기</b><span>${escapeHtml(i.uploadTiming || '-')}</span></div>
      <div class="ic-foot">
        <button class="btn-icon btn-sm" data-idea-del="${i.id}" title="삭제">🗑</button>
        <button class="btn btn-primary btn-sm" data-idea-write="${i.id}">이 주제로 글쓰기</button>
      </div>
    </div>`;
  }
  function bindIdeaCardEvents(root) {
    $all('[data-idea-write]', root).forEach((b) => b.addEventListener('click', () => startPostFromIdea(b.dataset.ideaWrite)));
    $all('[data-idea-fav]', root).forEach((b) => b.addEventListener('click', () => {
      Store.toggleFavoriteIdea(b.dataset.ideaFav).then((isFav) => {
        state.favorites.ideaIds = isFav ? [...state.favorites.ideaIds, b.dataset.ideaFav] : state.favorites.ideaIds.filter((x) => x !== b.dataset.ideaFav);
        b.classList.toggle('on', isFav); b.textContent = isFav ? '★' : '☆';
      });
    }));
    $all('[data-idea-del]', root).forEach((b) => b.addEventListener('click', () => {
      if (!confirm('이 아이디어를 삭제할까요?')) return;
      Store.deleteIdea(b.dataset.ideaDel).then(() => { state.ideas = state.ideas.filter((i) => i.id !== b.dataset.ideaDel); renderApp(); });
    }));
  }
  function openIdeaModal() {
    openModal(`
      <div class="modal-head"><h3>💡 아이디어 직접 추가</h3><button class="btn-icon" id="modalCloseBtn">✕</button></div>
      <div class="modal-body">
        <div class="field"><div class="field-label">카테고리</div><select class="select" id="imCat">${POST_TYPES.map((t) => `<option>${t}</option>`).join('')}</select></div>
        <div class="field"><div class="field-label">추천 제목</div><input class="input" id="imTitle"></div>
        <div class="field-row">
          <div class="field"><div class="field-label">메인 키워드</div><input class="input" id="imMainKw"></div>
          <div class="field"><div class="field-label">서브 키워드</div><input class="input" id="imSubKw"></div>
        </div>
        <div class="field"><div class="field-label">검색 의도</div><input class="input" id="imIntent"></div>
        <div class="field"><div class="field-label">글 방향</div><input class="input" id="imDirection"></div>
        <div class="field"><div class="field-label">추천 업로드 시기</div><input class="input" id="imTiming" placeholder="예: 상시 / 월초 / 시즌 시작 전"></div>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="imSaveBtn">추가하기</button></div>
    `, {
      onMount: () => {
        $('#modalCloseBtn').addEventListener('click', closeModal);
        $('#modalCancelBtn').addEventListener('click', closeModal);
        $('#imSaveBtn').addEventListener('click', () => {
          const title = $('#imTitle').value.trim(); if (!title) { toast('제목을 입력해주세요'); return; }
          const idea = { blogId: state.activeBlogId, category: $('#imCat').value, title, mainKeyword: $('#imMainKw').value.trim(), subKeywords: $('#imSubKw').value.trim(), intent: $('#imIntent').value.trim(), direction: $('#imDirection').value.trim(), uploadTiming: $('#imTiming').value.trim() };
          Store.saveIdea(idea).then((saved) => { state.ideas.unshift(saved); closeModal(); renderApp(); toast('아이디어를 추가했어요'); });
        });
      },
    });
  }

  // ============================================================
  // 콘텐츠 캘린더
  // ============================================================
  function renderCalendar(main) {
    const cursor = state.calendarCursor;
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevDays = new Date(y, m, 0).getDate();
    const todayStr = Store.dateStr(new Date());

    const cells = [];
    for (let i = 0; i < startDow; i++) cells.push({ day: prevDays - startDow + 1 + i, outside: true, date: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, outside: false, date: dateStr, today: dateStr === todayStr });
    }
    while (cells.length % 7 !== 0) cells.push({ day: cells.length, outside: true, date: null });

    main.innerHTML = `
    <div class="view">
      <div class="page-title">📅 콘텐츠 캘린더</div>
      <div class="cal-head" style="margin-top:16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <button class="btn-icon" id="calPrev">‹</button>
          <div class="section-title" style="font-size:16px;">${y}년 ${m + 1}월</div>
          <button class="btn-icon" id="calNext">›</button>
          <button class="btn btn-secondary btn-sm" id="calToday">오늘</button>
        </div>
        <button class="btn btn-primary btn-sm" id="calAddBtn">＋ 일정 추가</button>
      </div>
      <div class="cal-grid" style="margin-top:14px;">
        ${['일', '월', '화', '수', '목', '금', '토'].map((d) => `<div class="cal-dow">${d}</div>`).join('')}
        ${cells.map((c) => calCellHtml(c)).join('')}
      </div>
    </div>`;

    $('#calPrev').addEventListener('click', () => { state.calendarCursor = new Date(y, m - 1, 1); renderApp(); });
    $('#calNext').addEventListener('click', () => { state.calendarCursor = new Date(y, m + 1, 1); renderApp(); });
    $('#calToday').addEventListener('click', () => { state.calendarCursor = new Date(); renderApp(); });
    $('#calAddBtn').addEventListener('click', () => openCalEntryModal(todayStr));

    $all('.cal-cell[data-date]', main).forEach((cell) => {
      cell.addEventListener('click', (e) => { if (e.target.closest('.cal-entry')) return; openCalEntryModal(cell.dataset.date); });
      cell.addEventListener('dragover', (e) => { e.preventDefault(); cell.classList.add('drag-over'); });
      cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
      cell.addEventListener('drop', (e) => {
        e.preventDefault(); cell.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const entry = state.calendar.find((c) => c.id === id); if (!entry) return;
        entry.date = cell.dataset.date;
        Store.saveCalendarEntry(entry).then(() => renderApp());
      });
    });
    $all('.cal-entry[data-entry]', main).forEach((el) => {
      el.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', el.dataset.entry));
      el.addEventListener('click', (e) => { e.stopPropagation(); openCalEntryModal(null, el.dataset.entry); });
    });
  }
  function calCellHtml(c) {
    if (c.outside) return `<div class="cal-cell outside"><div class="cal-daynum">${c.day}</div></div>`;
    const entries = state.calendar.filter((e) => e.date === c.date);
    return `<div class="cal-cell ${c.today ? 'today' : ''}" data-date="${c.date}">
      <div class="cal-daynum">${c.day}</div>
      ${entries.map((e) => {
        const label = e.postId ? ((state.posts.find((p) => p.id === e.postId) || {}).title) : ((state.ideas.find((i) => i.id === e.ideaId) || {}).title);
        return `<div class="cal-entry st-${e.status}" draggable="true" data-entry="${e.id}" title="${escapeHtml(label || '')}">${escapeHtml(label || '(제목 없음)')}</div>`;
      }).join('')}
    </div>`;
  }
  function openCalEntryModal(defaultDate, entryId) {
    const entry = entryId ? state.calendar.find((c) => c.id === entryId) : null;
    const linkedPost = entry && entry.postId ? state.posts.find((p) => p.id === entry.postId) : null;
    const linkedIdea = entry && entry.ideaId ? state.ideas.find((i) => i.id === entry.ideaId) : null;
    openModal(`
      <div class="modal-head"><h3>${entry ? '일정 편집' : '＋ 일정 추가'}</h3><button class="btn-icon" id="modalCloseBtn">✕</button></div>
      <div class="modal-body">
        ${!entry ? `
        <div class="field"><div class="field-label">연결할 항목</div>
          <select class="select" id="ceItem">
            <option value="">선택 안 함 (제목만 입력)</option>
            <optgroup label="글">${state.posts.map((p) => `<option value="post:${p.id}">${escapeHtml(p.title || '(제목 없음)')}</option>`).join('')}</optgroup>
            <optgroup label="아이디어">${state.ideas.map((i) => `<option value="idea:${i.id}">${escapeHtml(i.title)}</option>`).join('')}</optgroup>
          </select>
        </div>` : `<div class="card-flat">${escapeHtml((linkedPost || linkedIdea || {}).title || '(제목 없음)')}</div>`}
        <div class="field-row">
          <div class="field"><div class="field-label">날짜</div><input class="input" type="date" id="ceDate" value="${entry ? entry.date : (defaultDate || Store.dateStr(new Date()))}"></div>
          <div class="field"><div class="field-label">상태</div><select class="select" id="ceStatus">${CAL_STATUS_ORDER.map((s) => `<option value="${s}" ${entry && entry.status === s ? 'selected' : ''}>${STATUS_LABEL[s]}</option>`).join('')}</select></div>
        </div>
      </div>
      <div class="modal-foot">
        ${entry ? '<button class="btn btn-danger" id="ceDeleteBtn">삭제</button>' : ''}
        <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
        <button class="btn btn-primary" id="ceSaveBtn">저장</button>
      </div>
    `, {
      onMount: () => {
        $('#modalCloseBtn').addEventListener('click', closeModal);
        $('#modalCancelBtn').addEventListener('click', closeModal);
        if (entry) $('#ceDeleteBtn').addEventListener('click', () => { Store.deleteCalendarEntry(entry.id).then(() => { state.calendar = state.calendar.filter((c) => c.id !== entry.id); closeModal(); renderApp(); }); });
        $('#ceSaveBtn').addEventListener('click', () => {
          const date = $('#ceDate').value; const status = $('#ceStatus').value;
          if (!date) { toast('날짜를 선택해주세요'); return; }
          let payload = entry ? { ...entry, date, status } : { date, status, blogId: state.activeBlogId };
          if (!entry) {
            const sel = $('#ceItem').value;
            if (sel.startsWith('post:')) { payload.postId = sel.slice(5); payload.blogId = (state.posts.find((p) => p.id === payload.postId) || {}).blogId || state.activeBlogId; }
            else if (sel.startsWith('idea:')) { payload.ideaId = sel.slice(5); payload.blogId = (state.ideas.find((i) => i.id === payload.ideaId) || {}).blogId || state.activeBlogId; }
          }
          Store.saveCalendarEntry(payload).then((saved) => {
            const idx = state.calendar.findIndex((c) => c.id === saved.id);
            if (idx >= 0) state.calendar[idx] = saved; else state.calendar.push(saved);
            closeModal(); renderApp(); toast('저장했어요');
          });
        });
      },
    });
  }

  // ============================================================
  // 즐겨찾기
  // ============================================================
  function renderFavorites(main) {
    main.innerHTML = `
    <div class="view">
      <div class="page-title">⭐ 즐겨찾기</div>
      <div class="tabbar" style="margin-top:16px;">
        <button class="tab-btn ${state.favTab === 'posts' ? 'active' : ''}" data-favtab="posts">즐겨찾기 글</button>
        <button class="tab-btn ${state.favTab === 'titles' ? 'active' : ''}" data-favtab="titles">즐겨찾기 제목</button>
        <button class="tab-btn ${state.favTab === 'ideas' ? 'active' : ''}" data-favtab="ideas">즐겨찾기 아이디어</button>
      </div>
      <div id="favBody"></div>
    </div>`;
    $all('[data-favtab]', main).forEach((b) => b.addEventListener('click', () => { state.favTab = b.dataset.favtab; renderApp(); }));
    const body = $('#favBody');
    if (state.favTab === 'posts') {
      const list = state.posts.filter((p) => state.favorites.postIds.includes(p.id));
      body.innerHTML = `<div class="post-grid" style="margin-top:16px;">${list.length ? list.map(postCardHtml).join('') : emptyStateHtml('⭐', '즐겨찾기한 글이 없어요', '글 카드의 별 아이콘을 눌러 추가해보세요.')}</div>`;
      bindPostCardEvents(body);
    } else if (state.favTab === 'titles') {
      const list = state.favorites.titles;
      body.innerHTML = list.length ? `<div class="card" style="margin-top:16px;">${list.map((t) => `<div class="title-row"><span class="tt">${escapeHtml(t)}</span><span class="tact"><button class="btn-icon btn-sm" data-fav-title-copy="${escapeHtml(t)}">📋</button><button class="btn-icon btn-sm" data-fav-title-remove="${escapeHtml(t)}">✕</button></span></div>`).join('')}</div>` : emptyStateHtml('⭐', '즐겨찾기한 제목이 없어요', '제목 생성기에서 별표를 눌러보세요.');
      $all('[data-fav-title-copy]', body).forEach((b) => b.addEventListener('click', () => copyText(b.dataset.favTitleCopy)));
      $all('[data-fav-title-remove]', body).forEach((b) => b.addEventListener('click', () => {
        Store.toggleFavoriteTitle(b.dataset.favTitleRemove).then(() => {
          state.favorites.titles = state.favorites.titles.filter((t) => t !== b.dataset.favTitleRemove); renderApp();
        });
      }));
    } else {
      const list = state.ideas.filter((i) => state.favorites.ideaIds.includes(i.id));
      body.innerHTML = `<div class="idea-grid" style="margin-top:16px;">${list.length ? list.map(ideaCardHtml).join('') : emptyStateHtml('⭐', '즐겨찾기한 아이디어가 없어요', '아이디어 카드의 별 아이콘을 눌러보세요.')}</div>`;
      bindIdeaCardEvents(body);
    }
  }

  // ============================================================
  // 블로그 설정
  // ============================================================
  function renderSettings(main) {
    main.innerHTML = `
    <div class="view">
      <div class="page-title">⚙️ 블로그 설정</div>

      <div class="section-block">
        <div class="section-head"><div class="section-title">블로그 프로필</div><button class="btn btn-primary btn-sm" id="addBlogBtn">＋ 새 블로그 추가</button></div>
        <div class="card-row-grid" id="blogListGrid"></div>
      </div>

      <div class="section-block">
        <div class="section-head"><div class="section-title">✍️ 글쓰기 프리셋</div><button class="btn btn-secondary btn-sm" id="addPresetBtn">＋ 새 프리셋 추가</button></div>
        <div class="card-row-grid" id="presetListGrid"></div>
      </div>

      <div class="section-block">
        <div class="section-title">🔌 외부 연동 <span class="faint" style="font-weight:400; font-size:12px;">(선택)</span></div>
        <div class="card">
          <div class="field"><div class="field-label">AI API 키</div><input class="input" type="password" id="apiKeyInput" placeholder="비워두면 데모 모드로 동작해요"></div>
          <div class="field" style="margin-top:12px;"><div class="field-label">검색 API 키 <span class="faint">(SerpAPI 등 — 상위노출 글 분석용)</span></div><input class="input" type="password" id="searchApiKeyInput" placeholder="비워두면 데모 인사이트로 동작해요"></div>
          <div class="field" style="margin-top:12px;"><div class="field-label">이미지 API 키 <span class="faint">(Unsplash 등 — 무료 이미지 검색용)</span></div><input class="input" type="password" id="imageApiKeyInput" placeholder="비워두면 자동 생성 이미지로 동작해요"></div>
          <div class="field-hint" style="margin-top:10px; line-height:1.6;">키를 저장해두면 실제 API가 연결됐을 때 바로 전환되도록 코드가 분리돼 있어요. 다만 이 페이지는 브라우저에서 정적으로 동작하는 구조라, 보안 정책상 이 화면에서 외부 검색·이미지 API를 직접 호출할 수는 없어요. 실제로 연결하려면 호출을 대신 처리해줄 서버(백엔드)가 필요하고, 그 전까지는 자연스러운 데모 인사이트와 자동 생성 이미지로 동작해요.</div>
          <button class="btn btn-secondary btn-sm" id="saveApiKeyBtn" style="margin-top:10px;">저장</button>
        </div>
      </div>

      <div class="section-block">
        <div class="section-title">💾 데이터 관리</div>
        <div class="card" style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
          <button class="btn btn-secondary" id="exportBtn">전체 데이터 내보내기</button>
          <button class="btn btn-secondary" id="importBtn">데이터 가져오기</button>
          <button class="btn btn-danger" id="resetBtn" style="margin-left:auto;">초기 데이터로 재설정</button>
        </div>
      </div>
    </div>`;

    renderBlogListGrid();
    renderPresetListGrid();
    Store.getApiKey().then((k) => { $('#apiKeyInput').value = k || ''; });
    Store.getSearchApiKey().then((k) => { $('#searchApiKeyInput').value = k || ''; });
    Store.getImageApiKey().then((k) => { $('#imageApiKeyInput').value = k || ''; });
    $('#saveApiKeyBtn').addEventListener('click', () => {
      Promise.all([
        Store.setApiKey($('#apiKeyInput').value.trim()),
        Store.setSearchApiKey($('#searchApiKeyInput').value.trim()),
        Store.setImageApiKey($('#imageApiKeyInput').value.trim()),
      ]).then(() => toast('저장했어요'));
    });
    $('#addBlogBtn').addEventListener('click', () => openBlogModal(null));
    $('#addPresetBtn').addEventListener('click', () => openPresetModal(null));
    $('#exportBtn').addEventListener('click', openExportModal);
    $('#importBtn').addEventListener('click', openImportModal);
    $('#resetBtn').addEventListener('click', () => {
      if (!confirm('모든 데이터를 초기 상태로 되돌립니다. 계속할까요?')) return;
      Store.resetAll().then(() => { toast('초기화했어요'); loadAll(); });
    });
  }
  function renderBlogListGrid() {
    const grid = $('#blogListGrid');
    grid.innerHTML = state.blogs.map((b) => `
      <div class="card">
        <div class="section-head"><div style="display:flex; align-items:center; gap:9px;">
          <span class="blog-avatar" style="background:${b.color || blogColor(b.id)}">${escapeHtml((b.nickname || b.name || '?').slice(0, 1))}</span>
          <div><div style="font-weight:700;">${escapeHtml(b.name)}</div><div class="faint" style="font-size:11.5px;">${escapeHtml(b.category || '')}</div></div>
        </div>
        <div style="display:flex; gap:4px;"><button class="btn-icon btn-sm" data-edit-blog="${b.id}">✏️</button><button class="btn-icon btn-sm" data-del-blog="${b.id}">🗑</button></div></div>
        <div class="faint" style="font-size:12px; margin-top:10px;">${escapeHtml(b.description || '')}</div>
        <div class="faint" style="font-size:11.5px; margin-top:8px;">말투 · ${escapeHtml(b.tone || '-')} · 길이 · ${escapeHtml(b.lengthPref || '-')}</div>
      </div>`).join('');
    $all('[data-edit-blog]', grid).forEach((b) => b.addEventListener('click', () => openBlogModal(getBlogById(b.dataset.editBlog))));
    $all('[data-del-blog]', grid).forEach((b) => b.addEventListener('click', () => {
      if (state.blogs.length <= 1) { toast('최소 1개의 블로그는 있어야 해요'); return; }
      if (!confirm('이 블로그와 연결된 글도 함께 삭제됩니다. 계속할까요?')) return;
      Store.deleteBlog(b.dataset.delBlog).then(() => {
        state.blogs = state.blogs.filter((x) => x.id !== b.dataset.delBlog);
        state.posts = state.posts.filter((p) => p.blogId !== b.dataset.delBlog);
        Store.getActiveBlogId().then((id) => { state.activeBlogId = id; renderBlogSwitcher(); renderApp(); });
      });
    }));
  }
  function renderPresetListGrid() {
    const grid = $('#presetListGrid');
    grid.innerHTML = state.presets.length ? state.presets.map((p) => `
      <div class="card">
        <div class="section-head"><div style="font-weight:700;">⭐ ${escapeHtml(p.name)}</div>
        <div style="display:flex; gap:4px;"><button class="btn-icon btn-sm" data-edit-preset="${p.id}">✏️</button><button class="btn-icon btn-sm" data-del-preset="${p.id}">🗑</button></div></div>
        <div class="faint" style="font-size:12px; margin-top:8px; line-height:1.7;">
          말투: ${escapeHtml(p.settings.tone || '-')}<br>길이: ${escapeHtml(p.settings.lengthPref || '-')} · 플랫폼: ${PLATFORM_LABEL[p.settings.platform] || '-'}<br>
          FAQ ${p.settings.faq ? '포함' : '제외'} · CTA ${p.settings.cta ? '포함' : '제외'}${p.settings.note ? `<br>${escapeHtml(p.settings.note)}` : ''}
        </div>
      </div>`).join('') : emptyStateHtml('⭐', '저장된 프리셋이 없어요', '자주 쓰는 설정을 프리셋으로 저장해보세요.');
    $all('[data-edit-preset]', grid).forEach((b) => b.addEventListener('click', () => openPresetModal(state.presets.find((p) => p.id === b.dataset.editPreset))));
    $all('[data-del-preset]', grid).forEach((b) => b.addEventListener('click', () => {
      if (!confirm('이 프리셋을 삭제할까요?')) return;
      Store.deletePreset(b.dataset.delPreset).then(() => { state.presets = state.presets.filter((p) => p.id !== b.dataset.delPreset); renderApp(); });
    }));
  }

  function openBlogModal(blog) {
    const b = blog || { name: '', nickname: '', category: '여행 블로그', description: '', audience: '', tone: '친근한 ~요체', lengthPref: '보통', seoStyle: '', keywords: '', bannedWords: '', cta: '', bizName: '', address: '', phone: '', website: '', hashtags: '' };
    openModal(`
      <div class="modal-head"><h3>${blog ? '블로그 프로필 수정' : '＋ 새 블로그 추가'}</h3><button class="btn-icon" id="modalCloseBtn">✕</button></div>
      <div class="modal-body">
        <div class="field-row">
          <div class="field"><div class="field-label">블로그 이름</div><input class="input" id="bmName" value="${escapeHtml(b.name)}"></div>
          <div class="field"><div class="field-label">닉네임</div><input class="input" id="bmNickname" value="${escapeHtml(b.nickname)}"></div>
        </div>
        <div class="field"><div class="field-label">블로그 설명</div><textarea class="textarea" id="bmDescription" style="min-height:54px;">${escapeHtml(b.description)}</textarea></div>
        <div class="field-row">
          <div class="field"><div class="field-label">주요 분야</div><input class="input" id="bmCategory" value="${escapeHtml(b.category)}" placeholder="예: 여행 블로그"></div>
          <div class="field"><div class="field-label">주요 독자층</div><input class="input" id="bmAudience" value="${escapeHtml(b.audience)}"></div>
        </div>
        <div class="field-row">
          <div class="field"><div class="field-label">기본 말투</div>
            <select class="select" id="bmTone">${TONES.filter((t) => t !== '직접 설정').concat(['병원 설명체', '정보 전달형', '후기형']).filter((v, i, a) => a.indexOf(v) === i).map((t) => `<option ${t === b.tone ? 'selected' : ''}>${t}</option>`).join('')}</select>
          </div>
          <div class="field"><div class="field-label">기본 글 길이</div><select class="select" id="bmLength">${LENGTHS.map((l) => `<option ${l === b.lengthPref ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        </div>
        <div class="field"><div class="field-label">기본 SEO 스타일</div><input class="input" id="bmSeoStyle" value="${escapeHtml(b.seoStyle)}" placeholder="예: 검색 유입 중심"></div>
        <div class="field"><div class="field-label">자주 사용하는 키워드 <span class="opt">(쉼표 구분)</span></div><input class="input" id="bmKeywords" value="${escapeHtml(b.keywords)}"></div>
        <div class="field"><div class="field-label">금지 표현</div><input class="input" id="bmBanned" value="${escapeHtml(b.bannedWords)}"></div>
        <div class="field"><div class="field-label">CTA 문구</div><input class="input" id="bmCta" value="${escapeHtml(b.cta)}"></div>
        <div class="field-row">
          <div class="field"><div class="field-label">업체명</div><input class="input" id="bmBizName" value="${escapeHtml(b.bizName)}"></div>
          <div class="field"><div class="field-label">전화번호</div><input class="input" id="bmPhone" value="${escapeHtml(b.phone)}"></div>
        </div>
        <div class="field"><div class="field-label">주소</div><input class="input" id="bmAddress" value="${escapeHtml(b.address)}"></div>
        <div class="field"><div class="field-label">홈페이지</div><input class="input" id="bmWebsite" value="${escapeHtml(b.website)}"></div>
        <div class="field"><div class="field-label">기본 해시태그</div><input class="input" id="bmHashtags" value="${escapeHtml(b.hashtags)}"></div>
      </div>
      <div class="modal-foot">
        ${blog ? '' : ''}
        <button class="btn btn-secondary" id="modalCancelBtn">취소</button>
        <button class="btn btn-primary" id="bmSaveBtn">저장</button>
      </div>
    `, { large: true, onMount: () => {
      $('#modalCloseBtn').addEventListener('click', closeModal);
      $('#modalCancelBtn').addEventListener('click', closeModal);
      $('#bmSaveBtn').addEventListener('click', () => {
        const name = $('#bmName').value.trim(); if (!name) { toast('블로그 이름을 입력해주세요'); return; }
        const payload = {
          id: blog ? blog.id : undefined, name, nickname: $('#bmNickname').value.trim(), category: $('#bmCategory').value.trim(),
          description: $('#bmDescription').value.trim(), audience: $('#bmAudience').value.trim(), tone: $('#bmTone').value,
          lengthPref: $('#bmLength').value, seoStyle: $('#bmSeoStyle').value.trim(), keywords: $('#bmKeywords').value.trim(),
          bannedWords: $('#bmBanned').value.trim(), cta: $('#bmCta').value.trim(), bizName: $('#bmBizName').value.trim(),
          address: $('#bmAddress').value.trim(), phone: $('#bmPhone').value.trim(), website: $('#bmWebsite').value.trim(),
          hashtags: $('#bmHashtags').value.trim(), color: (blog && blog.color) || BLOG_COLORS[state.blogs.length % BLOG_COLORS.length],
        };
        Store.saveBlog(payload).then((saved) => {
          const idx = state.blogs.findIndex((x) => x.id === saved.id);
          if (idx >= 0) state.blogs[idx] = saved; else { state.blogs.push(saved); state.activeBlogId = saved.id; Store.setActiveBlogId(saved.id); }
          closeModal(); renderBlogSwitcher(); renderApp(); toast('저장했어요');
        });
      });
    } });
  }

  function openPresetModal(preset) {
    const s = (preset && preset.settings) || {};
    openModal(`
      <div class="modal-head"><h3>${preset ? '프리셋 수정' : '＋ 새 프리셋 추가'}</h3><button class="btn-icon" id="modalCloseBtn">✕</button></div>
      <div class="modal-body">
        <div class="field"><div class="field-label">프리셋 이름</div><input class="input" id="pmName" value="${escapeHtml(preset ? preset.name : '')}" placeholder="예: 여행 정보글"></div>
        <div class="field"><div class="field-label">연결 블로그 <span class="opt">(선택)</span></div><select class="select" id="pmBlog"><option value="">전체 블로그</option>${state.blogs.map((b) => `<option value="${b.id}" ${preset && preset.blogId === b.id ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('')}</select></div>
        <div class="field"><div class="field-label">말투</div><input class="input" id="pmTone" value="${escapeHtml(s.tone || '')}" placeholder="예: MZ + 친근한 ~요체"></div>
        <div class="field-row">
          <div class="field"><div class="field-label">글 길이</div><select class="select" id="pmLength">${LENGTHS.map((l) => `<option ${l === s.lengthPref ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><div class="field-label">플랫폼</div><select class="select" id="pmPlatform">${PLATFORMS.map((p) => `<option value="${p.key}" ${p.key === s.platform ? 'selected' : ''}>${p.label}</option>`).join('')}</select></div>
        </div>
        <div style="display:flex; gap:18px;">
          <label class="check-row" style="padding:0;"><input type="checkbox" id="pmFaq" ${s.faq ? 'checked' : ''}><span class="t">FAQ 포함</span></label>
          <label class="check-row" style="padding:0;"><input type="checkbox" id="pmCta" ${s.cta ? 'checked' : ''}><span class="t">CTA 포함</span></label>
        </div>
        <div class="field"><div class="field-label">메모 <span class="opt">(선택)</span></div><textarea class="textarea" id="pmNote" style="min-height:54px;" placeholder="예: 전문용어는 쉽게 설명 / 과도한 공포 표현 금지">${escapeHtml(s.note || '')}</textarea></div>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="pmSaveBtn">저장</button></div>
    `, { onMount: () => {
      $('#modalCloseBtn').addEventListener('click', closeModal);
      $('#modalCancelBtn').addEventListener('click', closeModal);
      $('#pmSaveBtn').addEventListener('click', () => {
        const name = $('#pmName').value.trim(); if (!name) { toast('프리셋 이름을 입력해주세요'); return; }
        const payload = {
          id: preset ? preset.id : undefined, name, blogId: $('#pmBlog').value || null,
          settings: { tone: $('#pmTone').value.trim(), lengthPref: $('#pmLength').value, platform: $('#pmPlatform').value, faq: $('#pmFaq').checked, cta: $('#pmCta').checked, note: $('#pmNote').value.trim() },
        };
        Store.savePreset(payload).then((saved) => {
          const idx = state.presets.findIndex((x) => x.id === saved.id);
          if (idx >= 0) state.presets[idx] = saved; else state.presets.push(saved);
          closeModal(); renderApp(); toast('저장했어요');
        });
      });
    } });
  }

  function openExportModal() {
    Store.exportAll().then((json) => {
      openModal(`
        <div class="modal-head"><h3>전체 데이터 내보내기</h3><button class="btn-icon" id="modalCloseBtn">✕</button></div>
        <div class="modal-body">
          <div class="field-hint">아래 내용을 복사해서 .json 파일로 저장해두면 안전하게 백업할 수 있어요.</div>
          <textarea class="textarea mono" id="exportArea" readonly style="min-height:280px; font-size:11.5px;">${escapeHtml(json)}</textarea>
        </div>
        <div class="modal-foot"><button class="btn btn-secondary" id="modalCancelBtn">닫기</button><button class="btn btn-primary" id="exportCopyBtn">전체 복사</button></div>
      `, { large: true, onMount: () => {
        $('#modalCloseBtn').addEventListener('click', closeModal);
        $('#modalCancelBtn').addEventListener('click', closeModal);
        $('#exportCopyBtn').addEventListener('click', () => copyText(json));
      } });
    });
  }
  function openImportModal() {
    openModal(`
      <div class="modal-head"><h3>데이터 가져오기</h3><button class="btn-icon" id="modalCloseBtn">✕</button></div>
      <div class="modal-body">
        <div class="field-hint">⚠️ 가져오기를 실행하면 현재 데이터가 모두 새 데이터로 바뀝니다.</div>
        <div class="field"><div class="field-label">JSON 파일 선택</div><input type="file" id="importFile" accept=".json,application/json" class="input"></div>
        <div class="field"><div class="field-label">또는 JSON 붙여넣기</div><textarea class="textarea mono" id="importArea" style="min-height:200px; font-size:11.5px;" placeholder="백업한 JSON 내용을 붙여넣어주세요"></textarea></div>
      </div>
      <div class="modal-foot"><button class="btn btn-secondary" id="modalCancelBtn">취소</button><button class="btn btn-primary" id="importRunBtn">가져오기</button></div>
    `, { large: true, onMount: () => {
      $('#modalCloseBtn').addEventListener('click', closeModal);
      $('#modalCancelBtn').addEventListener('click', closeModal);
      $('#importFile').addEventListener('change', (e) => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { $('#importArea').value = reader.result; };
        reader.readAsText(file);
      });
      $('#importRunBtn').addEventListener('click', () => {
        const text = $('#importArea').value.trim();
        if (!text) { toast('가져올 JSON 내용을 입력해주세요'); return; }
        if (!confirm('현재 데이터를 덮어씁니다. 계속할까요?')) return;
        Store.importAll(text).then(() => { toast('가져오기를 완료했어요'); closeModal(); loadAll(); }).catch(() => toast('JSON 형식이 올바르지 않아요'));
      });
    } });
  }

  // ============================================================
  // 최종본 보기
  // ============================================================
  function htmlToCleanText(html) {
    const div = document.createElement('div'); div.innerHTML = html || '';
    const parts = [];
    Array.from(div.children).forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const text = el.textContent.trim();
      if (!text && tag !== 'hr') return;
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') parts.push('\n' + text);
      else if (tag === 'p') parts.push(text);
      else if (tag === 'blockquote') parts.push(text.split('\n').map((l) => '“ ' + l).join('\n'));
      else if (tag === 'ul' || tag === 'ol') {
        let i = 0;
        parts.push(Array.from(el.children).map((li) => { i++; return (tag === 'ol' ? i + '. ' : '- ') + li.textContent.trim(); }).join('\n'));
      } else if (tag === 'hr') parts.push('───────');
      else if (tag === 'table') parts.push(Array.from(el.querySelectorAll('tr')).map((tr) => Array.from(tr.children).map((td) => td.textContent.trim()).join(' | ')).join('\n'));
      else parts.push(text);
    });
    return parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function openFinal(postId) {
    const post = state.posts.find((p) => p.id === postId);
    if (!post) return;
    const cleanBody = htmlToCleanText(post.content);
    const tags = (post.tags || '').split(/[, ]+/).filter(Boolean).map((t) => t.replace(/^#?/, '#'));
    const thumbs = post.thumbnailPhrases || [];
    const host = $('#finalHost');
    host.dataset.postId = post.id;
    host._body = cleanBody; host._thumbs = thumbs;
    host._full = [post.title, '', cleanBody, tags.length ? ('\n' + tags.join(' ')) : ''].join('\n');
    host.innerHTML = `
    <div class="final-overlay">
      <button class="btn-icon final-close" id="finalCloseBtn">✕</button>
      <div class="final-wrap">
        <div class="eyebrow">최종본</div>
        <h1 class="final-title" style="margin:6px 0 20px;">${escapeHtml(post.title || '(제목 없음)')}</h1>
        <button class="btn btn-primary btn-lg btn-block" id="copyAllFinalBtn">📋 전체 글 복사</button>

        <div class="final-block" style="margin-top:34px;">
          <div class="final-block-head"><span class="final-block-label">제목</span><button class="btn btn-secondary btn-sm" data-copy-final="title">복사</button></div>
          <div class="card card-flat">${escapeHtml(post.title || '')}</div>
        </div>
        <div class="final-block">
          <div class="final-block-head"><span class="final-block-label">본문</span><button class="btn btn-secondary btn-sm" data-copy-final="body">복사</button></div>
          <div class="card final-content">${escapeHtml(cleanBody || '아직 작성된 내용이 없어요')}</div>
        </div>
        <div class="final-block">
          <div class="final-block-head"><span class="final-block-label">해시태그</span><button class="btn btn-secondary btn-sm" data-copy-final="tags">복사</button></div>
          <div class="card final-tags">${tags.length ? tags.map((t) => `<span class="hashtag-chip">${escapeHtml(t)}</span>`).join('') : '<span class="faint">아직 생성된 해시태그가 없어요</span>'}</div>
        </div>
        <div class="final-block">
          <div class="final-block-head"><span class="final-block-label">메타디스크립션</span><button class="btn btn-secondary btn-sm" data-copy-final="meta">복사</button></div>
          <div class="card final-meta">${escapeHtml(post.metaDescription || '아직 생성된 메타디스크립션이 없어요')}</div>
        </div>
        ${thumbs.length ? `<div class="final-block"><div class="final-block-head"><span class="final-block-label">썸네일 문구</span></div>
          <div class="thumb-phrase-list">${thumbs.map((t, i) => `<div class="thumb-phrase"><span>${escapeHtml(t)}</span><button class="btn btn-secondary btn-sm" data-copy-final-thumb="${i}">복사</button></div>`).join('')}</div></div>` : ''}
      </div>
    </div>`;
  }
  function onFinalHostClick(e) {
    const host = $('#finalHost');
    if (e.target.closest('#finalCloseBtn')) { host.innerHTML = ''; return; }
    if (e.target.closest('#copyAllFinalBtn')) { copyText(host._full); return; }
    const cf = e.target.closest('[data-copy-final]');
    if (cf) {
      const post = state.posts.find((p) => p.id === host.dataset.postId); if (!post) return;
      const map = { title: post.title, body: host._body, tags: (post.tags || ''), meta: post.metaDescription };
      copyText(map[cf.dataset.copyFinal] || '');
      return;
    }
    const cft = e.target.closest('[data-copy-final-thumb]');
    if (cft) copyText(host._thumbs[+cft.dataset.copyFinalThumb]);
  }

  // ---------------- 시작 ----------------
  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') init();
})();
