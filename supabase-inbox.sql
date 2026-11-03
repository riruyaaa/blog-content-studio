-- ChatGPT(커스텀 GPT Actions)가 보낸 글을 받는 수신함. SQL Editor에서 한 번 실행하세요.
-- __TOKEN_HASH__ 는 비밀 토큰의 SHA-256 해시로 바꿔서 실행합니다. (토큰 원문은 저장소에 두지 않습니다.)

create table if not exists public.inbox_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text not null,
  tags text not null default '',
  meta_description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.inbox_posts enable row level security;

create policy "own inbox select" on public.inbox_posts
  for select to authenticated using (user_id = auth.uid());

create policy "own inbox delete" on public.inbox_posts
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.ingest_post(
  p_secret text, p_title text, p_content text,
  p_tags text default '', p_meta_description text default ''
) returns json
language plpgsql security definer set search_path = public as $$
declare
  owner_id uuid;
  new_id uuid;
begin
  if encode(sha256(convert_to(coalesce(p_secret, ''), 'utf8')), 'hex') <> '__TOKEN_HASH__' then
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

  insert into public.inbox_posts (user_id, title, content, tags, meta_description)
  values (owner_id, left(p_title, 300), p_content, left(coalesce(p_tags, ''), 1000), left(coalesce(p_meta_description, ''), 500))
  returning id into new_id;

  return json_build_object('ok', true, 'id', new_id);
end;
$$;

revoke all on function public.ingest_post(text, text, text, text, text) from public;
grant execute on function public.ingest_post(text, text, text, text, text) to anon, authenticated;
