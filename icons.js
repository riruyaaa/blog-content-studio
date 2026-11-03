/* =========================================================
   icons.js — 무료 이미지 대체용 SVG 비주얼 생성기
   외부 이미지 API 없이도 바로 쓸 수 있도록, 주제/키워드에 맞는
   플랫 스타일 SVG 이미지를 그 자리에서 만들어 data URI로 돌려줍니다.
   실제 img 태그로 렌더링되므로 우클릭 → 이미지 저장이 가능합니다.
   ========================================================= */

(function (global) {
  const PALETTE = [
    { bg: '#F4EFE3', accent: '#33456B' },
    { bg: '#FDECEA', accent: '#B8453C' },
    { bg: '#EAF3EC', accent: '#2E7D54' },
    { bg: '#FBF1DE', accent: '#9C6B08' },
    { bg: '#EDEFFB', accent: '#4A4E9E' },
    { bg: '#FFF1F5', accent: '#B23A6B' },
  ];

  const CATEGORY_RULES = [
    { test: /여행|공항|호텔|숙소|비행기|여권|관광|여행지|일정/, emoji: '✈️' },
    { test: /강아지|고양이|반려동물|동물병원|수의사|병원|질환|증상|건강검진/, emoji: '🐾' },
    { test: /적금|예금|투자|재테크|주식|절약|대출|금리|저축/, emoji: '💰' },
    { test: /맛집|음식|카페|레시피|요리|디저트/, emoji: '🍽️' },
    { test: /집|인테리어|부동산|이사|가전/, emoji: '🏠' },
    { test: /운동|건강|다이어트|헬스|스트레칭/, emoji: '💪' },
    { test: /날씨|계절|겨울|여름|봄|가을|기온/, emoji: '🌤️' },
    { test: /쇼핑|제품|비교|추천/, emoji: '🛍️' },
  ];
  const FALLBACK_EMOJI = ['📌', '📝', '✨', '📊', '🔍', '📷'];

  function hashStr(s) {
    let h = 0;
    const str = String(s || '');
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  }

  function pickVisual(seedText) {
    const text = String(seedText || '');
    let emoji = null;
    for (let i = 0; i < CATEGORY_RULES.length; i++) {
      if (CATEGORY_RULES[i].test.test(text)) { emoji = CATEGORY_RULES[i].emoji; break; }
    }
    if (!emoji) emoji = FALLBACK_EMOJI[hashStr(text) % FALLBACK_EMOJI.length];
    const palette = PALETTE[hashStr(text + '::palette') % PALETTE.length];
    return { emoji, bg: palette.bg, accent: palette.accent };
  }

  function wrapLines(text, maxChars) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    words.forEach((w) => {
      const candidate = (cur ? cur + ' ' : '') + w;
      if (candidate.length > maxChars && cur) { lines.push(cur); cur = w; }
      else cur = candidate;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 카드뉴스 세로형 슬라이드 이미지 (720x900) — 제목/본문 텍스트를 이미지 안에 함께 그립니다.
  function buildCardSvg(opt) {
    opt = opt || {};
    const v = pickVisual(opt.keyword || opt.heading || '');
    const accent = opt.blogColor || v.accent;
    const W = 720, H = 900;
    const headLines = wrapLines(opt.heading || '', 12).slice(0, 3);
    const bodyLines = wrapLines(opt.body || '', 19).slice(0, 5);
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
    svg += '<rect width="' + W + '" height="' + H + '" fill="' + v.bg + '"/>';
    svg += '<rect x="0" y="0" width="' + W + '" height="16" fill="' + accent + '"/>';
    svg += '<text x="48" y="108" font-size="56" font-family="sans-serif">' + v.emoji + '</text>';
    svg += '<text x="48" y="168" font-size="24" fill="' + accent + '" font-family="\'Noto Sans KR\',sans-serif" font-weight="700">SLIDE ' + (opt.no || 1) + (opt.total ? ' / ' + opt.total : '') + '</text>';
    let y = 250;
    headLines.forEach((line) => {
      svg += '<text x="48" y="' + y + '" font-size="44" font-weight="700" fill="#22201B" font-family="\'Noto Sans KR\',sans-serif">' + esc(line) + '</text>';
      y += 60;
    });
    y += 26;
    bodyLines.forEach((line) => {
      svg += '<text x="48" y="' + y + '" font-size="27" fill="#4A473F" font-family="\'Noto Sans KR\',sans-serif">' + esc(line) + '</text>';
      y += 40;
    });
    svg += '<rect x="0" y="' + (H - 10) + '" width="' + W + '" height="10" fill="' + accent + '"/>';
    svg += '</svg>';
    return svg;
  }

  // 본문 삽입용 가로형 이미지 (900x520)
  function buildInlineImageSvg(opt) {
    opt = opt || {};
    const v = pickVisual(opt.keyword || opt.caption || '');
    const W = 900, H = 520;
    const capLines = wrapLines(opt.caption || opt.keyword || '', 26).slice(0, 2);
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">';
    svg += '<rect width="' + W + '" height="' + H + '" fill="' + v.bg + '"/>';
    svg += '<circle cx="' + (W / 2) + '" cy="' + (H / 2 - 46) + '" r="96" fill="' + v.accent + '22"/>';
    svg += '<text x="' + (W / 2) + '" y="' + (H / 2 - 8) + '" font-size="86" font-family="sans-serif" text-anchor="middle">' + v.emoji + '</text>';
    let y = H - 72;
    capLines.forEach((line) => {
      svg += '<text x="' + (W / 2) + '" y="' + y + '" font-size="25" fill="' + v.accent + '" font-family="\'Noto Sans KR\',sans-serif" text-anchor="middle" font-weight="600">' + esc(line) + '</text>';
      y += 32;
    });
    svg += '</svg>';
    return svg;
  }

  function toDataUri(svg) {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  global.Icons = { pickVisual, wrapLines, buildCardSvg, buildInlineImageSvg, toDataUri };
})(window);
