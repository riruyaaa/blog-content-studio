/* =========================================================
   store.js — 데이터 저장 레이어
   지금은 localStorage를 사용하지만, 모든 메서드가 Promise를
   반환하도록 설계되어 있어 나중에 Supabase 등 실제 DB로
   교체할 때 호출부(app.js)를 거의 그대로 둘 수 있습니다.
   ========================================================= */

(function (global) {
  const DB_KEY = 'bcs_data_v2';
  const uid = (p) => (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function seedData() {
    const now = Date.now();
    const day = 86400000;

    const blogs = [
      {
        id: 'blog_travel', name: '여행유발자 이루미', nickname: '이루미', category: '여행 블로그',
        description: '국내외 자유여행 정보와 일정, 준비물을 공유하는 여행 블로그',
        audience: '2030 자유여행러, 첫 해외여행 준비자', tone: '친근한 ~요체', lengthPref: '자세히',
        seoStyle: '검색 유입 중심', keywords: '여행코스, 여행준비물, 자유여행',
        bannedWords: '무조건, 최고예요, ~하는 게 국룰', cta: '더 많은 여행 팁은 이웃추가하고 받아보세요 :)',
        bizName: '', address: '', phone: '', website: '', hashtags: '#여행유발자이루미, #자유여행, #여행스타그램',
        color: '#33456B', createdAt: now - 40 * day,
      },
      {
        id: 'blog_agency', name: '하나아일랜드', nickname: '하나투어담당자', category: '여행사 블로그',
        description: '패키지여행 상품과 여행지 정보를 안내하는 여행사 공식 블로그',
        audience: '패키지여행 예약을 고려하는 30~50대', tone: '전문가 스타일', lengthPref: '보통',
        seoStyle: '예약 전환 중심', keywords: '패키지여행, 단체여행, 여행상품',
        bannedWords: '싸다, 땡처리', cta: '상담 및 예약 문의는 하단 링크에서 확인하세요',
        bizName: '하나아일랜드 여행사', address: '서울시 중구 세종대로 1', phone: '02-1234-5678',
        website: 'https://hana-island.example.com', hashtags: '#하나아일랜드, #패키지여행, #여행상품',
        color: '#9C6B08', createdAt: now - 30 * day,
      },
      {
        id: 'blog_vet', name: '동물병원 블로그', nickname: '다정동물병원', category: '동물병원 블로그',
        description: '반려동물 질환, 치료 사례, 건강 정보를 전하는 동물병원 블로그',
        audience: '반려동물 보호자', tone: '병원 설명체', lengthPref: '자세히',
        seoStyle: '정보 신뢰도 중심', keywords: '강아지 질환, 고양이 질환, 반려동물 건강',
        bannedWords: '무섭게, 방치하면 죽습니다', cta: '증상이 있다면 방문 전 전화로 먼저 문의해주세요',
        bizName: '다정동물병원', address: '경기도 성남시 분당구 판교역로 10', phone: '031-987-6543',
        website: 'https://dajeongvet.example.com', hashtags: '#다정동물병원, #반려동물건강, #강아지병원',
        color: '#2E7D54', createdAt: now - 20 * day,
      },
      {
        id: 'blog_money', name: '재테크 블로그', nickname: '머니로그', category: '재테크 블로그',
        description: '예적금, 절약, 재테크 정보를 정리하는 블로그', audience: '2030 사회초년생, 재테크 입문자',
        tone: 'MZ 스타일', lengthPref: '보통', seoStyle: '검색 유입 중심', keywords: '재테크, 절약, 예적금',
        bannedWords: '무조건 오른다, 투자 권유', cta: '더 많은 재테크 정보는 팔로우하고 받아보세요',
        bizName: '', address: '', phone: '', website: '', hashtags: '#머니로그, #재테크, #짠테크',
        color: '#B8453C', createdAt: now - 10 * day,
      },
    ];

    const posts = [
      {
        id: 'post_1', blogId: 'blog_travel', title: '10월 홍콩 여행, 옷차림부터 준비물까지 총정리',
        category: '여행 가이드', status: 'writing', createdAt: now - 2 * day, updatedAt: now - 1 * day,
        mainKeyword: '10월 홍콩 여행', subKeywords: '홍콩 날씨, 홍콩 옷차림, 홍콩 준비물',
        purpose: ['검색 유입', '정보 전달'], targetReader: '10월에 홍콩 자유여행을 준비하는 사람',
        tone: '친근한 ~요체', lengthPref: '자세히', platform: 'naver',
        aiRequest: '10월 홍콩 여행을 준비하는 사람들이 검색할 만한 내용 중심으로 써줘. 날씨, 옷차림, 준비물, 여행 팁을 자세히 넣어줘.',
        options: { seoTitle: true, metaDesc: true, toc: true, seoHeadings: true, keywordInsert: true, relatedSearch: true, faq: true, cta: true, hashtags: true, thumbnail: true, cardnews: false },
        content: '<h2>10월 홍콩, 생각보다 날씨가 애매해요</h2><p>10월 홍콩 여행을 준비하면서 제일 먼저 찾아본 게 날씨였어요. 한국은 완연한 가을인데 홍콩은 아직 늦여름 기운이 남아있더라고요. 평균 기온은 24~29도 사이라 반팔이 기본이지만, 아침저녁으로는 선선한 바람이 불어서 얇은 겉옷 하나는 꼭 챙기는 게 좋아요.</p><h2>이렇게 입으면 딱 맞아요</h2><p>낮에는 반팔, 반바지에 얇은 리넨 셔츠 하나 걸치는 정도면 충분해요. 다만 실내 냉방이 꽤 세기 때문에 카디건이나 얇은 자켓은 필수예요. 저녁에 침사추이 야경 보러 나갈 땐 바닷바람이 은근히 쌀쌀해서 겉옷을 안 챙겼다가 후회했던 기억이 있어요.</p><h2>준비물 체크리스트</h2><ul><li>우산 (10월은 가끔 스콜성 비가 내려요)</li><li>보조배터리 (걷는 일정이 많아서 배터리 소모가 커요)</li><li>편한 운동화 (오르막이 많은 지역이 있어요)</li><li>얇은 겉옷 1~2벌</li></ul>',
        tags: '#홍콩여행, #홍콩자유여행, #홍콩여행준비, #홍콩날씨, #10월홍콩', seoScore: 78, favorite: true,
        metaDescription: '10월 홍콩 여행을 준비한다면 꼭 알아야 할 날씨, 옷차림, 준비물을 한 번에 정리했어요.',
        thumbnailPhrases: [], faq: [], cardNews: [],
      },
      {
        id: 'post_2', blogId: 'blog_vet', title: '강아지 슬개골 탈구, 초기 증상과 관리법',
        category: '병원 질환 설명', status: 'done', createdAt: now - 6 * day, updatedAt: now - 5 * day,
        mainKeyword: '강아지 슬개골 탈구', subKeywords: '슬개골 탈구 증상, 소형견 관절',
        purpose: ['정보 전달', '예약 문의'], targetReader: '소형견을 키우는 보호자', tone: '병원 설명체',
        lengthPref: '자세히', platform: 'tistory',
        aiRequest: '', options: { seoTitle: true, metaDesc: true, toc: true, seoHeadings: true, keywordInsert: true, relatedSearch: true, faq: true, cta: true, hashtags: true, thumbnail: false, cardnews: false },
        content: '<h2>슬개골 탈구, 왜 소형견에게 잘 생길까요</h2><p>진료실에서 슬개골 탈구로 내원하시는 보호자님을 정말 많이 만나요. 특히 몰티즈, 포메라니안처럼 다리가 가는 소형견에게 흔하게 나타나는 편이에요. 무릎뼈가 제자리에서 벗어났다 들어왔다 하는 상태라고 생각하시면 이해가 쉬워요.</p><h2>이런 모습을 보이면 의심해보세요</h2><p>걷다가 갑자기 한쪽 다리를 살짝 들고 깽깽이걸음을 하거나, 앉았다 일어날 때 유난히 힘들어한다면 슬개골 탈구를 의심해볼 수 있어요. 초기에는 증상이 아주 미세해서 그냥 지나치기 쉬운데, 반복되는 모습이 보인다면 검사를 받아보시길 권해드려요.</p><h2>집에서 관리하는 방법</h2><ul><li>미끄러운 마룻바닥에는 매트를 깔아주세요</li><li>소파나 침대 오르내림을 줄여주세요</li><li>적정 체중을 유지해주세요</li></ul>',
        tags: '#강아지슬개골탈구, #소형견관절, #다정동물병원, #강아지건강', seoScore: 85, favorite: false,
        metaDescription: '소형견에게 흔한 슬개골 탈구의 초기 증상과 집에서 할 수 있는 관리법을 알려드려요.',
        thumbnailPhrases: [], faq: [], cardNews: [],
      },
      {
        id: 'post_3', blogId: 'blog_money', title: '사회초년생 첫 적금, 이렇게 골랐어요', category: '재테크 정보',
        status: 'writing', createdAt: now - 1 * day, updatedAt: now - 1 * day, mainKeyword: '사회초년생 적금',
        subKeywords: '적금 추천, 저축 습관', purpose: ['정보 전달'], targetReader: '사회초년생', tone: 'MZ 스타일',
        lengthPref: '보통', platform: 'naver', aiRequest: '',
        options: { seoTitle: true, metaDesc: false, toc: false, seoHeadings: true, keywordInsert: true, relatedSearch: false, faq: false, cta: true, hashtags: true, thumbnail: false, cardnews: false },
        content: '', tags: '', seoScore: 0, favorite: false, metaDescription: '', thumbnailPhrases: [], faq: [], cardNews: [],
      },
    ];

    const ideas = [
      { id: 'idea_1', blogId: 'blog_travel', category: '여행 가이드', title: '제주도 3박4일, 렌트카 없이 다니는 법', mainKeyword: '제주도 대중교통 여행', subKeywords: '제주 버스여행, 렌트카 없이 제주도', intent: '렌트카 없이도 제주 여행이 가능한지 검색하는 사람', direction: '버스 노선, 소요시간, 대체 이동수단(택시앱) 중심으로 정리', uploadTiming: '성수기 시작 3주 전' },
      { id: 'idea_2', blogId: 'blog_vet', category: '병원 질환 설명', title: '고양이 만성 신장질환, 조기 발견이 중요한 이유', mainKeyword: '고양이 신장질환', subKeywords: '고양이 다음다뇨, 신장질환 초기증상', intent: '고양이가 물을 많이 마셔서 걱정되어 검색', direction: '초기 증상 체크리스트 + 정기검진 권장 주기 안내', uploadTiming: '상시' },
      { id: 'idea_3', blogId: 'blog_money', category: '재테크 정보', title: '파킹통장 vs 예금, 뭐가 더 나을까', mainKeyword: '파킹통장 추천', subKeywords: '예금 이자 비교, 단기 자금 운용', intent: '단기 목돈을 어디에 넣을지 비교 검색', direction: '금리, 인출 자유도, 예금자보호 기준으로 표 비교', uploadTiming: '월초' },
      { id: 'idea_4', blogId: 'blog_agency', category: '여행 가이드', title: '겨울 패키지여행 인기 여행지 TOP5', mainKeyword: '겨울 패키지여행', subKeywords: '겨울 해외여행지 추천, 연말 여행', intent: '연말연시 가족여행지를 고민 중인 예비 고객', direction: '지역별 날씨, 장단점, 추천 일정 소개 + 예약 CTA', uploadTiming: '11월 초' },
    ];

    const presets = [
      { id: 'preset_1', name: '여행 정보글', blogId: 'blog_travel', settings: { tone: 'MZ + 친근한 ~요체', lengthPref: '자세히', seoStrength: '강하게', paragraphStyle: '모바일형', faq: true, cta: true, platform: 'naver' } },
      { id: 'preset_2', name: '동물병원 질환 정보글', blogId: 'blog_vet', settings: { tone: '친근한 수의사 설명체', lengthPref: '자세히', seoStrength: '보통', paragraphStyle: '기본형', faq: true, cta: true, platform: 'tistory', note: '전문용어는 쉽게 설명 / 과도한 공포 표현 금지' } },
    ];

    const calendar = [
      { id: 'cal_1', postId: 'post_1', blogId: 'blog_travel', date: dateStr(new Date(now + 1 * day)), status: 'writing' },
      { id: 'cal_2', postId: 'post_2', blogId: 'blog_vet', date: dateStr(new Date(now - 5 * day)), status: 'done' },
      { id: 'cal_3', ideaId: 'idea_3', blogId: 'blog_money', date: dateStr(new Date(now + 4 * day)), status: 'idea' },
      { id: 'cal_4', ideaId: 'idea_4', blogId: 'blog_agency', date: dateStr(new Date(now + 9 * day)), status: 'scheduled' },
    ];

    return {
      version: 2, activeBlogId: 'blog_travel', theme: 'system', apiKey: '', searchApiKey: '', imageApiKey: '',
      blogs, posts, ideas, presets, calendar,
      favorites: { postIds: ['post_1'], titles: [], ideaIds: [] },
    };
  }

  function dateStr(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  let cache = null;

  function load() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        cache = JSON.parse(raw);
        // 이전 버전 데이터와 병합 (필드 누락 방지)
        const seed = seedData();
        cache.favorites = cache.favorites || seed.favorites;
        if (!cache.blogs || !cache.blogs.length) cache.blogs = seed.blogs;
      } else {
        cache = seedData();
        persist();
      }
    } catch (e) {
      console.warn('저장된 데이터를 불러오지 못해 초기 데이터로 시작합니다.', e);
      cache = seedData();
      persist();
    }
    return cache;
  }

  function persist() {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(cache));
      return true;
    } catch (e) {
      console.error('로컬 저장 실패', e);
      return false;
    }
  }

  function delay(v) {
    // 실제 API 전환 시 자연스럽게 async 흐름을 유지하기 위한 헬퍼
    return Promise.resolve(v);
  }

  const Store = {
    uid,
    dateStr,

    init() { load(); return delay(true); },

    // ---------- Blogs ----------
    getBlogs() { return delay([...load().blogs]); },
    getBlog(id) { return delay(load().blogs.find((b) => b.id === id) || null); },
    saveBlog(blog) {
      const d = load();
      if (!blog.id) { blog.id = uid('blog'); blog.createdAt = Date.now(); d.blogs.push(blog); }
      else {
        const idx = d.blogs.findIndex((b) => b.id === blog.id);
        if (idx >= 0) d.blogs[idx] = { ...d.blogs[idx], ...blog };
        else d.blogs.push(blog);
      }
      persist();
      return delay(blog);
    },
    deleteBlog(id) {
      const d = load();
      d.blogs = d.blogs.filter((b) => b.id !== id);
      d.posts = d.posts.filter((p) => p.blogId !== id);
      if (d.activeBlogId === id) d.activeBlogId = d.blogs[0] ? d.blogs[0].id : null;
      persist();
      return delay(true);
    },
    getActiveBlogId() { return delay(load().activeBlogId); },
    setActiveBlogId(id) { load().activeBlogId = id; persist(); return delay(true); },

    // ---------- Posts ----------
    getPosts() { return delay([...load().posts]); },
    getPost(id) { return delay(load().posts.find((p) => p.id === id) || null); },
    savePost(post) {
      const d = load();
      const now = Date.now();
      if (!post.id) { post.id = uid('post'); post.createdAt = now; post.updatedAt = now; d.posts.unshift(post); }
      else {
        const idx = d.posts.findIndex((p) => p.id === post.id);
        post.updatedAt = now;
        if (idx >= 0) d.posts[idx] = { ...d.posts[idx], ...post };
        else d.posts.unshift(post);
      }
      persist();
      return delay(post);
    },
    deletePost(id) {
      const d = load();
      d.posts = d.posts.filter((p) => p.id !== id);
      d.favorites.postIds = d.favorites.postIds.filter((x) => x !== id);
      d.calendar = d.calendar.filter((c) => c.postId !== id);
      persist();
      return delay(true);
    },
    toggleFavoritePost(id) {
      const d = load();
      const i = d.favorites.postIds.indexOf(id);
      if (i >= 0) d.favorites.postIds.splice(i, 1); else d.favorites.postIds.push(id);
      persist();
      return delay(d.favorites.postIds.includes(id));
    },

    // ---------- Presets ----------
    getPresets() { return delay([...load().presets]); },
    savePreset(preset) {
      const d = load();
      if (!preset.id) { preset.id = uid('preset'); d.presets.push(preset); }
      else {
        const idx = d.presets.findIndex((p) => p.id === preset.id);
        if (idx >= 0) d.presets[idx] = { ...d.presets[idx], ...preset }; else d.presets.push(preset);
      }
      persist();
      return delay(preset);
    },
    deletePreset(id) {
      const d = load();
      d.presets = d.presets.filter((p) => p.id !== id);
      persist();
      return delay(true);
    },

    // ---------- Ideas ----------
    getIdeas() { return delay([...load().ideas]); },
    saveIdea(idea) {
      const d = load();
      if (!idea.id) { idea.id = uid('idea'); d.ideas.unshift(idea); }
      else {
        const idx = d.ideas.findIndex((i) => i.id === idea.id);
        if (idx >= 0) d.ideas[idx] = { ...d.ideas[idx], ...idea }; else d.ideas.unshift(idea);
      }
      persist();
      return delay(idea);
    },
    deleteIdea(id) {
      const d = load();
      d.ideas = d.ideas.filter((i) => i.id !== id);
      d.favorites.ideaIds = d.favorites.ideaIds.filter((x) => x !== id);
      persist();
      return delay(true);
    },
    toggleFavoriteIdea(id) {
      const d = load();
      const i = d.favorites.ideaIds.indexOf(id);
      if (i >= 0) d.favorites.ideaIds.splice(i, 1); else d.favorites.ideaIds.push(id);
      persist();
      return delay(d.favorites.ideaIds.includes(id));
    },

    // ---------- Calendar ----------
    getCalendar() { return delay([...load().calendar]); },
    saveCalendarEntry(entry) {
      const d = load();
      if (!entry.id) { entry.id = uid('cal'); d.calendar.push(entry); }
      else {
        const idx = d.calendar.findIndex((c) => c.id === entry.id);
        if (idx >= 0) d.calendar[idx] = { ...d.calendar[idx], ...entry }; else d.calendar.push(entry);
      }
      persist();
      return delay(entry);
    },
    deleteCalendarEntry(id) {
      const d = load();
      d.calendar = d.calendar.filter((c) => c.id !== id);
      persist();
      return delay(true);
    },

    // ---------- Favorite titles (제목 생성기용) ----------
    getFavoriteTitles() { return delay([...load().favorites.titles]); },
    toggleFavoriteTitle(text) {
      const d = load();
      const i = d.favorites.titles.indexOf(text);
      if (i >= 0) d.favorites.titles.splice(i, 1); else d.favorites.titles.push(text);
      persist();
      return delay(d.favorites.titles.includes(text));
    },

    // ---------- Settings ----------
    getTheme() { return delay(load().theme || 'system'); },
    setTheme(t) { load().theme = t; persist(); return delay(true); },
    getApiKey() { return delay(load().apiKey || ''); },
    setApiKey(k) { load().apiKey = k; persist(); return delay(true); },
    getSearchApiKey() { return delay(load().searchApiKey || ''); },
    setSearchApiKey(k) { load().searchApiKey = k; persist(); return delay(true); },
    getImageApiKey() { return delay(load().imageApiKey || ''); },
    setImageApiKey(k) { load().imageApiKey = k; persist(); return delay(true); },

    // ---------- Backup ----------
    exportAll() { return delay(JSON.stringify(load(), null, 2)); },
    importAll(json) {
      try {
        const parsed = JSON.parse(json);
        if (!parsed || !Array.isArray(parsed.blogs)) throw new Error('형식이 올바르지 않습니다.');
        cache = parsed;
        persist();
        return delay(true);
      } catch (e) {
        return Promise.reject(e);
      }
    },
    resetAll() {
      cache = seedData();
      persist();
      return delay(true);
    },
  };

  global.Store = Store;
})(window);
