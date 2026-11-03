# 티스토리 자동 발행 시스템

하루 2번(오전/오후) 글 1개씩을 `https://rirume.tistory.com` 에 올리는 구성입니다.
**글이 들어오는 경로는 세 가지이고, 모두 수신함(Supabase `inbox_posts`)에 `source`(출처)를 달고 들어옵니다.**

| 출처(source) | 설명 | 상태 |
|---|---|---|
| `chatgpt-email` | ChatGPT 예약 작업이 쓴 **원문 그대로**. Gmail → Apps Script → 수신함 | 파서는 시험 완료. **ChatGPT의 메일 발송과 Apps Script 실행은 직접 확인 필요** |
| `claude` | **Claude가 새로 쓴 글** (대체안). 이 PC의 Claude Code로 생성 | 실제 생성→수신함→티스토리 임시저장까지 시험 완료 |
| `paste` | 사이트에서 직접 붙여넣은 글 | 시험 완료 |

> ChatGPT 공유 링크(`chatgpt.com/share/...`)는 고정된 스냅샷이며 새 글의 피드가 아닙니다. 사용하지 않습니다.

```
ChatGPT 예약 작업 ──(Gmail 메일)──▶ Apps Script(구글 서버, 5분마다) ─┐
Claude Code(이 PC, 필요할 때) ───────────────────────────────────────┼─▶ Supabase 수신함 ─▶ publish.js --run (이 PC) ─▶ 티스토리
사이트에서 붙여넣기 ────────────────────────────────────────────────┘        (중복 검사·재시도·기록)
```

## 발행 방식 (승인 게이트)
기본은 **임시저장**입니다. 공개 발행은 임시저장 결과를 직접 확인하신 뒤에만 켭니다.
```
node publish.js --approve-public     # 이후 --run 이 공개 발행으로 올립니다
node publish.js --set-draft          # 언제든 임시저장으로 되돌리기
node publish.js --status             # 현재 방식, 수신함 상태, 최근 기록
```

## 예약 실행 (매일 09:20, 18:20)
ChatGPT 작업이 09:00/18:00에 글을 쓰고 메일이 Apps Script에 도착할 시간을 두기 위해 20분 뒤로 잡았습니다. 시각은 바꾸셔도 됩니다.
PowerShell(관리자 아님)에서 실행:
```powershell
$dir = "C:\Users\sunth\blog-content-studio\tools\tistory"
$a = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -Command `"& '$dir\run-scheduled.cmd'`"" -WorkingDirectory $dir
$t = @((New-ScheduledTaskTrigger -Daily -At "09:20"), (New-ScheduledTaskTrigger -Daily -At "18:20"))
$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
Register-ScheduledTask -TaskName "BlogStudio-Tistory-Publish" -Action $a -Trigger $t -Settings $s -Force
```
- 한 번 실행에 글 **1개**만 올립니다. 로그: `tools/tistory/logs/publish.log`(사람용), `publish.jsonl`(기계용, 성공 URL·실패 사유 포함).
- 수신함이 비어 있으면 아무것도 하지 않고 정상 종료합니다. Claude 대체 생성을 켜려면 `node publish.js --fallback on` (끄기: `--fallback off`).

## 중복·재시도
- **주제 중복:** 새 글 제목을 최근 글(블로그 RSS + 최근 90일 발행 이력)과 비교해, 유사도 0.55 이상이거나 같은 `topic`이면 `skipped_duplicate`로 건너뜁니다. (시험: 0.91로 걸러짐)
- **전달 중복:** 같은 메일/같은 슬롯은 `external_id`로 한 번만 들어옵니다.
- **재시도:** 실패하면 사유를 기록하고 `pending`으로 되돌려 다음 실행에서 다시 시도합니다(최대 3회, 이후 `failed`).
- **발행 도중 중단:** 공개 발행 중 오류가 나면 재시도 전에 RSS로 실제 발행 여부를 먼저 확인해 **이중 발행을 막습니다.**

## 1) ChatGPT 원문 경로 설치 (Gmail + Apps Script)
1. https://script.google.com 에서 새 프로젝트를 만들고 `tools/gmail/Code.gs` 내용을 붙여넣습니다.
2. 프로젝트 설정 → **스크립트 속성**에 3개를 추가합니다.
   - `SUPABASE_URL` = `https://lyhmuimkmiinscmbagad.supabase.co`
   - `SUPABASE_KEY` = `sync.js`에 있는 공개 키(`sb_publishable_...`)
   - `INGEST_TOKEN` = `C:\Users\sunth\.blog-studio\ingest-token.txt` 의 내용
3. 함수 `installTrigger`를 한 번 실행(권한 승인)합니다. 이후 5분마다 `processMails`가 돕니다. 
4. ChatGPT 예약 작업 지침 **맨 끝에 아래를 덧붙입니다.**
```
글 작성이 끝나면, 연결된 Gmail로 나에게 메일을 보내줘. (답변에는 "발송 완료"만 적어줘)
- 제목: [티스토리] 글 제목
- 본문은 아래 순서 그대로, 본문은 HTML로 작성하고 표는 <table>을 써줘:
태그: 쉼표로 구분한 태그 6~8개
검색설명: 80~150자 요약
주제: 이 글의 핵심 주제 한 줄

(빈 줄 뒤에 본문 HTML — h2/h3/p/ul/ol/table 만 사용, 맨 앞에 제목을 반복하지 말 것)
```
5. **시험:** 작업을 한 번 수동 실행해 메일이 보낸편지함에 생기는지, 5~10분 뒤 `node publish.js --status` 에 `pending / chatgpt-email` 이 보이는지 확인하세요.
   - 개발자 커뮤니티에 "예약 작업에서 Gmail 발송이 안전 검사에 막혔다"는 보고가 있습니다(공식 확인 아님). 막히면 이 경로는 쓸 수 없으니 `--fallback on`(Claude 대체 생성)을 쓰세요.
- 보안: Apps Script는 **보낸편지함(`in:sent`)의 메일만** 처리하므로 외부에서 온 위조 메일은 무시됩니다.

## 2) Claude 대체 생성
- `tools/generate/brief.md` 에 ChatGPT 작업 지침 전문을 붙여넣으면 그 내용이 우선 적용됩니다. (지금은 앱에 있던 '여행유발자 이루미' 프로필만 들어 있습니다.)
- `node generate.js --dry` 로 수신함에 넣지 않고 결과만 볼 수 있습니다. 한 편에 약 1~3분, Claude 구독 사용량이 소모됩니다(별도 API 키 없음).
- 자동 생성 글은 **사실 오류 위험**이 있어 가격·영업시간 같은 바뀌는 수치를 단정하지 않도록 지침에 넣었습니다. 공개 발행 전 몇 편은 직접 검토하세요.

## PC가 꺼져 있을 때
- **글 받기(Apps Script→Supabase)는 PC와 무관**하게 구글/서버에서 돌아서 수신함에 쌓입니다.
- **티스토리에 올리기는 PC가 필요합니다.** 티스토리는 공식 글쓰기 API가 종료되어, 로그인된 브라우저를 자동 조작해야 하기 때문입니다.
- PC가 꺼져 있다 켜지면(`StartWhenAvailable`) 놓친 실행이 한 번 돌고 쌓인 글은 실행마다 1개씩 소진됩니다.
- PC 없이 하려면 24시간 켜진 **별도 머신(상시 PC, 클라우드 VM 등)** 에서 같은 스크립트를 돌려야 하고, 그 머신에서 카카오 로그인을 한 번 직접 해야 합니다. 로그인 쿠키가 서버에 저장되는 보안 부담과, 데이터센터 IP에서의 추가 인증 가능성이 있습니다. (검증하지 않았습니다.)

## 비밀 정보 (git에 올라가지 않음)
- `tools/tistory/.cookies.json`, `.session.json`, `.profile/`, `config.json`, `logs/`
- 전송 토큰: `C:\Users\sunth\.blog-studio\ingest-token.txt` (서버에는 해시만 있음). 이 토큰으로 수신함에 글을 넣을 수 있으니 공유하지 마세요.
- 토큰 재발급: 새 토큰을 만들고 `supabase-pipeline.sql`의 해시 자리에 SHA-256을 넣어 SQL을 다시 실행한 뒤 Apps Script 속성도 바꿉니다.
