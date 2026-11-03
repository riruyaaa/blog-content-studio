/* =========================================================
   ai.js — AI 글쓰기 데모 엔진
   실제 AI API 키가 없어도 바로 사용할 수 있도록, 입력값(주제/
   키워드/말투/길이 등)을 조합해 자연스러운 데모 결과를 만들어
   냅니다. 나중에 실제 API를 연결할 때는 아래 callRealAPI() 안에
   fetch 호출만 채워 넣으면 되도록 함수가 분리되어 있습니다.
   ========================================================= */

(function (global) {
  // 사용자가 지양하고 싶다고 밝힌 전형적인 AI 문장 — 아래 어떤 템플릿에도 쓰지 않습니다.
  // "~에 대해 알아보겠습니다", "매우 중요한 요소입니다", "다양한 장점을 제공합니다", "결론적으로"

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function pickN(arr, n) {
    const pool = [...arr];
    const out = [];
    while (pool.length && out.length < n) {
      const i = Math.floor(Math.random() * pool.length);
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function stripSpace(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function firstWord(s) { return stripSpace(s).split(/[\s,/]/)[0] || stripSpace(s); }
  // 본문 곳곳에서 메인 키워드 전체 구문을 그대로 반복하면 키워드 스터핑(밀도 과다)로 이어지므로,
  // 일반 주제 섹션에서는 마지막 단어를 뺀 핵심 어구를 사용해 자연스럽게 변주합니다.
  function coreKeyword(kw) {
    const parts = stripSpace(kw).split(/\s+/);
    if (parts.length <= 1) return kw;
    return parts.slice(0, Math.max(1, parts.length - 1)).join(' ');
  }

  function toneBucket(tone) {
    const t = tone || '';
    if (/MZ/i.test(t)) return 'mz';
    if (/전문|병원|설명체/.test(t)) return 'expert';
    if (/뉴스/.test(t)) return 'news';
    if (/후기/.test(t)) return 'review';
    return 'friendly';
  }
  function isWarm(tone) { return /병원|수의사|설명체/.test(tone || ''); }

  // ---------------- 문장 풀 ----------------
  const OPENERS = {
    friendly: (c) => [`${c.topic} 관련해서 궁금한 점이 많으실 것 같아 오늘 정리해봤어요.`, `요즘 ${c.topic} 때문에 이것저것 찾아보시는 분들이 많더라고요.`, `저도 ${c.topic} 준비하면서 헷갈렸던 부분이 많았는데, 하나씩 풀어볼게요.`],
    mz: (c) => [`요즘 ${c.topic} 검색하는 사람 진짜 많더라구요.`, `${c.topic}, 저도 처음엔 뭐부터 봐야 할지 감이 안 왔어요.`, `${c.topic} 궁금해서 이것저것 찾아보다가 정리해서 올려요.`],
    expert: (c) => [`${c.topic}에 관해 자주 받는 질문을 정리했습니다.`, `${c.topic}을(를) 준비하시는 분들을 위해 핵심 내용을 짚어드립니다.`, `${c.topic}과 관련해 꼭 알아두면 좋은 내용을 안내드립니다.`],
    news: (c) => [`${c.topic}에 대한 관심이 꾸준히 이어지고 있습니다.`, `최근 ${c.topic}을(를) 찾는 분들이 늘고 있어 관련 내용을 정리했습니다.`],
    review: (c) => [`직접 경험한 ${c.topic}, 솔직하게 후기 남겨볼게요.`, `${c.topic} 다녀온(써본) 후기를 있는 그대로 적어봅니다.`],
  };
  const BODY_SENTENCES = {
    friendly: (c) => [`특히 ${c.keyword} 부분은 미리 알아두면 훨씬 수월해요.`, `막상 닥치면 놓치기 쉬운 부분이라 꼼꼼히 짚어볼게요.`, `저도 처음엔 몰라서 시행착오를 좀 겪었어요.`, `사람마다 상황이 다르니 자신에게 맞는 방법을 골라보세요.`, `생각보다 간단한데 미리 알면 시간을 많이 아낄 수 있어요.`, `${c.keyword}는 순서대로 하나씩 짚어보면 훨씬 헷갈리지 않아요.`, `여러 번 찾아보고 정리한 내용이라 순서대로 따라오시면 돼요.`, `직접 겪어보니 이 부분에서 특히 시간을 많이 썼던 것 같아요.`, `조금 번거로워도 이 단계를 건너뛰지 않는 게 나중에 편해요.`],
    mz: (c) => [`특히 ${c.keyword}은(는) 꿀팁이라 꼭 알아두세요.`, `이거 모르면 진짜 손해예요.`, `막상 해보니까 별거 아니었는데 미리 알았으면 더 편했을 듯.`, `취향 차이는 있는데 저는 이 방법이 제일 편했어요.`, `시간 절약하려면 이 부분 꼭 체크하세요.`, `${c.keyword} 관련해서는 이 순서대로 하는 게 제일 깔끔했어요.`, `저만 몰랐나 싶을 정도로 다들 이렇게 하더라고요.`, `귀찮아도 이 부분만큼은 그냥 넘기지 마세요.`],
    expert: (c) => [`${c.keyword}은(는) 사전에 파악해 두는 것이 좋습니다.`, `상황에 따라 차이가 있을 수 있으니 참고하시기 바랍니다.`, `놓치기 쉬운 부분이므로 다시 한번 안내드립니다.`, `필요한 경우 관련 자료를 함께 확인해 보시길 권합니다.`, `${c.keyword}와 관련된 세부 조건은 사례마다 다를 수 있습니다.`, `순서대로 확인하면 불필요한 시행착오를 줄일 수 있습니다.`, `아래 내용을 기준으로 하나씩 점검해 보시기 바랍니다.`],
    news: (c) => [`${c.keyword}에 대한 문의가 늘고 있는 추세입니다.`, `관련 기관 및 전문가의 의견을 함께 참고할 필요가 있습니다.`, `상황은 계속 변할 수 있어 최신 정보를 확인하는 것이 중요합니다.`, `${c.keyword}를 둘러싼 상황은 지역과 시점에 따라 달라질 수 있습니다.`, `관련 발표나 공지가 있을 경우 내용이 달라질 수 있는 점 참고해 주세요.`],
    review: (c) => [`제가 느끼기엔 ${c.keyword} 부분이 가장 만족스러웠어요.`, `아쉬운 점도 솔직히 말씀드리면 이런 부분이었어요.`, `가격 대비로 보면 나쁘지 않았던 것 같아요.`, `재방문(재구매) 의사는 있는 편이에요.`, `${c.keyword}는 기대했던 것과 비슷하거나 조금 더 좋았어요.`, `사람마다 느끼는 정도는 다를 수 있다는 점은 감안해주세요.`],
  };
  const STEP_LEAD = ['먼저 ', '다음으로 ', '이어서 ', '그다음에는 ', '마지막으로 '];
  const SUB_ANGLES = [
    (k) => `${k}, 기본부터 짚어보면`,
    (k) => `${k} 실제로 확인하는 방법`,
    (k) => `${k}에서 자주 놓치는 부분`,
    (k) => `${k} 바로 적용하는 팁`,
    (k) => `${k}, 상황별로 다르게 준비하기`,
  ];
  const CHECK_ITEM_TEMPLATES = [
    (kw) => `${kw} 관련 기본 정보 다시 확인하기`,
    (kw) => `${kw}에서 자주 나오는 조건 살펴보기`,
    (kw) => `${kw} 놓치기 쉬운 부분 체크하기`,
    (kw) => `${kw} 최신 내용으로 업데이트되었는지 확인하기`,
    (kw) => `${kw}, 나에게 맞는 방식인지 비교해보기`,
    (kw) => `${kw} 관련 준비물·서류 미리 챙기기`,
  ];
  const EXAMPLE_LINES = {
    friendly: (c) => `예를 들어 ${c.keyword} 같은 경우에는 미리 확인해두면 막상 닥쳤을 때 당황할 일이 줄어들어요.`,
    mz: (c) => `${c.keyword} 이런 것도 미리 알아두면 훨씬 편함. 저처럼 급하게 찾아보지 마세요.`,
    expert: (c) => `가령 ${c.keyword}의 경우, 사전 확인을 거치면 불필요한 시행착오를 줄일 수 있습니다.`,
    news: (c) => `${c.keyword}와 관련해 참고할 수 있는 사례도 꾸준히 늘고 있는 추세입니다.`,
    review: (c) => `${c.keyword} 관련해서는 이 부분이 특히 기억에 남았어요. 다음에도 같은 선택을 할 것 같아요.`,
  };
  const OVERVIEW_LINE = {
    friendly: (c, n) => `이 글에서는 ${c.topic} 관련 내용을 ${n}가지 포인트로 나눠서 정리했어요. 필요한 부분만 골라서 봐도 괜찮아요.`,
    mz: (c, n) => `${c.topic} 관련해서 ${n}가지 포인트로 정리했음. 필요한 부분만 스크롤해서 봐도 됨.`,
    expert: (c, n) => `본문에서는 ${c.topic}과 관련된 핵심 내용을 ${n}개 항목으로 나누어 순서대로 안내합니다.`,
    news: (c, n) => `아래 내용은 ${c.topic}과 관련해 ${n}개 항목으로 정리했습니다.`,
    review: (c, n) => `${c.topic}에 대해 느낀 점을 ${n}가지 포인트로 나눠서 솔직하게 적어볼게요.`,
  };
  const CLOSERS = {
    friendly: (c) => [`${c.topic}, 오늘 내용 참고해서 편하게 준비하시길 바라요.`, `도움이 되셨다면 다음 글에서 더 자세한 내용으로 찾아올게요.`, `궁금한 점은 댓글로 남겨주시면 아는 선에서 답해드릴게요.`],
    mz: (c) => [`${c.topic} 준비하시는 분들 화이팅이에요.`, `더 궁금한 거 있으면 댓글 남겨주세요, 아는 만큼 답해드릴게요.`],
    expert: (c) => [`${c.topic}과 관련해 추가로 궁금한 사항이 있다면 문의해 주시기 바랍니다.`, `필요하신 분들께 이 글이 실질적인 도움이 되었으면 합니다.`],
    news: (c) => [`앞으로도 ${c.topic} 관련 소식을 지속적으로 전해드리겠습니다.`],
    review: (c) => [`솔직 후기가 도움이 되셨으면 좋겠어요.`, `다음에 또 다른 후기로 찾아올게요.`],
  };
  const WARM_CAUTION = [
    '증상은 개체마다 다르게 나타날 수 있으니, 평소와 다른 모습이 보이면 병원에서 정확히 확인해보시는 걸 권해드려요.',
    '집에서의 관리도 중요하지만, 진단은 반드시 진료를 통해 받으시는 게 안전해요.',
  ];

  const HEADING_WRAPPERS = [
    (k) => `${k}, 미리 알아두면 좋아요`,
    (k) => `${k}는 이렇게 준비하세요`,
    (k) => `${k}, 헷갈리기 쉬운 부분`,
    (k) => `${k} 이것만은 확인하세요`,
    (k) => `${k}에 대해 자주 나오는 이야기`,
    (k) => `${k}, 실제로는 이래요`,
  ];
  const GENERIC_ANGLES = [
    (t) => `${t}, 왜 지금 알아둬야 할까요`,
    (t) => `${t} 시작 전에 확인할 것들`,
    (t) => `${t}에서 많이들 헷갈려하는 부분`,
    (t) => `${t}, 이렇게 준비하면 편해요`,
    (t) => `${t} 관련 자주 나오는 질문`,
    (t) => `${t}, 처음이라면 이것부터`,
  ];

  const LENGTH_SECTIONS = { '짧게': 3, '보통': 4, '자세히': 5, '매우 자세히': 6 };
  const LENGTH_PARAS = { '짧게': 2, '보통': 3, '자세히': 3, '매우 자세히': 3 };
  // 플랫폼별 최소 분량 — 네이버는 C-Rank/D.I.A. 기준 공백 제외 1,500자, 티스토리는 E-E-A-T 기준 3,000자 이상을 기본 하한선으로 둡니다.
  const PLATFORM_MIN_CHARS = { naver: 1500, tistory: 3000, general: 1200 };

  function escAttr(s) { return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // 무료 이미지 API가 연결되기 전까지, 주제에 맞는 이미지를 자동 생성해 본문 사이에 넣습니다.
  // (Integrations.searchFreeImages와 같은 방식이며, 실제 API 연결 시 이 자리를 그 결과로 교체하면 됩니다.)
  function buildInlineImage(keyword, caption) {
    if (!global.Icons) return '';
    const svg = global.Icons.buildInlineImageSvg({ keyword, caption });
    const uri = global.Icons.toDataUri(svg);
    return `<figure class="post-image"><img src="${uri}" alt="${escAttr(caption || keyword)}"><figcaption>${escAttr(caption || keyword)} <span class="faint">· 자동 생성 이미지</span></figcaption></figure>`;
  }

  function buildParagraph(bucket, ctx, sentCount) {
    const pool = BODY_SENTENCES[bucket](ctx);
    const sents = pickN(pool, Math.min(sentCount, pool.length));
    let text = sents.join(' ');
    if (isWarm(ctx.tone) && Math.random() < 0.5) text += ' ' + pick(WARM_CAUTION);
    return `<p>${text}</p>`;
  }

  function sectionTopics(params) {
    const subs = SEO.splitKeywords(params.subKeywords);
    const need = LENGTH_SECTIONS[params.lengthPref] || 3;
    const topics = subs.slice(0, need);
    let gi = 0;
    while (topics.length < need) {
      topics.push(GENERIC_ANGLES[gi % GENERIC_ANGLES.length](params.topic || params.mainKeyword || '이 주제'));
      gi++;
    }
    return topics;
  }

  function checklistVerbPool(postType) {
    if (['여행 가이드', '여행 일정', '숙소 소개', '맛집 소개'].includes(postType)) return ['준비하기', '챙기기', '미리 확인하기'];
    if (['병원 질환 설명', '병원 치료 사례'].includes(postType)) return ['확인하기', '살펴보기', '체크하기'];
    if (['재테크 정보', '제품 비교'].includes(postType)) return ['비교해보기', '확인하기', '따져보기'];
    return ['확인하기', '체크하기', '살펴보기'];
  }
  function buildSectionChecklist(postType, sectionKw) {
    const n = 2 + (Math.random() < 0.5 ? 1 : 0);
    const items = pickN(CHECK_ITEM_TEMPLATES, n).map((fn) => fn(sectionKw));
    return `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  }
  // 네이버 D.I.A. 기준 — 직접 촬영한 사진과 스마트에디터 부가기능(장소/링크/동영상) 활용을 상기시킵니다.
  function buildMultimediaGuideBox() {
    return `<div class="box box-tip"><b>📷 사진·부가기능 체크</b><br>발행 전에 직접 촬영한 고화질 사진을 3장 이상 넣어주세요. 스마트에디터의 장소 첨부·링크·동영상 같은 부가 기능도 함께 활용하면 체류시간과 신뢰도를 높이는 데 도움이 돼요.</div>`;
  }
  // 티스토리/구글 E-E-A-T 기준 — 본문 안에 내부링크를 3~5개 넣도록 자리와 문구를 제안합니다.
  function buildInternalLinkBlock(params, count) {
    const kw = params.mainKeyword || params.topic || '이 주제';
    const cat = params.postType || '관련 주제';
    const pool = [
      `${kw}의 기초 개념을 먼저 다룬 글이 있다면 여기에 연결해보세요.`,
      `${cat} 카테고리의 다른 글도 함께 보시면 이해에 도움이 돼요. (내부링크 추가)`,
      `이 글과 이어지는 후속 글을 준비 중이라면 이 위치에 링크해두면 좋아요.`,
      `${kw}과(와) 비교해볼 만한 다른 글이 있다면 자연스럽게 연결해보세요.`,
      `관련 상품이나 서비스를 소개한 글이 있다면 이 근처에 링크를 추가해보세요.`,
    ];
    const picked = pickN(pool, Math.min(count, pool.length));
    return `<div class="box box-info"><b>🔗 내부링크 체크 (3~5개 권장)</b><ul>${picked.map((t) => `<li>${t}</li>`).join('')}</ul></div>`;
  }
  function buildComparisonTable(topics, ctx) {
    const rows = topics.slice(0, 5).map((t) => {
      const label = t.length <= 10 ? t : firstWord(t);
      return `<tr><td>${label}</td><td>${ctx.keyword}과 비교했을 때 꼭 살펴봐야 하는 부분이에요.</td><td>공식 정보나 최신 후기를 함께 확인해보세요.</td></tr>`;
    }).join('');
    return `<table><tr><th>항목</th><th>왜 확인해야 할까요</th><th>확인 방법</th></tr>${rows}</table>`;
  }

  function generateFullPost(params) {
    const bucket = toneBucket(params.tone);
    const topic = params.topic || params.mainKeyword || '오늘의 주제';
    const keyword = params.mainKeyword || topic;
    const ctx = { topic, keyword, tone: params.tone, reader: params.targetReader || '' };
    const opts = params.options || {};
    const lengthPref = params.lengthPref || '보통';
    const detailed = lengthPref === '자세히' || lengthPref === '매우 자세히';

    const topics = sectionTopics(params);
    const paraPerSection = LENGTH_PARAS[lengthPref] || 3;
    const headings = topics.map((raw) => (raw.length > 10 ? raw : pick(HEADING_WRAPPERS)(raw)));

    const useImages = opts.images !== false && global.Icons;
    const imageEvery = lengthPref === '매우 자세히' ? 2 : lengthPref === '자세히' ? 2 : 3;
    const platform = params.platform || 'general';
    // 네이버는 문단을 3~4줄로 짧게 유지(D.I.A. 가독성 기준), 티스토리/일반은 조금 더 길게 풀어써도 괜찮아요.
    const sentBase = platform === 'naver' ? 3 : 4;

    // 도입부: 후킹 문장 + 본문 미리보기(검색의도 충족) + 부연 설명 2문단 — 메인 키워드가 첫 200자 안에 들어가도록 구성합니다.
    let html = `<p>${pick(OPENERS[bucket](ctx))}</p>`;
    html += `<p>${(OVERVIEW_LINE[bucket] || OVERVIEW_LINE.friendly)(ctx, headings.length)}</p>`;
    html += buildParagraph(bucket, ctx, sentBase);
    if (detailed) html += buildParagraph(bucket, ctx, sentBase - 1);
    if (useImages) html += buildInlineImage(topic, topic);

    if (opts.toc && headings.length) {
      html += `<h3>목차</h3><ul>${headings.map((h) => `<li>${h}</li>`).join('')}</ul>`;
    }

    topics.forEach((raw, sIdx) => {
      const sectionKw = raw.length <= 10 ? raw : coreKeyword(keyword);
      html += `<h2>${headings[sIdx]}</h2>`;
      if (useImages && sIdx > 0 && sIdx % imageEvery === 0) html += buildInlineImage(sectionKw, headings[sIdx]);
      html += buildParagraph(bucket, { ...ctx, keyword: sectionKw }, sentBase);

      if (detailed) {
        // 자세히 / 매우 자세히: 소제목(H3)으로 한 번 더 나눠서 깊이 있게 다룹니다.
        const subCount = lengthPref === '매우 자세히' ? 3 : 2;
        pickN(SUB_ANGLES, subCount).forEach((subFn, subIdx) => {
          html += `<h3>${subFn(sectionKw)}</h3>`;
          const lead = subIdx === 0 && Math.random() < 0.5 ? pick(STEP_LEAD) : '';
          html += buildParagraph(bucket, { ...ctx, keyword: sectionKw }, sentBase).replace('<p>', `<p>${lead}`);
          if (lengthPref === '매우 자세히') html += `<p>${EXAMPLE_LINES[bucket](({ ...ctx, keyword: sectionKw }))}</p>`;
        });
      } else {
        for (let i = 1; i < paraPerSection; i++) {
          html += buildParagraph(bucket, { ...ctx, keyword: sectionKw }, sentBase - 1);
        }
        if (Math.random() < 0.4) html += `<p>${EXAMPLE_LINES[bucket](({ ...ctx, keyword: sectionKw }))}</p>`;
      }

      if (Math.random() < 0.65) html += buildSectionChecklist(params.postType, sectionKw);
      if (opts.relatedSearch && Math.random() < 0.6) {
        const subs = SEO.splitKeywords(params.subKeywords);
        if (subs.length) html += `<p>함께 찾아보면 좋은 키워드로는 ${subs.join(', ')} 등이 있어요.</p>`;
      }
    });

    // 비교 체크포인트 표 — 비교·재테크·숙소 소개류에 자연스럽게 추가
    if (['제품 비교', '재테크 정보', '숙소 소개'].includes(params.postType)) {
      html += `<h2>${keyword} 비교 체크포인트</h2>${buildComparisonTable(topics, ctx)}`;
    }

    // 플랫폼별 최소 분량 보장 — 부족하면 보충 섹션을 자연스럽게 이어붙입니다.
    const minChars = PLATFORM_MIN_CHARS[platform] || PLATFORM_MIN_CHARS.general;
    let lengthGuard = 0;
    while (global.SEO && SEO.plainText(html).length < minChars && lengthGuard < 8) {
      const extraKw = coreKeyword(keyword);
      html += `<h2>${pick(GENERIC_ANGLES)(extraKw)}</h2>`;
      html += buildParagraph(bucket, { ...ctx, keyword: extraKw }, sentBase);
      html += buildParagraph(bucket, { ...ctx, keyword: extraKw }, sentBase);
      html += buildParagraph(bucket, { ...ctx, keyword: extraKw }, sentBase - 1);
      if (Math.random() < 0.6) html += buildSectionChecklist(params.postType, extraKw);
      lengthGuard++;
    }

    // 플랫폼별 부가 체크리스트 — 네이버는 사진/부가기능, 티스토리는 내부링크를 안내합니다.
    if (platform === 'naver') {
      html += buildMultimediaGuideBox();
    } else if (platform === 'tistory') {
      html += buildInternalLinkBlock(params, 4);
    }

    // 핵심 요약 체크리스트
    const verbs = checklistVerbPool(params.postType);
    const summaryItems = topics.slice(0, 5).map((t, i) => `${t.length <= 10 ? t : firstWord(t)} ${verbs[i % verbs.length]}`);
    if (summaryItems.length) {
      html += `<h2>핵심만 다시 정리하면</h2><ul>${summaryItems.map((i) => `<li>${i}</li>`).join('')}</ul>`;
    }

    if (opts.faq) {
      const faqCount = lengthPref === '매우 자세히' ? 6 : lengthPref === '자세히' ? 5 : 3;
      const faqs = generateFAQ(params, faqCount);
      html += `<h2>자주 묻는 질문</h2>`;
      faqs.forEach((f) => { html += `<div class="box box-info"><b>Q. ${f.q}</b><br>${f.a}</div>`; });
    }

    if (opts.cta) html += `<div class="box box-tip">${generateCTA(params.blog, params)}</div>`;
    html += `<p>${pick(CLOSERS[bucket](ctx))}</p>`;

    const titles = generateTitles(params, 10);
    const title = opts.seoTitle !== false ? (titles.seo[0] || `${topic} 정리`) : topic;
    const tags = generateHashtags(params, 24);
    const metaDescription = opts.metaDesc !== false ? buildMeta(params, topic, keyword) : '';

    return {
      title,
      content: html,
      metaDescription,
      tags: tags.join(', '),
      thumbnailPhrases: opts.thumbnail ? generateThumbnailPhrases(params, 6) : [],
      faq: opts.faq ? generateFAQ(params, 4) : [],
      cardNews: opts.cardnews ? generateCardNews({ title, content: html }, 9) : [],
      titles,
    };
  }

  function buildMeta(params, topic, keyword) {
    const bucket = toneBucket(params.tone);
    const templates = {
      friendly: `${topic}, 헷갈릴 수 있는 부분까지 ${keyword} 중심으로 정리했어요. 준비하시는 분들께 도움이 되길 바라요.`,
      mz: `${topic} 관련 꿀팁 모음! ${keyword} 궁금하다면 이 글 하나로 정리 끝.`,
      expert: `${topic}에 대한 핵심 정보를 ${keyword} 중심으로 안내합니다. 준비 전 확인하시기 바랍니다.`,
      news: `${topic} 관련 최신 정보를 ${keyword} 중심으로 정리했습니다.`,
      review: `${topic}, 직접 경험한 내용을 ${keyword} 중심으로 솔직하게 남겼어요.`,
    };
    return (templates[bucket] || templates.friendly).slice(0, 120);
  }

  function continueWriting(existingHtml, params) {
    const bucket = toneBucket(params.tone);
    const topic = params.topic || params.mainKeyword || '이 글';
    const ctx = { topic, keyword: params.mainKeyword || topic, tone: params.tone };
    const angle = GENERIC_ANGLES[Math.floor(Math.random() * GENERIC_ANGLES.length)](topic);
    let html = `<h2>${angle}</h2>`;
    html += buildParagraph(bucket, ctx, 3);
    return html;
  }

  // ---------------- 선택 영역 변형 ----------------
  const MZ_SWAP = [[/매우\s?/g, '완전 '], [/정말\s?/g, '진짜 '], [/좋습니다/g, '좋아요'], [/합니다/g, '해요']];
  const EXPERT_SWAP = [[/해요\.?/g, '합니다.'], [/이에요\.?/g, '입니다.'], [/거예요/g, '것입니다'], [/!+/g, '.']];
  const FRIENDLY_SWAP = [[/합니다/g, '해요'], [/입니다/g, '이에요'], [/하였다/g, '했어요']];

  function applySwaps(text, swaps) {
    let t = text;
    swaps.forEach(([re, to]) => { t = t.replace(re, to); });
    return t;
  }

  function rewriteSelection(text, mode, params) {
    const plain = stripSpace(text);
    if (!plain) return plain;
    switch (mode) {
      case 'natural':
        return applySwaps(plain, EXPERT_SWAP.map(([re]) => [re, '']).length ? FRIENDLY_SWAP : FRIENDLY_SWAP)
          .replace(/\s{2,}/g, ' ');
      case 'mz':
        return '솔직히 말하면, ' + applySwaps(plain, MZ_SWAP);
      case 'expert':
        return applySwaps(plain, EXPERT_SWAP);
      case 'simple':
        return plain.split(/,\s*/).map((s) => s.trim()).filter(Boolean).join('. ') + (plain.endsWith('.') ? '' : '.');
      case 'elaborate': {
        const bucket = toneBucket(params && params.tone);
        const extra = pick(BODY_SENTENCES[bucket]({ keyword: (params && params.mainKeyword) || '이 부분' }));
        return plain + ' ' + extra;
      }
      case 'shorten': {
        const sents = plain.split(/(?<=[.!?요다])\s+/).filter(Boolean);
        return sents.slice(0, Math.max(1, Math.ceil(sents.length / 2))).join(' ');
      }
      case 'seo': {
        const kw = (params && params.mainKeyword) || '';
        if (kw && !plain.includes(kw)) return `${kw} 관련해서, ${plain}`;
        return plain;
      }
      case 'fixSpelling':
        return plain.replace(/\s{2,}/g, ' ').replace(/([.,!?])(?=\S)/g, '$1 ').replace(/\s+([.,!?])/g, '$1');
      default:
        return plain;
    }
  }

  // ---------------- 제목 생성기 ----------------
  function generateTitles(params, total) {
    const topic = params.topic || params.mainKeyword || '이 주제';
    const kw = params.mainKeyword || topic;
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const seo = [
      `${kw} 완벽 정리 (준비물·팁까지)`,
      `${kw}, 처음이라면 꼭 봐야 할 총정리`,
      `${month}월 ${kw} 가이드 | 핵심만 모았어요`,
    ];
    const click = [
      `${kw}, 이거 모르면 반드시 후회합니다`,
      `${kw} 하기 전에 이 글부터 보세요`,
      `아무도 안 알려주는 ${kw} 꿀팁`,
    ];
    const natural = [
      `${kw}에 대해 정리해봤어요`,
      `${topic} 준비하면서 남긴 기록`,
      `${kw}, 제가 겪어본 이야기`,
    ];
    const mz = [
      `${kw} 진짜 리얼 후기 (스압주의)`,
      `${kw} 이거 하나면 끝, 완전 꿀팁`,
      `${kw} 모르면 손해각`,
    ];
    const question = [
      `${kw}, 도대체 뭐부터 시작해야 할까요?`,
      `${kw} 언제가 제일 좋을까요?`,
      `${kw}, 이렇게 해도 괜찮을까요?`,
    ];
    const categories = { seo, click, natural, mz, question };
    const flat = [...seo, ...click, ...natural, ...mz, ...question];
    while (flat.length < total) flat.push(`${kw} 관련 정리 ${flat.length + 1}`);
    return categories;
  }

  // ---------------- 소제목 생성 ----------------
  function generateSubheadings(params, count) {
    const topics = sectionTopics(params);
    return topics.slice(0, count).map((t) => (t.length <= 10 ? pick(HEADING_WRAPPERS)(t) : t));
  }

  // ---------------- FAQ ----------------
  function generateFAQ(params, count) {
    const kw = params.mainKeyword || params.topic || '이 주제';
    const pool = [
      { q: `${kw}, 처음이라면 뭐부터 준비해야 하나요?`, a: `가장 먼저 기본 정보를 확인하고, 필요한 준비물이나 조건을 체크리스트로 정리해두면 수월해요. 순서대로 하나씩 확인하면 빠뜨리는 것 없이 준비할 수 있어요.` },
      { q: `${kw} 비용은 어느 정도로 생각하면 될까요?`, a: `상황과 조건에 따라 차이가 큰 편이라, 여유 있게 계획을 세워두시는 걸 추천해요. 시기나 옵션에 따라 달라질 수 있으니 최신 정보를 다시 확인해보세요.` },
      { q: `${kw}, 시기는 언제가 가장 좋을까요?`, a: `개인 상황에 따라 다르지만, 성수기를 피하면 여러모로 준비하기 편해요. 미리 일정을 잡아두면 선택의 폭도 넓어져요.` },
      { q: `${kw} 관련해서 흔히 하는 실수가 있을까요?`, a: `미리 확인 없이 진행했다가 다시 알아보는 경우가 많아요. 사전 체크가 제일 중요하고, 체크리스트를 활용하면 실수를 줄일 수 있어요.` },
      { q: `${kw}, 혼자 해도 괜찮을까요?`, a: `기본 정보만 잘 확인하면 충분히 혼자서도 가능해요. 다만 처음이라면 경험자의 후기를 함께 참고하는 걸 추천해요.` },
      { q: `${kw}, 초보자도 어렵지 않을까요?`, a: `처음에는 낯설 수 있지만, 순서대로 따라 하면 생각보다 어렵지 않아요. 이 글에서 소개한 체크리스트를 활용해보세요.` },
      { q: `${kw} 관련 정보는 어디서 다시 확인할 수 있나요?`, a: `공식 홈페이지나 관련 공지사항을 통해 최신 정보를 다시 확인하는 걸 추천해요. 시기에 따라 조건이 바뀔 수 있어요.` },
    ];
    return pickN(pool, Math.min(count, pool.length));
  }

  // ---------------- CTA ----------------
  function generateCTA(blog, params) {
    if (blog && blog.cta) return blog.cta;
    const purpose = (params && params.purpose) || [];
    if (purpose.includes('예약 문의') && blog && blog.phone) {
      return `방문 전 예약 및 문의는 ${blog.phone}로 편하게 연락 주세요.`;
    }
    if (purpose.includes('구매 전환')) return '더 자세한 정보는 홈페이지에서 확인하실 수 있어요.';
    if (purpose.includes('SNS 공유')) return '도움이 되셨다면 주변에도 공유해주세요!';
    return '더 많은 정보가 궁금하다면 이웃추가하고 소식 받아보세요.';
  }

  // ---------------- 해시태그 ----------------
  function generateHashtags(params, count) {
    const kw = firstWord(params.mainKeyword || params.topic || '');
    const subs = SEO.splitKeywords(params.subKeywords).map((s) => s.replace(/\s+/g, ''));
    const blogTags = params.blog && params.blog.hashtags ? params.blog.hashtags.split(/[,\n]/).map((s) => s.trim().replace(/^#/, '')).filter(Boolean) : [];
    const suffixes = ['추천', '코스', '팁', '정보', '준비물', '후기', '일정', '가이드', '총정리', '꿀팁'];
    const set = new Set();
    if (kw) {
      set.add(kw.replace(/\s+/g, ''));
      suffixes.forEach((s) => set.add(kw.replace(/\s+/g, '') + s));
    }
    subs.forEach((s) => s && set.add(s));
    blogTags.forEach((t) => t && set.add(t));
    if (params.topic) set.add(firstWord(params.topic).replace(/\s+/g, ''));
    let arr = Array.from(set).filter(Boolean).map((t) => '#' + t);
    if (arr.length < count) {
      const extra = ['#정보공유', '#꿀팁모음', '#일상기록', '#블로그', '#오늘의기록'];
      extra.forEach((e) => arr.length < count && !arr.includes(e) && arr.push(e));
    }
    return arr.slice(0, count);
  }

  // ---------------- 썸네일 문구 ----------------
  function generateThumbnailPhrases(params, count) {
    const kw = params.mainKeyword || params.topic || '';
    const month = new Date().getMonth() + 1;
    const pool = [
      `${kw}\n이것만 알고 가세요`,
      `${month}월 ${kw}\n어떻게 준비할까요`,
      `${kw}\n실패 없이 준비하는 법`,
      `${kw}\n놓치면 아쉬운 정보`,
      `${kw}\n딱 이것만 기억하세요`,
      `${kw}\n한 번에 정리 끝`,
      `${kw}\n초보자를 위한 안내`,
      `${kw}\n미리 보는 체크리스트`,
    ];
    return pickN(pool, Math.min(count, pool.length));
  }

  // ---------------- 카드뉴스 ----------------
  function firstSentence(text, maxLen) {
    const t = stripSpace(text || '');
    if (!t) return '';
    const m = t.match(/^[^.!?。]+[.!?。]?/);
    const s = (m ? m[0] : t).trim();
    return s.length > maxLen ? s.slice(0, maxLen).trim() + '…' : s;
  }

  function generateCardNews(post, targetCount) {
    const div = document.createElement('div');
    div.innerHTML = post.content || '';
    const h2Els = Array.from(div.querySelectorAll('h2'));
    const slides = [];
    const introP = div.querySelector('p');
    slides.push({ no: 1, heading: post.title || '표지', body: firstSentence(introP ? introP.textContent : '', 60) || '이것만 알고 가세요' });
    let n = 2;
    h2Els.forEach((h) => {
      if (slides.length >= targetCount - 1) return;
      let sib = h.nextElementSibling;
      while (sib && sib.tagName !== 'P') sib = sib.nextElementSibling;
      const body = firstSentence(sib ? sib.textContent : '', 60) || '핵심 내용을 한 줄로 요약해서 넣어보세요.';
      slides.push({ no: n++, heading: h.textContent.trim(), body });
    });
    while (slides.length < targetCount - 1) {
      slides.push({ no: n++, heading: `포인트 ${n - 1}`, body: '본문 내용을 참고해 채워보세요.' });
    }
    slides.push({ no: n, heading: '마무리', body: '도움이 되셨다면 저장하고 공유해주세요.' });
    return slides.slice(0, targetCount);
  }

  // ---------------- 콘텐츠 아이디어 ----------------
  const IDEA_ANGLES = [
    (kw) => ({ suffix: '이렇게 준비하면 실패 없어요', intent: `${kw} 준비 방법을 검색하는 사람`, direction: '준비 단계별 체크리스트 중심으로 구성' }),
    (kw) => ({ suffix: '자주 하는 실수 모음', intent: `${kw} 관련 실수를 피하고 싶은 사람`, direction: '실제 실수 사례와 해결법 나열' }),
    (kw) => ({ suffix: '비용은 얼마나 들까', intent: `${kw} 비용이 궁금한 사람`, direction: '항목별 예상 비용과 절약 팁 정리' }),
    (kw) => ({ suffix: '초보자를 위한 A to Z', intent: `${kw}을(를) 처음 접하는 사람`, direction: '기초 개념부터 순서대로 설명' }),
    (kw) => ({ suffix: '요즘 트렌드는?', intent: `${kw} 최신 정보를 찾는 사람`, direction: '최근 변화나 트렌드 위주로 소개' }),
  ];
  function generateIdeas(category, blog, count) {
    const base = (blog && blog.keywords ? SEO.splitKeywords(blog.keywords) : []).concat([category]);
    const out = [];
    for (let i = 0; i < count; i++) {
      const kw = base[i % base.length] || category;
      const angle = IDEA_ANGLES[i % IDEA_ANGLES.length](kw);
      out.push({
        id: Store.uid('idea'),
        blogId: blog ? blog.id : null,
        category,
        title: `${kw}, ${angle.suffix}`,
        mainKeyword: kw,
        subKeywords: SEO.splitKeywords(blog && blog.keywords).slice(0, 2).join(', '),
        intent: angle.intent,
        direction: angle.direction,
        uploadTiming: pick(['상시', '월초', '주말 업로드 추천', '시즌 시작 2주 전']),
      });
    }
    return out;
  }

  // 실제 API 연동 시: Store.getApiKey() 값이 있으면 false를 반환하도록 바꾸고,
  // 아래 generateFullPost 등 각 함수 내부에서 이 값을 참고해 실제 fetch 호출로 분기하면 됩니다.
  function isDemoMode() { return true; }

  global.AI = {
    generateFullPost, continueWriting, rewriteSelection,
    generateTitles, generateSubheadings, generateFAQ, generateCTA,
    generateHashtags, generateThumbnailPhrases, generateCardNews, generateIdeas,
    toneBucket, isDemoMode,
  };
})(window);
