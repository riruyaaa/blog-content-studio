/* =========================================================
   seo.js — SEO 분석 엔진
   에디터 HTML과 글 설정을 받아 실제로 점수/체크리스트/키워드
   통계를 계산합니다. (외부 API 없이 순수 JS 휴리스틱)
   ========================================================= */

(function (global) {
  const LENGTH_TARGET = {
    '짧게': 1200, '보통': 2000, '자세히': 3000, '매우 자세히': 4000,
  };
  // 플랫폼별 최소 분량 하한선 — 네이버 C-Rank/D.I.A.는 공백 제외 1,500자, 티스토리/구글 E-E-A-T는 3,000자 이상을 권장합니다.
  const PLATFORM_MIN_CHARS = { naver: 1500, tistory: 3000, general: 1200 };

  function parseDoc(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div;
  }

  function plainText(html) {
    return parseDoc(html).textContent.replace(/\s+/g, ' ').trim();
  }

  function countOcc(haystack, needle) {
    if (!needle) return 0;
    const h = haystack.toLowerCase();
    const n = needle.toLowerCase().trim();
    if (!n) return 0;
    let count = 0, idx = 0;
    while ((idx = h.indexOf(n, idx)) !== -1) { count++; idx += n.length; }
    return count;
  }

  function splitKeywords(str) {
    return (str || '').split(/[,、\n]/).map((s) => s.trim()).filter(Boolean);
  }

  function getParagraphs(html) {
    const div = parseDoc(html);
    return Array.from(div.querySelectorAll('p')).map((p) => p.textContent.trim()).filter(Boolean);
  }

  function getHeadings(html) {
    const div = parseDoc(html);
    return {
      h2: Array.from(div.querySelectorAll('h2')).map((h) => h.textContent.trim()),
      h3: Array.from(div.querySelectorAll('h3')).map((h) => h.textContent.trim()),
    };
  }

  function item(status, text) { return { status, text }; }

  function analyze(post) {
    const title = (post.title || '').trim();
    const html = post.content || '';
    const body = plainText(html);
    const mainKw = (post.mainKeyword || '').trim();
    const subKws = splitKeywords(post.subKeywords);
    const headings = getHeadings(html);
    const headingText = [...headings.h2, ...headings.h3].join(' ');
    const paragraphs = getParagraphs(html);
    const div = parseDoc(html);

    const groups = { title: [], body: [], structure: [], content: [], readability: [] };
    let scoreParts = [];

    // ---- 제목 ----
    if (!title) {
      groups.title.push(item('improve', '제목이 비어 있어요'));
      scoreParts.push(0);
    } else {
      const hasKw = mainKw && title.toLowerCase().includes(mainKw.toLowerCase());
      groups.title.push(item(hasKw || !mainKw ? 'good' : 'improve', hasKw ? '핵심 키워드 포함' : (mainKw ? '핵심 키워드가 제목에 없어요' : '핵심 키워드 미설정')));
      scoreParts.push(hasKw || !mainKw ? 12 : 3);

      const len = title.length;
      const lenOk = len >= 10 && len <= 40;
      groups.title.push(item(lenOk ? 'good' : 'warn', lenOk ? `제목 길이 적절 (${len}자)` : `제목 길이 ${len}자 — 15~30자를 권장해요`));
      scoreParts.push(lenOk ? 8 : 4);
    }

    // ---- 본문 ----
    if (!body) {
      groups.body.push(item('improve', '본문이 비어 있어요'));
      scoreParts.push(0, 0, 0);
    } else {
      const mainCount = countOcc(body, mainKw);
      const mainOk = mainKw && mainCount > 0;
      groups.body.push(item(mainOk ? 'good' : 'improve', mainKw ? (mainOk ? `핵심 키워드 "${mainKw}" 본문에 포함 (${mainCount}회)` : '핵심 키워드가 본문에 없어요') : '핵심 키워드 미설정'));
      scoreParts.push(mainOk ? 12 : 2);

      const subHit = subKws.filter((k) => countOcc(body, k) > 0);
      const subOk = subKws.length === 0 || subHit.length > 0;
      groups.body.push(item(subOk ? 'good' : 'warn', subKws.length ? `서브 키워드 ${subHit.length}/${subKws.length}개 포함` : '서브 키워드 미설정'));
      scoreParts.push(subOk ? 8 : 3);

      const words = body.split(/\s+/).filter(Boolean);
      const density = mainKw && words.length ? (mainCount * mainKw.split(/\s+/).length) / words.length * 100 : 0;
      if (mainKw) {
        if (density > 5) {
          groups.body.push(item('warn', `키워드 반복이 조금 많아요 (밀도 ${density.toFixed(1)}%)`));
          scoreParts.push(4);
        } else if (density < 0.4) {
          groups.body.push(item('warn', `키워드 밀도가 낮아요 (${density.toFixed(1)}%) — 자연스럽게 조금 더 넣어보세요`));
          scoreParts.push(5);
        } else {
          groups.body.push(item('good', `키워드 밀도 적절 (${density.toFixed(1)}%)`));
          scoreParts.push(9);
        }
      }
    }

    // ---- 구성 ----
    const hasH2 = headings.h2.length > 0;
    groups.structure.push(item(hasH2 ? 'good' : 'improve', hasH2 ? `H2 소제목 ${headings.h2.length}개 사용` : 'H2 소제목이 없어요'));
    scoreParts.push(hasH2 ? 10 : 2);

    if (paragraphs.length) {
      const longParas = paragraphs.filter((p) => p.length > 220).length;
      const paraOk = longParas === 0;
      groups.structure.push(item(paraOk ? 'good' : 'warn', paraOk ? '문단 길이 적절' : `너무 긴 문단이 ${longParas}개 있어요 — 모바일에서 읽기 어려울 수 있어요`));
      scoreParts.push(paraOk ? 6 : 3);
    } else {
      groups.structure.push(item('warn', '문단(본문 단락)이 아직 없어요'));
      scoreParts.push(2);
    }

    const hasList = !!div.querySelector('ul,ol');
    groups.structure.push(item(hasList ? 'good' : 'warn', hasList ? '목록(리스트) 사용' : '목록을 활용하면 가독성이 좋아져요'));
    scoreParts.push(hasList ? 5 : 2);

    // ---- 콘텐츠 ----
    const platformMin = PLATFORM_MIN_CHARS[post.platform] || PLATFORM_MIN_CHARS.general;
    const target = Math.max(LENGTH_TARGET[post.lengthPref] || 600, platformMin);
    const wordCount = body.length;
    const lenOk = wordCount >= target;
    const platformNote = post.platform === 'naver' ? ' · 네이버 C-Rank/D.I.A. 기준' : post.platform === 'tistory' ? ' · 티스토리 E-E-A-T 기준' : '';
    groups.content.push(item(lenOk ? 'good' : (wordCount >= target * 0.6 ? 'warn' : 'improve'), `본문 글자수 ${wordCount}자 (목표 ${target}자 이상${platformNote})`));
    scoreParts.push(lenOk ? 12 : (wordCount >= target * 0.6 ? 6 : 2));

    const hasFaq = /FAQ|자주\s*묻는/i.test(body) || !!div.querySelector('.box-info');
    if (post.options && post.options.faq) {
      groups.content.push(item(hasFaq ? 'good' : 'warn', hasFaq ? 'FAQ 포함됨' : 'FAQ 추가를 선택했지만 아직 본문에 없어요'));
      scoreParts.push(hasFaq ? 6 : 3);
    } else {
      groups.content.push(item(hasFaq ? 'good' : 'warn', hasFaq ? 'FAQ 포함됨' : 'FAQ 추가를 권장해요 (검색 체류시간에 도움)'));
      scoreParts.push(hasFaq ? 6 : 4);
    }

    // ---- 가독성 ----
    if (paragraphs.length) {
      const avgLen = paragraphs.reduce((s, p) => s + p.length, 0) / paragraphs.length;
      const avgOk = avgLen <= 180;
      groups.readability.push(item(avgOk ? 'good' : 'warn', avgOk ? `한 문단 평균 ${Math.round(avgLen)}자 — 적절해요` : `한 문단 평균 ${Math.round(avgLen)}자 — 조금 줄이면 좋아요`));
      scoreParts.push(avgOk ? 6 : 3);

      const mobileOk = post.platform !== 'naver' || avgLen <= 140;
      groups.readability.push(item(mobileOk ? 'good' : 'warn', mobileOk ? '모바일 가독성 좋음' : '네이버 모바일 기준으로 문단을 더 짧게 나눠보세요'));
      scoreParts.push(mobileOk ? 6 : 3);
    } else {
      groups.readability.push(item('improve', '분석할 문단이 없어요'));
      scoreParts.push(0);
    }

    const maxScore = 100;
    const rawTotal = scoreParts.reduce((a, b) => a + b, 0);
    const rawMax = 100; // 항목별 배점 합계가 대략 100이 되도록 설계됨
    let score = Math.round((rawTotal / rawMax) * maxScore);
    score = Math.max(0, Math.min(100, score));

    // ---- 키워드 표 ----
    const kwRows = [];
    if (mainKw) {
      kwRows.push(buildKwRow(mainKw, true, title, body, headingText));
    }
    subKws.forEach((k) => kwRows.push(buildKwRow(k, false, title, body, headingText)));

    return { score, groups, kwRows, wordCount, paragraphCount: paragraphs.length, h2Count: headings.h2.length };
  }

  function buildKwRow(kw, isMain, title, body, headingText) {
    const count = countOcc(body, kw);
    const inTitle = title.toLowerCase().includes(kw.toLowerCase());
    const inHeading = headingText.toLowerCase().includes(kw.toLowerCase());
    const words = body.split(/\s+/).filter(Boolean).length || 1;
    const density = (count * kw.split(/\s+/).length) / words * 100;
    return { keyword: kw, isMain, count, inTitle, inHeading, density, warn: density > 5 };
  }

  global.SEO = { analyze, plainText, countOcc, splitKeywords, getParagraphs, getHeadings, LENGTH_TARGET, PLATFORM_MIN_CHARS };
})(window);
