create table if not exists ebay_traffic_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  item_id text not null,
  snapshot_date date not null,
  title text not null,
  genre text not null default 'その他',
  sales integer not null default 0,
  total_impressions integer not null default 0,
  views integer not null default 0,
  click_rate numeric not null default 0,
  conversion_rate numeric not null default 0,
  acquired_at timestamptz,
  source_spreadsheet_id text,
  source_sheet_name text not null default '出品トラフィック',
  created_at timestamptz not null default now(),
  unique(item_id, snapshot_date)
);

create index if not exists ebay_traffic_daily_snapshots_item_date_idx
on ebay_traffic_daily_snapshots(item_id, snapshot_date desc);

create index if not exists ebay_traffic_daily_snapshots_date_idx
on ebay_traffic_daily_snapshots(snapshot_date desc);

alter table ebay_traffic_daily_snapshots enable row level security;

drop policy if exists ebay_traffic_daily_snapshots_team_read on ebay_traffic_daily_snapshots;
create policy ebay_traffic_daily_snapshots_team_read on ebay_traffic_daily_snapshots
for select to authenticated
using (app.is_team_member());

drop policy if exists ebay_traffic_daily_snapshots_team_write on ebay_traffic_daily_snapshots;
create policy ebay_traffic_daily_snapshots_team_write on ebay_traffic_daily_snapshots
for all to authenticated
using (app.is_team_member())
with check (app.is_team_member());
