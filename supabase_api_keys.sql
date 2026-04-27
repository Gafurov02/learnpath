-- API keys for schools
create table if not exists api_keys (
                                        id          uuid primary key default gen_random_uuid(),
    school_id   uuid references schools(id) on delete cascade not null,
    user_id     uuid references auth.users(id) on delete cascade not null,
    key_hash    text not null unique,
    key_preview text not null, -- last 4 chars: "...ab3f"
    name        text not null default 'Default key',
    active      boolean not null default true,
    last_used   timestamptz,
    requests    integer not null default 0,
    created_at  timestamptz default now()
    );

alter table api_keys enable row level security;

create policy "Owner manages api keys" on api_keys for all
  using (auth.uid() = user_id);

create index idx_api_keys_school on api_keys(school_id);
create index idx_api_keys_hash on api_keys(key_hash);