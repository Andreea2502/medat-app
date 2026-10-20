-- Lern-Assistent: welche Fragen jemand als Blatt/PDF bekommen hat (damit sie erst später wiederkommen)
create table if not exists public.assistent_ausgabe (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  art text not null default 'pdf',
  ausgegeben_am timestamptz not null default now()
);
create index if not exists assistent_ausgabe_user_idx on public.assistent_ausgabe (user_id, ausgegeben_am desc);
alter table public.assistent_ausgabe enable row level security;
create policy "eigene Ausgaben lesen" on public.assistent_ausgabe for select using (auth.uid() = user_id);
create policy "eigene Ausgaben eintragen" on public.assistent_ausgabe for insert with check (auth.uid() = user_id);
create policy "eigene Ausgaben löschen" on public.assistent_ausgabe for delete using (auth.uid() = user_id);
