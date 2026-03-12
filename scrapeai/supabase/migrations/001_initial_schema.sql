-- ============================================================
-- ScrapeAI — Complete Database Schema
-- Run: supabase db push  or paste into Supabase SQL editor
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Users (extends Supabase auth.users) ──────────────────────
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text unique not null,
  full_name     text,
  avatar_url    text,
  plan          text not null default 'free' check (plan in ('free','starter','pro','business')),
  credits_used  integer not null default 0,
  credits_limit integer not null default 100,
  stripe_customer_id    text unique,
  stripe_subscription_id text unique,
  subscription_status   text default 'inactive',
  subscription_end_date timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── Projects (Saved Searches) ────────────────────────────────
create table public.projects (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  title       text not null,
  query       text not null,
  status      text not null default 'pending' check (status in ('pending','running','completed','failed','cancelled')),
  task_type   text,                    -- 'google_maps' | 'web_scrape' | 'email_extraction' | 'marketplace'
  sources     jsonb default '[]',      -- identified source URLs / actors
  config      jsonb default '{}',      -- scraping config (location, filters, etc.)
  rows_count  integer default 0,
  error_msg   text,
  apify_run_id text,
  progress    integer default 0,       -- 0-100
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── Results ──────────────────────────────────────────────────
create table public.results (
  id          uuid default uuid_generate_v4() primary key,
  project_id  uuid references public.projects(id) on delete cascade not null,
  name        text,
  website     text,
  email       text,
  phone       text,
  address     text,
  city        text,
  country     text,
  category    text,
  rating      numeric(3,1),
  reviews     integer,
  price_range text,
  description text,
  linkedin    text,
  twitter     text,
  funding     text,
  founded     text,
  employees   text,
  extra       jsonb default '{}',      -- flexible field for extra scraped data
  source_url  text,
  created_at  timestamptz default now()
);

-- ── Usage Logs ───────────────────────────────────────────────
create table public.usage_logs (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  project_id  uuid references public.projects(id) on delete set null,
  rows_used   integer not null default 0,
  action      text not null,           -- 'scrape' | 'export' | 're-run'
  created_at  timestamptz default now()
);

-- ── Stripe Events (idempotency) ───────────────────────────────
create table public.stripe_events (
  id          text primary key,        -- Stripe event ID
  type        text not null,
  processed   boolean default false,
  created_at  timestamptz default now()
);

-- ══════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════
create index idx_projects_user_id     on public.projects(user_id);
create index idx_projects_status      on public.projects(status);
create index idx_results_project_id   on public.results(project_id);
create index idx_usage_logs_user_id   on public.usage_logs(user_id);
create index idx_profiles_stripe_cid  on public.profiles(stripe_customer_id);

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════
alter table public.profiles   enable row level security;
alter table public.projects   enable row level security;
alter table public.results    enable row level security;
alter table public.usage_logs enable row level security;

-- Profiles: users can only see/edit their own profile
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Projects: users own their projects
create policy "projects_select_own" on public.projects for select using (auth.uid() = user_id);
create policy "projects_insert_own" on public.projects for insert with check (auth.uid() = user_id);
create policy "projects_update_own" on public.projects for update using (auth.uid() = user_id);
create policy "projects_delete_own" on public.projects for delete using (auth.uid() = user_id);

-- Results: accessible through project ownership
create policy "results_select_own" on public.results for select
  using (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));
create policy "results_insert_own" on public.results for insert
  with check (exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid()));

-- Usage logs: read own
create policy "usage_select_own" on public.usage_logs for select using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════════════════════

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update updated_at timestamp
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

-- ══════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ══════════════════════════════════════════════════════════════

-- Get user credits remaining
create or replace function public.get_credits_remaining(user_uuid uuid)
returns integer language sql security definer as $$
  select credits_limit - credits_used from public.profiles where id = user_uuid;
$$;

-- Plan limits
create or replace function public.get_plan_limit(plan_name text)
returns integer language sql as $$
  select case plan_name
    when 'free'     then 100
    when 'starter'  then 1000
    when 'pro'      then 5000
    when 'business' then 20000
    else 100
  end;
$$;
