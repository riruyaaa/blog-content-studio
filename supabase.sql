-- Supabase SQL Editor에서 한 번 실행하세요.
-- 로그인한 사용자 본인의 행만 읽고 쓸 수 있도록 RLS로 제한합니다.

create table if not exists public.app_state (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

create policy "own row select" on public.app_state
  for select to authenticated using (user_id = auth.uid());

create policy "own row insert" on public.app_state
  for insert to authenticated with check (user_id = auth.uid());

create policy "own row update" on public.app_state
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
