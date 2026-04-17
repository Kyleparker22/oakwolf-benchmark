-- ============================================================
-- Oakwolf Epic Security Benchmark Tool
-- Database Migration V1
-- Run this in Supabase > SQL Editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- ASSESSMENTS
-- ────────────────────────────────────────────────────────────
create table assessments (
  id                  bigserial primary key,
  assessment_uuid     uuid default gen_random_uuid() not null unique,
  user_type           text not null check (user_type in ('internal', 'external')),
  report_type         text not null check (report_type in ('internal', 'external')),
  client_name         text,
  assessment_date     date default current_date,
  input_method        text default 'manual' check (input_method in ('manual', 'upload', 'hybrid')),
  status              text default 'in_progress' check (status in ('in_progress', 'completed')),
  overall_score_10    numeric(4,2),
  overall_score_100   numeric(5,2),
  maturity_level      text,
  created_by_user_id  uuid references auth.users(id) on delete set null,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ORGANIZATION CONTEXT
-- ────────────────────────────────────────────────────────────
create table organization_context (
  id                  bigserial primary key,
  assessment_id       bigint not null references assessments(id) on delete cascade,
  org_type            text,
  hospital_count      text,
  user_count          text,
  sites               text,
  community_connect   text,
  mna_activity        text,
  epic_instances      text,
  security_model      text,
  iam_alignment       text,
  team_size           text,
  iam_platform        text,
  epic_tenure         text,
  lifecycle_stage     text,
  strategic_focus     text,
  security_priority   text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ASSESSMENT RESPONSES
-- ────────────────────────────────────────────────────────────
create table assessment_responses (
  id                  bigserial primary key,
  assessment_id       bigint not null references assessments(id) on delete cascade,
  question_id         text not null,
  domain              text not null,
  selected_answer     text not null,
  base_points         integer not null,
  risk_flag           boolean default false,
  source              text default 'manual' check (source in ('manual', 'upload')),
  source_file_id      bigint,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  unique(assessment_id, question_id)
);

-- ────────────────────────────────────────────────────────────
-- UPLOADED FILES
-- ────────────────────────────────────────────────────────────
create table uploaded_files (
  id                  bigserial primary key,
  assessment_id       bigint not null references assessments(id) on delete cascade,
  storage_path        text not null,
  original_filename   text not null,
  detected_report_type text,
  parse_status        text default 'pending' check (parse_status in ('pending', 'success', 'partial', 'failed', 'unrecognized')),
  uploaded_at         timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- DOMAIN SCORES
-- ────────────────────────────────────────────────────────────
create table domain_scores (
  id                  bigserial primary key,
  assessment_id       bigint not null references assessments(id) on delete cascade,
  domain_name         text not null,
  raw_points          integer not null,
  max_points          integer not null,
  normalized_score    numeric(4,2) not null,
  weight              numeric(4,2) not null,
  weighted_contribution numeric(6,4) not null,
  created_at          timestamptz default now(),
  unique(assessment_id, domain_name)
);

-- ────────────────────────────────────────────────────────────
-- FINDINGS
-- ────────────────────────────────────────────────────────────
create table findings (
  id                  bigserial primary key,
  assessment_id       bigint not null references assessments(id) on delete cascade,
  finding_type        text,
  title               text not null,
  explanation         text,
  business_impact     text,
  severity            text check (severity in ('high', 'medium', 'low')),
  source_rule         text,
  visibility_scope    text default 'both' check (visibility_scope in ('internal', 'external', 'both')),
  created_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- RECOMMENDATIONS
-- ────────────────────────────────────────────────────────────
create table recommendations (
  id                    bigserial primary key,
  assessment_id         bigint not null references assessments(id) on delete cascade,
  recommendation_text   text not null,
  priority              integer,
  recommendation_horizon text check (recommendation_horizon in ('quick_win', 'near_term', 'long_term')),
  visibility_scope      text default 'internal' check (visibility_scope in ('internal', 'external', 'both')),
  created_at            timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- LEADS
-- ────────────────────────────────────────────────────────────
create table leads (
  id                  bigserial primary key,
  assessment_id       bigint not null references assessments(id) on delete cascade,
  first_name          text not null,
  last_name           text not null,
  title               text not null,
  organization        text not null,
  email               text not null,
  phone               text,
  created_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- AI OUTPUTS
-- ────────────────────────────────────────────────────────────
create table ai_outputs (
  id                  bigserial primary key,
  assessment_id       bigint not null references assessments(id) on delete cascade,
  output_type         text not null check (output_type in (
                        'executive_summary',
                        'external_findings',
                        'internal_findings',
                        'recommendations',
                        'what_good_looks_like'
                      )),
  prompt_version      text default 'v1',
  output_text         text,
  created_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- INTERNAL USERS PROFILE TABLE
-- (extends Supabase auth.users)
-- ────────────────────────────────────────────────────────────
create table user_profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  role                text default 'internal' check (role in ('internal')),
  full_name           text,
  created_at          timestamptz default now()
);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table assessments           enable row level security;
alter table organization_context  enable row level security;
alter table assessment_responses  enable row level security;
alter table uploaded_files        enable row level security;
alter table domain_scores         enable row level security;
alter table findings              enable row level security;
alter table recommendations       enable row level security;
alter table leads                 enable row level security;
alter table ai_outputs            enable row level security;
alter table user_profiles         enable row level security;

-- Internal users can do everything
create policy "Internal users full access - assessments"
  on assessments for all
  using (auth.uid() is not null);

create policy "Internal users full access - org_context"
  on organization_context for all
  using (auth.uid() is not null);

create policy "Internal users full access - responses"
  on assessment_responses for all
  using (auth.uid() is not null);

create policy "Internal users full access - files"
  on uploaded_files for all
  using (auth.uid() is not null);

create policy "Internal users full access - domain_scores"
  on domain_scores for all
  using (auth.uid() is not null);

create policy "Internal users full access - findings"
  on findings for all
  using (auth.uid() is not null);

create policy "Internal users full access - recommendations"
  on recommendations for all
  using (auth.uid() is not null);

create policy "Internal users full access - leads"
  on leads for all
  using (auth.uid() is not null);

create policy "Internal users full access - ai_outputs"
  on ai_outputs for all
  using (auth.uid() is not null);

create policy "Internal users full access - profiles"
  on user_profiles for all
  using (auth.uid() = id);

-- Allow anonymous inserts for leads and external assessments
create policy "Allow anon lead insert"
  on leads for insert
  with check (true);

create policy "Allow anon assessment insert"
  on assessments for insert
  with check (true);

create policy "Allow anon context insert"
  on organization_context for insert
  with check (true);

create policy "Allow anon response insert"
  on assessment_responses for insert
  with check (true);

create policy "Allow anon read assessment by uuid"
  on assessments for select
  using (true);

create policy "Allow anon read domain scores"
  on domain_scores for select
  using (true);

create policy "Allow anon read findings"
  on findings for select
  using (true);

create policy "Allow anon read ai outputs"
  on ai_outputs for select
  using (true);

-- ────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ────────────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger assessments_updated_at
  before update on assessments
  for each row execute function update_updated_at();

create trigger org_context_updated_at
  before update on organization_context
  for each row execute function update_updated_at();

create trigger responses_updated_at
  before update on assessment_responses
  for each row execute function update_updated_at();
