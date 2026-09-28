create table import_sources(id uuid primary key default gen_random_uuid(), name text not null unique, payload jsonb not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create trigger touch before update on import_sources for each row execute function touch_updated();
