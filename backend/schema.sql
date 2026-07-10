-- NextAuth Schema for Supabase
-- Based on: https://authjs.dev/reference/adapter/supabase

-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text unique,
  password text, -- Added for Credentials provider
  email_verified timestamp with time zone,
  image text
);

-- Accounts table
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  provider text not null,
  provider_account_id text not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  user_id uuid references users(id) on delete cascade
);

-- Sessions table
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  expires timestamp with time zone not null,
  session_token text not null unique,
  user_id uuid references users(id) on delete cascade
);

-- Verification Tokens table
create table if not exists verification_tokens (
  identifier text,
  token text primary key,
  expires timestamp with time zone not null
);

-- Profiles table (custom for LinkBio)
create table if not exists profiles (
  id uuid references users(id) on delete cascade primary key,
  username text unique not null,
  bio text,
  avatar_url text,
  theme jsonb default '{
    "background": "bg-slate-50",
    "buttonStyle": "rounded-lg",
    "fontFamily": "font-sans"
  }'::jsonb,
  created_at timestamp with time zone default now()
);

-- Links table
create table if not exists links (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  url text not null,
  icon text,
  position integer default 0,
  click_count integer default 0,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table users enable row level security;
alter table profiles enable row level security;
alter table links enable row level security;

-- Simple policies
create policy "Public profiles viewable" on profiles for select using (true);
create policy "Public links viewable" on links for select using (true);
