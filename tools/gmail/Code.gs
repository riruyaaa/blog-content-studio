/* =========================================================
   Code.gs — [ChatGPT 원문 전달 경로] Gmail → 수신함(Supabase)
   ChatGPT 예약 작업이 연결된 Gmail로 보낸 글 메일을 읽어 수신함에 넣습니다.
   수신함에는 source = 'chatgpt-email' 로 기록됩니다. (Claude가 새로 쓴 글은 'claude')

   - Google Apps Script(무료, 구글 서버에서 실행)이므로 내 PC가 꺼져 있어도 받아 둡니다.
   - 보내는 메일은 "보낸편지함(in:sent)"에 있는 것만 처리합니다. 외부에서 온 위조 메일은 처리하지 않아요.
   - 같은 메일은 메일 ID(external_id)로 한 번만 들어갑니다.

   설치: tools/gmail/README.md 참고
   ========================================================= */

var SUBJECT_PREFIX = '[티스토리]';
var DONE_LABEL = 'tistory-sent';

// ---------- 메일 해석 (순수 함수: 로컬에서 시험 가능) ----------
function stripTags_(html) {
  return String(html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
}
function escapeHtml_(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inlineMd_(t) { return escapeHtml_(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }

// 마크다운/일반 텍스트 → HTML (제목, 목록, 표, 굵게, 문단)
function markdownToHtml(src) {
  var lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
  var out = [], para = [], list = null, i = 0;
  function flushPara() { if (para.length) { out.push('<p>' + para.map(inlineMd_).join('<br>') + '</p>'); para = []; } }
  function flushList() { if (list) { out.push('<' + list.tag + '>' + list.items.map(function (x) { return '<li>' + inlineMd_(x) + '</li>'; }).join('') + '</' + list.tag + '>'); list = null; } }
  function cells(line) { return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); }
  while (i < lines.length) {
    var line = lines[i].trim(), m;
    if (!line) { flushPara(); flushList(); i++; continue; }
    // 표: 헤더 줄 + 구분 줄(|---|---|)
    if (line.charAt(0) === '|' && i + 1 < lines.length && /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(lines[i + 1].trim())) {
      flushPara(); flushList();
      var head = cells(line), rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim().charAt(0) === '|') { rows.push(cells(lines[i])); i++; }
      out.push('<table><thead><tr>' + head.map(function (h) { return '<th>' + inlineMd_(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inlineMd_(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>');
      continue;
    }
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flushPara(); flushList(); var h = m[1].length >= 3 ? 3 : 2; out.push('<h' + h + '>' + inlineMd_(m[2]) + '</h' + h + '>'); i++; continue; }
    if (/^(-{3,}|\*{3,})$/.test(line)) { flushPara(); flushList(); i++; continue; }
    if ((m = line.match(/^[-*•]\s+(.*)$/))) { flushPara(); if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; } list.items.push(m[1]); i++; continue; }
    if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { flushPara(); if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; } list.items.push(m[1]); i++; continue; }
    flushList(); para.push(line); i++;
  }
  flushPara(); flushList();
  return out.join('\n');
}

// 메일 한 통 → 수신함 필드. 제목이 [티스토리]로 시작하지 않으면 null.
// 본문 맨 위에 "태그: / 검색설명: / 주제:" 줄을 두면 읽어 가고, 나머지가 글 본문입니다.
function parseMail(subject, htmlBody, plainBody) {
  var s = String(subject || '').trim();
  if (s.toLowerCase().indexOf(SUBJECT_PREFIX) !== 0) return null;
  var title = s.slice(SUBJECT_PREFIX.length).replace(/^[\s:：\-]+/, '').trim();
  if (!title) return null;

  var raw = String(htmlBody || '') || String(plainBody || '');
  var isHtml = /<(h[1-6]|p|ul|ol|table|div|br)[\s>\/]/i.test(raw);
  var meta = { tags: '', desc: '', topic: '' };
  var keyMap = { '태그': 'tags', '검색설명': 'desc', '메타설명': 'desc', '주제': 'topic' };

  var body;
  if (isHtml) {
    // 메타 줄이 들어 있는 블록(<p>, <div>, <li>)을 찾아 읽고 본문에서 제거
    // (a) 한 줄짜리 <p>/<li> 요소 (내부에 다른 태그가 없는 경우만)
    body = raw.replace(/<(p|li)[^>]*>\s*(태그|검색설명|메타설명|주제)\s*[:：]\s*([^<]*)<\/\1>/gi, function (_, t, k, v) { meta[keyMap[k]] = stripTags_(v).trim(); return ''; });
    // (b) <br>, 줄바꿈, 또는 여는 태그 바로 뒤에 이어진 "키: 값" 줄
    body = body.replace(/(^|>|<br\s*\/?>|\n)\s*(태그|검색설명|메타설명|주제)\s*[:：]\s*([^<\n]+)/gi, function (all, pre, k, v) { if (!meta[keyMap[k]]) meta[keyMap[k]] = v.trim(); return pre; });
    body = body.replace(/<\/?(html|head|body|script|style)[^>]*>/gi, '').replace(/<hr\s*\/?>/gi, '').trim();
  } else {
    var kept = [];
    String(raw).replace(/\r\n?/g, '\n').split('\n').forEach(function (ln) {
      var mm = ln.match(/^\s*(태그|검색설명|메타설명|주제)\s*[:：]\s*(.+)$/);
      if (mm) meta[keyMap[mm[1]]] = mm[2].trim(); else kept.push(ln);
    });
    body = markdownToHtml(kept.join('\n'));
  }
  meta.tags = meta.tags.replace(/#/g, '');
  if (!body || !stripTags_(body).trim()) return null;
  return { title: title, content: body, tags: meta.tags, meta: meta.desc, topic: meta.topic };
}

// ---------- 실행 ----------
function post_(fields) {
  var p = PropertiesService.getScriptProperties();
  var res = UrlFetchApp.fetch(p.getProperty('SUPABASE_URL') + '/rest/v1/rpc/ingest_post', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { apikey: p.getProperty('SUPABASE_KEY'), 'x-ingest-token': p.getProperty('INGEST_TOKEN') },
    payload: JSON.stringify(fields),
  });
  return { code: res.getResponseCode(), text: res.getContentText() };
}

function processMails() {
  var label = GmailApp.getUserLabelByName(DONE_LABEL) || GmailApp.createLabel(DONE_LABEL);
  var threads = GmailApp.search('in:sent subject:"' + SUBJECT_PREFIX + '" -label:' + DONE_LABEL + ' newer_than:7d', 0, 20);
  threads.forEach(function (th) {
    var allOk = true;
    th.getMessages().forEach(function (msg) {
      var parsed = parseMail(msg.getSubject(), msg.getBody(), msg.getPlainBody());
      if (!parsed) { Logger.log('건너뜀(형식 불일치): ' + msg.getSubject()); return; }
      var r = post_({ p_title: parsed.title, p_content: parsed.content, p_tags: parsed.tags, p_meta_description: parsed.meta,
        p_source: 'chatgpt-email', p_topic: parsed.topic, p_external_id: msg.getId() });
      if (r.code === 200) Logger.log('수신함 전송 OK: ' + parsed.title + ' ' + r.text);
      else { allOk = false; Logger.log('전송 실패(' + r.code + '): ' + r.text.slice(0, 200)); }
    });
    if (allOk) th.addLabel(label); // 실패한 메일은 라벨을 달지 않아 다음 실행에서 다시 시도 (external_id로 중복은 막힘)
  });
}

// 한 번만 실행: 5분마다 processMails 실행
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'processMails') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('processMails').timeBased().everyMinutes(5).create();
}
