-- 수신함을 "자동 발행 대기열"로 확장합니다. supabase-inbox.sql 다음에 SQL Editor에서 한 번 실행하세요.
-- __TOKEN_HASH__ 는 실행할 때 전송 토큰의 SHA-256 해시로 바꿉니다. (토큰 원문은 저장소에 두지 않습니다.)

alter table public.inbox_posts
  add column if not exists source text not null default 'unknown',   -- chatgpt-email | claude | paste | test
  add column if not exists topic text not null default '',
  add column if not exists external_id text,                          -- 같은 메일/같은 슬롯이 두 번 들어오는 것을 막는 키
  add column if not exists status text not null default 'pending',   -- pending | publishing | drafted | published | skipped_duplicate | failed
  add column if not exists attempts int not null default 0,
  add column if not exists last_error text,
  add column if not exists published_url text,
  add column if not exists published_at timestamptz;

create unique index if not exists inbox_posts_source_external
  on public.inbox_posts (source, external_id) where external_id is not null;

drop policy if exists "own inbox update" on public.inbox_posts;
create policy "own inbox update" on public.inbox_posts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 이전 시그니처(4개 인자)는 없앱니다.
drop function if exists public.ingest_post(text, text, text, text);

create or replace function public.ingest_post(
  p_title text, p_content text,
  p_tags text default '', p_meta_description text default '',
  p_source text default 'unknown', p_topic text default '', p_external_id text default null
) returns json
language plpgsql security definer set search_path = public as $$
declare
  presented text;
  owner_id uuid;
  new_id uuid;
begin
  presented := coalesce((nullif(current_setting('request.headers', true), '')::json) ->> 'x-ingest-token', '');
  if encode(sha256(convert_to(presented, 'utf8')), 'hex') <> '__TOKEN_HASH__' then
    raise exception 'unauthorized' using errcode = '28000';
  end if;
  if coalesce(trim(p_title), '') = '' or coalesce(trim(p_content), '') = '' then
    raise exception 'title and content are required';
  end if;
  if length(p_content) > 300000 then
    raise exception 'content too large';
  end if;

  select id into owner_id from auth.users where email = 'studio@example.com';
  if owner_id is null then
    raise exception 'owner not found';
  end if;

  insert into public.inbox_posts (user_id, title, content, tags, meta_description, source, topic, external_id)
  values (owner_id, left(p_title, 300), p_content, left(coalesce(p_tags, ''), 1000), left(coalesce(p_meta_description, ''), 500),
          left(coalesce(nullif(trim(p_source), ''), 'unknown'), 40), left(coalesce(p_topic, ''), 200), nullif(trim(p_external_id), ''))
  on conflict (source, external_id) where external_id is not null do nothing
  returning id into new_id;

  if new_id is null then
    return json_build_object('ok', true, 'duplicate', true);
  end if;
  return json_build_object('ok', true, 'duplicate', false, 'id', new_id);
end;
$$;

revoke all on function public.ingest_post(text, text, text, text, text, text, text) from public;
grant execute on function public.ingest_post(text, text, text, text, text, text, text) to anon, authenticated;
