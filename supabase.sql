-- Profiles table (extends users)
create table profiles (
  id text primary key, -- Clerk User ID
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  theme_settings jsonb default '{
    "background": "bg-slate-50",
    "buttonStyle": "rounded-lg",
    "fontFamily": "font-sans",
    "accentColor": "#000000"
  }'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Links table
create table links (
  id uuid default gen_random_uuid() primary key,
  user_id text references profiles(id) on delete cascade not null,
  title text not null,
  url text not null,
  icon text,
  position int not null default 0,
  click_count int not null default 0,
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;
alter table links enable row level security;

-- Policies for profiles
create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can update their own profile" on profiles
  for update using (auth.uid()::text = id); -- Note: This might need adjustment based on how Clerk JWT is handled

-- Policies for links
create policy "Links are viewable by everyone" on links
  for select using (true);

create policy "Users can insert their own links" on links
  for insert with check (auth.uid()::text = user_id);

create policy "Users can update their own links" on links
  for update using (auth.uid()::text = user_id);

create policy "Users can delete their own links" on links
  for delete using (auth.uid()::text = user_id);

-- Function to increment click count
create or replace function increment_click_count(link_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update links
  set click_count = click_count + 1
  where id = link_id;
end;
$$;
