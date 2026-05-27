create extension if not exists pgcrypto;

create schema if not exists app;

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  role text not null default 'member',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function app.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from team_members
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and active = true
  );
$$;

create table if not exists ebay_traffic_items (
  id uuid primary key default gen_random_uuid(),
  item_id text not null unique,
  title text not null,
  genre text not null default 'その他',
  image_url text,
  item_url text,
  sales integer not null default 0,
  total_impressions integer not null default 0,
  organic_impressions integer not null default 0,
  search_impressions integer not null default 0,
  store_impressions integer not null default 0,
  views integer not null default 0,
  click_rate numeric not null default 0,
  conversion_rate numeric not null default 0,
  acquired_at timestamptz,
  source_spreadsheet_id text,
  source_sheet_name text not null default '出品トラフィック',
  note text,
  raw jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ebay_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default '未着手',
  stage text not null default 'リサーチ',
  task_date date,
  start_time time,
  end_time time,
  owner text,
  minutes integer not null default 60,
  priority text not null default '中',
  display text not null default '通常',
  pinned boolean not null default false,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ebay_schedule_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references ebay_tasks(id) on delete cascade,
  title text not null,
  schedule_date date not null,
  start_time time,
  end_time time,
  minutes integer not null default 60,
  status text not null default '未着手',
  stage text not null default 'リサーチ',
  owner text,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists change_logs (
  id uuid primary key default gen_random_uuid(),
  app_key text not null,
  action text not null,
  target_type text not null,
  target_id text,
  title text not null,
  detail text,
  actor_email text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists ebay_traffic_items_genre_idx on ebay_traffic_items(genre);
create index if not exists ebay_traffic_items_total_impressions_idx on ebay_traffic_items(total_impressions desc);
create index if not exists ebay_traffic_items_views_idx on ebay_traffic_items(views desc);
create index if not exists ebay_traffic_items_sales_idx on ebay_traffic_items(sales desc);
create index if not exists ebay_traffic_items_acquired_at_idx on ebay_traffic_items(acquired_at desc);
create index if not exists ebay_tasks_task_date_idx on ebay_tasks(task_date);
create index if not exists ebay_tasks_status_idx on ebay_tasks(status);
create index if not exists ebay_schedule_items_schedule_date_idx on ebay_schedule_items(schedule_date);
create index if not exists change_logs_app_key_created_at_idx on change_logs(app_key, created_at desc);

drop trigger if exists touch_ebay_traffic_items_updated_at on ebay_traffic_items;
create trigger touch_ebay_traffic_items_updated_at
before update on ebay_traffic_items
for each row execute function app.touch_updated_at();

drop trigger if exists touch_ebay_tasks_updated_at on ebay_tasks;
create trigger touch_ebay_tasks_updated_at
before update on ebay_tasks
for each row execute function app.touch_updated_at();

drop trigger if exists touch_ebay_schedule_items_updated_at on ebay_schedule_items;
create trigger touch_ebay_schedule_items_updated_at
before update on ebay_schedule_items
for each row execute function app.touch_updated_at();

alter table team_members enable row level security;
alter table ebay_traffic_items enable row level security;
alter table ebay_tasks enable row level security;
alter table ebay_schedule_items enable row level security;
alter table change_logs enable row level security;

drop policy if exists team_members_select_own_team on team_members;
create policy team_members_select_own_team on team_members
for select to authenticated
using (app.is_team_member());

drop policy if exists team_members_insert_self on team_members;
create policy team_members_insert_self on team_members
for insert to authenticated
with check (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists ebay_traffic_items_team_read on ebay_traffic_items;
create policy ebay_traffic_items_team_read on ebay_traffic_items
for select to authenticated
using (app.is_team_member());

drop policy if exists ebay_traffic_items_team_write on ebay_traffic_items;
create policy ebay_traffic_items_team_write on ebay_traffic_items
for all to authenticated
using (app.is_team_member())
with check (app.is_team_member());

drop policy if exists ebay_tasks_team_read on ebay_tasks;
create policy ebay_tasks_team_read on ebay_tasks
for select to authenticated
using (app.is_team_member());

drop policy if exists ebay_tasks_team_write on ebay_tasks;
create policy ebay_tasks_team_write on ebay_tasks
for all to authenticated
using (app.is_team_member())
with check (app.is_team_member());

drop policy if exists ebay_schedule_items_team_read on ebay_schedule_items;
create policy ebay_schedule_items_team_read on ebay_schedule_items
for select to authenticated
using (app.is_team_member());

drop policy if exists ebay_schedule_items_team_write on ebay_schedule_items;
create policy ebay_schedule_items_team_write on ebay_schedule_items
for all to authenticated
using (app.is_team_member())
with check (app.is_team_member());

drop policy if exists change_logs_team_read on change_logs;
create policy change_logs_team_read on change_logs
for select to authenticated
using (app.is_team_member());

drop policy if exists change_logs_team_insert on change_logs;
create policy change_logs_team_insert on change_logs
for insert to authenticated
with check (app.is_team_member());
