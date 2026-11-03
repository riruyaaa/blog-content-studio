/* =========================================================
   integrations.js — 외부 API 연동 확장 지점
   지금은 Claude 아티팩트(정적 호스팅) 위에서 동작하기 때문에,
   브라우저 보안 정책상 이 페이지에서 SerpAPI·Unsplash 같은 외부
   API를 직접 호출할 수 없습니다. (직접 서버를 구축해 이 페이지를
   호스팅하면 아래 fetch 호출이 그대로 동작합니다.)

   아래 함수들은 API 키가 있으면 실제 호출을 "시도"하고, 실패하면
   자동으로 데모 데이터로 전환되어 화면은 항상 정상적으로 동작
   합니다. 나중에 자체 백엔드 프록시를 연결할 때는 fetch 주소만
   그 프록시 엔드포인트로 바꿔주면 됩니다.
   ========================================================= */

(function (global) {
  async function searchCompetitors(query, apiKey) {
    const q = (query || '').trim() || '블로그 주제';
    if (apiKey) {
      try {
        // TODO: 실제 배포 시 자체 백엔드 프록시로 교체하세요.
        // 예) const res = await fetch(`/api/serp?q=${encodeURIComponent(q)}`);
        const res = await fetch('https://serpapi.com/search.json?engine=naver&query=' + encodeURIComponent(q) + '&api_key=' + encodeURIComponent(apiKey));
        if (res.ok) {
          const data = await res.json();
          return { source: 'live', results: normalizeSerpResults(data, q) };
        }
      } catch (e) {
        console.warn('실시간 검색 API 호출 실패 — 데모 인사이트로 대체합니다.', e);
      }
    }
    return { source: 'demo', results: demoCompetitorInsights(q) };
  }

  function normalizeSerpResults(data, q) {
    const organic = (data && data.organic_results) || [];
    if (!organic.length) return demoCompetitorInsights(q);
    return organic.slice(0, 5).map((r, i) => ({
      rank: i + 1,
      title: r.title || q,
      url: r.link || '',
      points: ['실시간 검색 결과 — 구조는 직접 확인해보세요'],
    }));
  }

  function demoCompetitorInsights(q) {
    return [
      { rank: 1, title: q + ' 완전정리 (최신)', points: ['본문 3,000자 이상으로 자세히 구성', 'H2 소제목 5개 이상 + FAQ 4개', '표·체크리스트로 정리해 가독성 확보'] },
      { rank: 2, title: q + ' 추천 TOP5 비교', points: ['비교표 중심 구성', '실제 후기·경험담 포함'] },
      { rank: 3, title: q + ' 이렇게 준비하세요', points: ['단계별 번호 리스트로 설명', '관련 이미지 4~5장 이상 삽입'] },
    ];
  }

  async function searchFreeImages(query, apiKey, count) {
    const q = (query || '').trim() || '블로그';
    const n = count || 4;
    if (apiKey) {
      try {
        // TODO: 실제 배포 시 자체 백엔드 프록시로 Unsplash/Pixabay 등을 호출하세요.
        const res = await fetch('https://api.unsplash.com/search/photos?query=' + encodeURIComponent(q) + '&per_page=' + n + '&client_id=' + encodeURIComponent(apiKey));
        if (res.ok) {
          const data = await res.json();
          const results = (data.results || []).map((r) => ({
            url: r.urls && (r.urls.regular || r.urls.small),
            alt: r.alt_description || q,
            source: 'unsplash',
            credit: r.user ? ('Unsplash · ' + r.user.name) : 'Unsplash',
          })).filter((r) => r.url);
          if (results.length) return { source: 'live', images: results };
        }
      } catch (e) {
        console.warn('실시간 이미지 검색 실패 — 자동 생성 이미지로 대체합니다.', e);
      }
    }
    const images = [];
    for (let i = 0; i < n; i++) {
      const svg = global.Icons.buildInlineImageSvg({ keyword: q, caption: q });
      images.push({ url: global.Icons.toDataUri(svg), alt: q, source: 'generated', credit: '자동 생성 이미지' });
    }
    return { source: 'demo', images };
  }

  global.Integrations = { searchCompetitors, searchFreeImages };
})(window);
